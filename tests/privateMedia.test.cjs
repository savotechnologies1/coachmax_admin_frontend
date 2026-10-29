const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function helpers({ get, blocked = false } = {}) {
  const events = [];
  let now = 100000;
  const popup = { opener: { app: true }, closed: false, close() { this.closed = true; events.push("closed"); }, location: { replace(url) { events.push({ navigate: url }); } }, document: { title: "", body: {}, createElement: () => ({}), head: { appendChild(policy) { events.push({ policy }); } } } };
  const api = { defaults: { baseURL: "https://api.example.invalid" }, get: async (url, options) => { events.push({ request: url, options }); return get ? get(url, options) : { data: { success: true, url: "/uploads/chat/file.pdf?access=fresh" } }; } };
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, "../src/utils/privateMedia.ts"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const window = { location: { origin: "https://admin.example.invalid" }, open(url, target) { events.push({ open: url, target }); return blocked ? null : popup; } };
  const media = { getMediaUrl: (value) => /^(https?:|blob:|data:)/.test(value) ? value : value.startsWith("/images/") ? value : `${api.defaults.baseURL}/${value.replace(/^\/+/, "")}` };
  vm.runInNewContext(compiled, { module, exports: module.exports, URL, window, Error, Date: { now: () => now }, require: (name) => name === "../api/apiClient" ? { __esModule: true, default: api } : media });
  return { ...module.exports, events, popup, advanceTime: (milliseconds) => { now += milliseconds; } };
}

test("canonical private identity survives relative, expired signed and same-API absolute URLs", () => {
  const helper = helpers();
  for (const value of ["uploads/chat/file.pdf", "/uploads/chat/file.pdf?access=expired", "https://api.example.invalid/uploads/chat/file.pdf?access=expired"]) assert.equal(helper.getPrivateMediaPath(value), "uploads/chat/file.pdf");
  assert.equal(helper.getPrivateMediaPath("https://api.example.invalid/gateway/uploads/documents/proof.pdf?access=old", "https://api.example.invalid/gateway"), "uploads/documents/proof.pdf");
  assert.equal(helper.getPrivateMediaPath("https://other.example.invalid/uploads/chat/file.pdf"), null);
  assert.equal(helper.getPrivateMediaPath("uploads/profiles/avatar.webp"), null);
});

test("an expired attachment is renewed through the fixed API before opening, with opener and referrer disabled", async () => {
  const helper = helpers();
  await helper.openMediaInNewTab("https://api.example.invalid/uploads/chat/file.pdf?access=expired");
  assert.equal(helper.events[0].open, "about:blank");
  assert.equal(helper.popup.opener, null);
  assert.equal(helper.events.find((event) => event.policy).policy.content, "no-referrer");
  const call = helper.events.find((event) => event.request);
  assert.equal(call.request, "/api/auth/media-link");
  assert.equal(call.options.params.path, "uploads/chat/file.pdf");
  assert.equal(helper.events.at(-1).navigate, "https://api.example.invalid/uploads/chat/file.pdf?access=fresh");
});

test("denied or failed renewal closes the pending tab and never falls back to the expired URL", async () => {
  const failure = new Error("File access denied");
  const helper = helpers({ get: async () => { throw failure; } });
  await assert.rejects(helper.openMediaInNewTab("/uploads/chat/file.pdf?access=expired"), (error) => error === failure);
  assert.equal(helper.popup.closed, true);
  assert.equal(helper.events.filter((event) => event.navigate).length, 0);
});

test("public external media opens without any authenticated request", async () => {
  const helper = helpers();
  const url = "https://cdn.example.invalid/public-picture.jpg?v=1";
  await helper.openMediaInNewTab(url);
  assert.equal(helper.events.filter((event) => event.request).length, 0);
  assert.equal(helper.events.at(-1).navigate, url);
  assert.equal(helper.popup.opener, null);
});

test("untrusted renewal responses and script URLs cannot navigate or receive the API bearer token", async () => {
  const helper = helpers({ get: async () => ({ data: { success: true, url: "https://other.example.invalid/uploads/chat/file.pdf?access=evil" } }) });
  await assert.rejects(helper.openMediaInNewTab("/uploads/chat/file.pdf?access=expired"), /invalid file link/);
  assert.equal(helper.events.filter((event) => event.navigate).length, 0);
  assert.equal(helper.events.find((event) => event.request).request, "/api/auth/media-link");
  assert.equal(helper.popup.closed, true);
  const script = helpers();
  await assert.rejects(script.openMediaInNewTab("javascript:alert(1)"), /not supported/);
  assert.equal(script.events.filter((event) => event.request || event.navigate).length, 0);
  assert.equal(script.popup.closed, true);
});

test("blocked popups do not start a renewal request", async () => {
  const helper = helpers({ blocked: true });
  await assert.rejects(helper.openMediaInNewTab("/uploads/chat/file.pdf"), /Allow popups/);
  assert.equal(helper.events.filter((event) => event.request).length, 0);
});

test("late inline playback renews and reloads media once, then throttles corrupt-file loops for 30 seconds", async () => {
  const helper = helpers();
  let reloads = 0;
  const attributes = {};
  const video = { src: "https://api.example.invalid/uploads/chat/file.pdf?access=expired", isConnected: true, load() { reloads += 1; }, setAttribute(name, value) { attributes[name] = value; }, removeAttribute(name) { delete attributes[name]; } };
  assert.equal(await helper.renewInlineMediaElement(video, video.src), true);
  assert.equal(video.src, "https://api.example.invalid/uploads/chat/file.pdf?access=fresh");
  assert.equal(reloads, 1);
  assert.equal(await helper.renewInlineMediaElement(video, video.src), false);
  assert.equal(helper.events.filter((event) => event.request).length, 1);
  assert.equal(attributes["aria-busy"], undefined);
  helper.advanceTime(31000);
  assert.equal(await helper.renewInlineMediaElement(video, video.src), true);
  assert.equal(reloads, 2);
});

test("denied inline images keep their source and cannot automatically retry in a loop", async () => {
  const helper = helpers({ get: async () => { throw new Error("Access denied"); } });
  const image = { src: "https://api.example.invalid/uploads/chat/picture.webp?access=expired", isConnected: true, setAttribute() {}, removeAttribute() {} };
  await assert.rejects(helper.renewInlineMediaElement(image, image.src), /Access denied/);
  assert.match(image.src, /access=expired$/);
  assert.equal(await helper.renewInlineMediaElement(image, image.src), false);
  assert.equal(helper.events.filter((event) => event.request).length, 1);
  image.isConnected = false;
  helper.advanceTime(31000);
  assert.equal(await helper.renewInlineMediaElement(image, image.src), false);
});
