const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(relativePath, dependencies) {
  const source = fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(js, { exports: module.exports, module, require: (name) => { if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`); return dependencies[name]; }, FormData, console, localStorage: new Proxy({}, { get() { throw new Error("League saves must not access browser-local fabricated state."); } }) });
  return module.exports;
}
const dates = { APP_TIME_ZONE: "Australia/Sydney", formatDateOnly: (value) => value, formatTime: () => "18:00", formatTimestampDate: () => "26/10/2026", toDateOnly: () => "2026-10-26" };
const api = (service) => load("src/modules/leagues/api/leagueApi.ts", { "../../../services/leagueService": { __esModule: true, default: service }, "../../../utils/dateTime": dates });

test("league read failures propagate without demo data, even for the old demo league ID", async () => {
  const failure = new Error("Offline");
  const leagueApi = api({ getLeagueData: async () => { throw failure; } });
  await assert.rejects(leagueApi.getLeagueMasterData("real-id"), (error) => error === failure);
  await assert.rejects(leagueApi.getLeagueMasterData("ejl9"), (error) => error === failure);
});

test("an empty server schedule stays empty and invalid server responses are visible errors", async () => {
  assert.deepEqual(Array.from(await api({ getLeagueData: async () => ({ league: { _id: "L" }, fixtures: [], schedule: [] }) }).getLeagueMatches("ejl9")), []);
  await assert.rejects(api({ getLeagueData: async () => ({ unrelated: true }) }).getLeagueMasterData("L"), /incomplete/);
});

test("every league write propagates rejection with exactly one server attempt and no local save", async () => {
  const failure = new Error("Response lost or rejected");
  const attempts = [];
  const service = new Proxy({}, { get: (_, name) => async (...args) => { attempts.push({ name, args }); throw failure; } });
  const leagueApi = api(service);
  const commands = [
    () => leagueApi.updateLeagueDetails("L", { name: "Updated" }),
    () => leagueApi.generateRandomFixtures("L"),
    () => leagueApi.createLeagueMatch("L", { round: 1, kickoffTime: "2026-10-26T07:00:00Z", homeTeam: { _id: "A" }, awayTeam: { _id: "B" } }),
    () => leagueApi.updateLeagueMatch("L", "F", { homeScore: 0, awayScore: 0, status: "COMPLETED" }),
    () => leagueApi.updateFixtureManually("L", "F", { field: "Field 2" }),
    () => leagueApi.deleteLeagueMatch("L", "F"),
    () => leagueApi.deleteLeagueRound("L", 1),
    () => leagueApi.addTeamToLeague("L", ["T"]),
    () => leagueApi.removeTeamFromLeague("L", "T"),
    () => leagueApi.toggleTeamStatus("L", "T", "INACTIVE"),
    () => leagueApi.recalculateLeagueLadder("L"),
    () => leagueApi.updateLeagueTeamStats("L", "T", { won: 1 }),
  ];
  for (const command of commands) {
    const count = attempts.length;
    await assert.rejects(command(), (error) => error === failure);
    assert.equal(attempts.length, count + 1);
  }
});

test("the HTTP service never replays failed nested mutations at global endpoints", async () => {
  const calls = [];
  const failure = new Error("503 after a possibly committed mutation");
  const client = Object.fromEntries(["post", "put", "delete"].map((method) => [method, async (url) => { calls.push({ method, url }); throw failure; }]));
  const { leagueService } = load("src/services/leagueService.ts", { "../api/apiClient": { __esModule: true, default: client } });
  for (const invoke of [() => leagueService.createFixture({ league: "L" }), () => leagueService.updateFixtureManually("L", "F", {}), () => leagueService.deleteLeagueFixture("L", "F")]) {
    const count = calls.length;
    await assert.rejects(invoke(), (error) => error === failure);
    assert.equal(calls.length, count + 1);
    assert.ok(calls.at(-1).url.startsWith("/api/admin/leagues/L/fixtures"));
  }
});

test("result correction sends team IDs, preserves 0-0 and returns authoritative server version", async () => {
  let received;
  const leagueApi = api({ updateFixtureManually: async (_league, _fixture, payload) => { received = payload; return { _id: "F", __v: 2, round: 1, score: { homeScore: 0, awayScore: 0 }, status: "COMPLETED", homeTeam: { _id: "A" }, awayTeam: { _id: "B" }, kickoffTime: "2026-10-26T07:00:00Z" }; } });
  const result = await leagueApi.updateLeagueMatch("L", "F", { homeTeam: { _id: "A", name: "Team A" }, awayTeam: { _id: "B" }, homeScore: 0, awayScore: 0, status: "COMPLETED", version: 1 });
  assert.equal(received.homeTeam, "A");
  assert.equal(received.awayTeam, "B");
  assert.equal(received.version, 1);
  assert.equal(result.version, 2);
  assert.equal(result.homeScore, 0);
  assert.equal(result.awayScore, 0);
});
