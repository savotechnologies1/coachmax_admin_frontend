const { readdirSync } = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const files = readdirSync(path.join(__dirname, "../tests")).filter((name) => /\.test\.(mjs|cjs)$/.test(name)).sort().map((name) => path.join(__dirname, "../tests", name));
const result = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
process.exitCode = result.status ?? 1;
