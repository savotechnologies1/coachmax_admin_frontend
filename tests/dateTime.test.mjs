import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { execFileSync } from "node:child_process";

function helpers() {
  const source = fs.readFileSync(new URL("../src/utils/dateTime.ts", import.meta.url), "utf8")
    .replace("import.meta.env.VITE_APP_TIMEZONE", "undefined");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, Date, Intl, TypeError });
  return exports;
}
const dates = helpers();

test("strict calendar parser rejects impossible and ambiguous dates", () => {
  assert.equal(dates.toDateOnly("29/02/2024"), "2024-02-29");
  for (const value of ["2026-02-29", "31/02/2026", "10/26/2026", "2026-10-26foo", "2026-10-26T25:00:00Z", "Monday 26 October 2026"]) assert.equal(dates.toDateOnly(value), "", value);
  assert.equal(dates.toDateOnly("2026-10-26T00:00:00+11:00"), "2026-10-26");
});

test("all date displays use DD/MM/YYYY while standalone weekdays remain usable", () => {
  assert.equal(dates.formatDateOnly("2026-10-26"), "26/10/2026");
  assert.equal(dates.formatDateOnly("2026-10-26", { day: "numeric", month: "short" }), "26/10/2026");
  assert.equal(dates.formatDateOnly("2026-10-26", { weekday: "short" }), "Mon");
  assert.equal(dates.formatDateTime("2026-10-25T23:30:00Z", undefined, "Asia/Kolkata"), "26/10/2026 05:00");
  assert.equal(dates.formatDateTime("2026-10-26", undefined, "America/Los_Angeles"), "26/10/2026");
  assert.equal(dates.formatTimestampDate("2026-10-25T23:30:00Z", "America/Los_Angeles"), "25/10/2026");
});

test("calendar date and picker roundtrips never shift in supported timezones", () => {
  for (const tz of ["UTC", "Australia/Sydney", "Pacific/Auckland", "America/Los_Angeles", "Asia/Kolkata"]) {
    const script = `import fs from 'node:fs';import ts from 'typescript';import vm from 'node:vm';const src=fs.readFileSync('src/utils/dateTime.ts','utf8').replace('import.meta.env.VITE_APP_TIMEZONE','undefined');const exports={};vm.runInNewContext(ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Date,Intl,TypeError});console.log(JSON.stringify([exports.formatDateOnly('2026-10-26'),exports.dateOnlyFormValue(exports.dateOnlyToLocalDate('2026-10-26')),exports.addDateOnlyDays('2026-10-03',1)]));`;
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], { env: { ...process.env, TZ: tz }, encoding: "utf8" });
    assert.deepEqual(JSON.parse(output), ["26/10/2026", "2026-10-26", "2026-10-04"], tz);
  }
});

test("U group uses context year rather than exact birthday", () => {
  assert.equal(dates.ageGroupForYear("2015-10-30", 2026), 11);
  assert.equal(dates.ageGroupForYear("2015-01-01", 2026), 11);
  assert.equal(dates.ageGroupForYear("2015-12-31", 2027), 12);
  assert.equal(dates.ageGroupForYear("not a date", 2026), null);
});

test("kickoff conversion never invents dates/times and rejects DST gaps", () => {
  assert.equal(dates.zonedDateTimeToUtcISOString("2026-10-26", "17:30", "Australia/Sydney"), "2026-10-26T06:30:00.000Z");
  assert.equal(dates.zonedDateTimeToUtcISOString("2026-10-26", "5:30 PM", "Australia/Sydney"), "2026-10-26T06:30:00.000Z");
  for (const [day, time] of [["bad", "17:30"], ["2026-10-26", "25:00"], ["2026-10-26", "12:60"], ["2026-10-26", ""], ["2026-10-04", "02:30"]]) assert.throws(() => dates.zonedDateTimeToUtcISOString(day, time, "Australia/Sydney"), TypeError);
});
