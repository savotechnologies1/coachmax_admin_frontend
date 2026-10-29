const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const REVOKED = "Session expired or revoked. Please sign in again.";

function fixture() {
  const storage = new Map([["token", "active-token"], ["user", JSON.stringify({ name: "Test coach" })]]);
  const state = { auth: { token: "active-token", user: { name: "Test coach" } }, chat: { activeRoomId: null }, socket: { connected: false, reconnecting: false } };
  const actions = [], connections = [];
  const action = (type) => (payload) => ({ type, payload });
  const store = { getState: () => state, dispatch(value) {
    actions.push(value);
    if (value.type === "clearCredentials") { storage.delete("token"); storage.delete("user"); state.auth = { token: null, user: null }; }
    if (value.type === "setConnected") state.socket.connected = value.payload;
    if (value.type === "setReconnecting") state.socket.reconnecting = value.payload;
  } };
  const io = (_url, options) => {
    const handlers = new Map();
    const socket = { connected: false, options, disconnects: 0, on(name, handler) { handlers.set(name, handler); return this; }, emit() {}, off() {}, trigger(name, value) { if (name === "connect") this.connected = true; if (name === "disconnect") this.connected = false; handlers.get(name)?.(value); }, disconnect() { this.disconnects += 1; this.connected = false; handlers.get("disconnect")?.(); } };
    connections.push(socket);
    return socket;
  };
  const dependencies = {
    "socket.io-client": { io },
    "../store": { store },
    "../store/slices/authSlice": { clearCredentials: action("clearCredentials") },
    "../store/slices/socketSlice": Object.fromEntries(["setConnected", "setReconnecting", "setSocketError"].map((key) => [key, action(key)])),
    "../store/slices/chatSlice": Object.fromEntries(["appendMessage", "updateRoomMessagesStatus", "setPartnerTyping", "updatePartnerOnlineStatus"].map((key) => [key, action(key)])),
    "../store/slices/broadcastSlice": { addAnnouncement: action("addAnnouncement") },
    "react-hot-toast": { toast() {} },
  };
  const source = fs.readFileSync(path.join(__dirname, "../src/services/socketService.ts"), "utf8").replace("import.meta.env.VITE_API_BASE_URL", "undefined");
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} }, window = { location: { origin: "https://app.example.invalid", href: "/dashboard" } };
  vm.runInNewContext(js, { module, exports: module.exports, require: (name) => { if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`); return dependencies[name]; }, window, localStorage: { getItem: (key) => storage.get(key) ?? null }, console });
  const service = module.exports.socketService;
  service.connect("active-token");
  return { service, socket: connections[0], connections, actions, state, storage, window };
}

test("SESSION_REVOKED clears persisted and Redux credentials, closes the socket and redirects", () => {
  const f = fixture();
  f.socket.trigger("connect");
  f.socket.trigger("session_revoked", { code: "SESSION_REVOKED" });
  assert.equal(f.storage.has("token"), false);
  assert.equal(f.storage.has("user"), false);
  assert.equal(f.state.auth.token, null);
  assert.equal(f.state.auth.user, null);
  assert.equal(f.state.socket.connected, false);
  assert.equal(f.state.socket.reconnecting, false);
  assert.equal(f.socket.disconnects, 1);
  assert.equal(f.service.getSocket(), null);
  assert.equal(f.window.location.href, "/signin");
});

test("only the exact revoked handshake message or explicit auth code clears credentials", () => {
  for (const error of [new Error(REVOKED), Object.assign(new Error("Authentication failed"), { data: { code: "SESSION_REVOKED" } })]) {
    const f = fixture();
    f.socket.trigger("connect_error", error);
    assert.equal(f.storage.has("token"), false);
    assert.equal(f.service.getSocket(), null);
    assert.equal(f.window.location.href, "/signin");
  }
});

test("network failures, ordinary disconnects and unrelated permission errors preserve a valid session", () => {
  for (const message of ["websocket error", "timeout", "Network Error", "Unauthorized", "Room access denied"]) {
    const f = fixture();
    f.socket.trigger("connect");
    f.socket.trigger("connect_error", new Error(message));
    f.socket.trigger("disconnect");
    f.socket.trigger("session_revoked", { code: "ROOM_FORBIDDEN" });
    assert.equal(f.storage.get("token"), "active-token");
    assert.equal(f.state.auth.token, "active-token");
    assert.equal(f.window.location.href, "/dashboard");
    assert.equal(f.service.getSocket(), f.socket);
    assert.ok(f.actions.some((value) => value.type === "setSocketError" && value.payload === message));
    assert.ok(!f.actions.some((value) => value.type === "clearCredentials"));
  }
});

test("late revocation from an old connection cannot clear a newer signed-in session", () => {
  const f = fixture();
  f.socket.trigger("connect");
  f.storage.set("token", "new-token");
  f.state.auth.token = "new-token";
  f.service.connect("new-token");
  assert.equal(f.connections.length, 2);
  f.connections[1].trigger("connect");
  f.socket.trigger("session_revoked", { code: "SESSION_REVOKED" });
  f.socket.trigger("connect_error", new Error(REVOKED));
  assert.equal(f.storage.get("token"), "new-token");
  assert.equal(f.state.auth.token, "new-token");
  assert.equal(f.window.location.href, "/dashboard");
  assert.equal(f.service.getSocket(), f.connections[1]);
  assert.equal(f.state.socket.connected, true);
});
