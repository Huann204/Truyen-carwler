import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const realCwd = fs.realpathSync.native(process.cwd());
process.chdir(realCwd);

const nextBin = path.join(realCwd, "node_modules", "next", "dist", "bin", "next");
const args = process.argv.slice(2);

const child = spawn(process.execPath, [nextBin, ...args], {
  cwd: realCwd,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
