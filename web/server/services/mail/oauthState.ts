import { randomBytes } from "node:crypto";
import type { MailProvider } from "./types.js";

const pendingStates = new Map<string, { provider: MailProvider; createdAt: number }>();

export function createOAuthState(provider: MailProvider) {
  const state = randomBytes(24).toString("hex");
  pendingStates.set(state, { provider, createdAt: Date.now() });
  pruneStates();
  return state;
}

export function consumeOAuthState(state: string, provider: MailProvider) {
  const entry = pendingStates.get(state);
  pendingStates.delete(state);
  if (!entry || entry.provider !== provider) return false;
  if (Date.now() - entry.createdAt > 10 * 60 * 1000) return false;
  return true;
}

function pruneStates() {
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [state, entry] of pendingStates) {
    if (entry.createdAt < cutoff) pendingStates.delete(state);
  }
}
