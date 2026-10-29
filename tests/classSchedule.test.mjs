import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function compile(relativePath, dependencies = {}) {
  const source = fs.readFileSync(new URL(relativePath, import.meta.url), "utf8").replace("import.meta.env.VITE_APP_TIMEZONE", "undefined");
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Date, Intl, TypeError, require: (name) => dependencies[name] });
  return exports;
}
const dates = compile("../src/utils/dateTime.ts");
const schedule = compile("../src/utils/classSchedule.ts", { "./dateTime": dates });

test("View All has explicit API identity and retains Monday-first weekday order", () => {
  assert.equal(schedule.scheduleDayQuery("View All"), "ALL");
  assert.equal(schedule.scheduleDayQuery("Wednesday"), "WEDNESDAY");
  assert.deepEqual(Array.from(schedule.WEEKDAYS), ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]);
});
test("multi-day accordion occurrences remain independent while assignment deduplicates classes", () => {
  const monday = { classId: "u8", occurrenceId: "u8:MONDAY:1020:1080", dayOfWeek: "MONDAY", startTime: "17:00" };
  const wednesday = { ...monday, occurrenceId: "u8:WEDNESDAY:1020:1080", dayOfWeek: "WEDNESDAY" };
  const another = { classId: "u10", occurrenceId: "u10:MONDAY:1020:1080" };
  assert.notEqual(schedule.occurrenceKey(monday), schedule.occurrenceKey(wednesday));
  assert.equal(schedule.distinctClassSlots([monday, wednesday, another]).length, 2);
});
