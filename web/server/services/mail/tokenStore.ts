import fs from "node:fs";
import { getEnvFilePath } from "../../paths.js";
import path from "node:path";
import type { MailTokenStore, StoredOAuthTokens } from "./types.js";

function tokenFilePath() {
  return path.join(path.dirname(getEnvFilePath()), ".mail-tokens.json");
}

export function readMailTokens(): MailTokenStore {
  try {
    const raw = fs.readFileSync(tokenFilePath(), "utf8");
    return JSON.parse(raw) as MailTokenStore;
  } catch {
    return {};
  }
}

export function writeMailTokens(store: MailTokenStore) {
  fs.writeFileSync(tokenFilePath(), `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
}

export function saveProviderTokens(provider: keyof MailTokenStore, tokens: StoredOAuthTokens) {
  const store = readMailTokens();
  store[provider] = tokens;
  writeMailTokens(store);
}

export function clearProviderTokens(provider: keyof MailTokenStore) {
  const store = readMailTokens();
  delete store[provider];
  writeMailTokens(store);
}

export function isProviderConnected(provider: keyof MailTokenStore) {
  const tokens = readMailTokens()[provider];
  return Boolean(tokens?.refresh_token || tokens?.access_token);
}
