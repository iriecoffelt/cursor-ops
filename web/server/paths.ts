import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = path.dirname(fileURLToPath(import.meta.url));

/** Repo root (parent of `web/`). */
export function getRepoRoot() {
  return path.resolve(serverDir, "../..");
}

export function getEnvFilePath() {
  return path.join(getRepoRoot(), ".env");
}

export function getLocalAgentCwd() {
  const fromEnv = process.env.LOCAL_AGENT_CWD?.trim();
  if (fromEnv) return fromEnv;
  return getRepoRoot();
}
