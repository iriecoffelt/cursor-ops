#!/usr/bin/env node
/**
 * One-time setup: Node check, .env scaffold, npm install in web/.
 * Run from repo root: npm run setup
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envExample = path.join(repoRoot, ".env.example");
const envFile = path.join(repoRoot, ".env");
const webDir = path.join(repoRoot, "web");

function log(msg) {
  console.log(msg);
}

function fail(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) {
    fail(`${cmd} ${args.join(" ")} failed`);
  }
}

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < 20) {
  fail(`Node.js 20+ required (found ${process.versions.node}). Install from https://nodejs.org`);
}

log("\n▸ cursor-ops setup\n");

if (!fs.existsSync(envExample)) {
  fail("Missing .env.example in repo root");
}

if (!fs.existsSync(envFile)) {
  fs.copyFileSync(envExample, envFile);
  log("✓ Created .env from .env.example");
} else {
  log("✓ .env already exists (left unchanged)");
}

log("▸ Installing dependencies in web/ …");
run("npm", ["install"], webDir);

log(`
✓ Setup complete

Next steps:
  1. Edit your environment file:
       ${envFile}

  2. Add at least CURSOR_API_KEY (and any optional integrations).

  3. Start the app:
       npm start

  4. Open http://localhost:5173 → Setup tab to verify connections.

Never commit .env or paste secrets in chat.
`);
