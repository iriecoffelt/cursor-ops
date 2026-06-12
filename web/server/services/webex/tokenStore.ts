import fs from "node:fs";
import path from "node:path";
import { getEnvFilePath } from "../../paths.js";
import type { StoredWebexTokens } from "./types.js";

function tokenFilePath() {
  return path.join(path.dirname(getEnvFilePath()), ".webex-tokens.json");
}

export function readWebexTokens(): StoredWebexTokens | null {
  try {
    const raw = fs.readFileSync(tokenFilePath(), "utf8");
    return JSON.parse(raw) as StoredWebexTokens;
  } catch {
    return null;
  }
}

export function writeWebexTokens(tokens: StoredWebexTokens) {
  fs.writeFileSync(tokenFilePath(), `${JSON.stringify(tokens, null, 2)}\n`, { mode: 0o600 });
}

export function clearWebexTokens() {
  try {
    fs.unlinkSync(tokenFilePath());
  } catch {
    // ignore missing file
  }
}

export function isWebexConnected() {
  const tokens = readWebexTokens();
  return Boolean(tokens?.refresh_token || tokens?.access_token);
}
