import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = ts.createSourceFile("App.tsx", fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const paths = [];
function visit(node) {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "Route") {
    const attribute = node.attributes.properties.find((entry) => ts.isJsxAttribute(entry) && entry.name.getText(source) === "path");
    if (attribute?.initializer && ts.isStringLiteral(attribute.initializer)) paths.push(attribute.initializer.text);
  }
  ts.forEachChild(node, visit);
}
visit(source);

test("business links remain valid after route chunking", () => {
  for (const path of ["/", "/signin", "/signup", "/forgot-password", "/players", "/player/:playerId", "/new-registration-request", "/programs-2", "/program/:programType", "/classes", "/clone-term", "/teams", "/teams/:teamId", "/leagues/:leagueId", "/admin/leagues/:leagueId", "/fixtures", "/events", "/add-event", "/edit-event/:id", "/event-details/:id", "/edit-product/:id", "/invoices/:id", "/orders/:id", "/term-earnings", "/finance-report", "/communication", "/messages", "/announcements", "/calendar", "*"]) assert.ok(paths.includes(path), `Missing business URL ${path}`);
});

test("each application URL has exactly one matching route declaration", () => {
  assert.equal(new Set(paths).size, paths.length);
});
