import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const major = Number(process.versions.node.split(".")[0]);
if (major < 22) {
  console.error("SilverArrows requires Node.js 22.12+ (Node.js 24 LTS recommended). Install it, then run node run.mjs again.");
  process.exit(1);
}
if (major === 22 && Number(process.versions.node.split(".")[1]) < 12) {
  console.error("Please update Node.js to 22.12+ or 24 LTS.");
  process.exit(1);
}

function npm(args) {
  // cmd.exe is needed for npm.cmd on Windows; every argument here is a fixed literal.
  const result = process.platform === "win32"
    ? spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `npm ${args.join(" ")}`], { cwd: root, stdio: "inherit" })
    : spawnSync("npm", args, { cwd: root, stdio: "inherit" });
  if (result.error) {
    console.error("Could not run npm. Install Node.js with npm and check that it is on your PATH.");
    process.exit(1);
  }
  if (result.signal || result.status !== 0) process.exit(result.status || 1);
}

const lock = join(root, "package-lock.json");
const fingerprint = createHash("sha256").update(readFileSync(join(root, "package.json"))).update(existsSync(lock) ? readFileSync(lock) : "").digest("hex");
const marker = join(root, "node_modules", ".silverarrows-install");
if (!existsSync(marker) || readFileSync(marker, "utf8") !== fingerprint || !existsSync(join(root, "node_modules", "vite", "package.json"))) {
  console.log("Installing SilverArrows dependencies (internet required on first run)…");
  npm(existsSync(lock) ? ["ci", "--no-audit", "--no-fund"] : ["install", "--no-audit", "--no-fund"]);
  writeFileSync(marker, fingerprint);
}
console.log("Checking SilverArrows regression tests…");
npm(["test"]);
if (process.argv.includes("--check")) {
  console.log("Setup and regression checks passed.");
  process.exit(0);
}
console.log("Starting SilverArrows at http://localhost:8080 — press Ctrl+C to stop.");
npm(["run", "dev:local", "--", "--open"]);