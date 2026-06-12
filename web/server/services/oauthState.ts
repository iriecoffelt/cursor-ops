import { randomBytes } from "node:crypto";

export type OAuthProvider = "google" | "webex";

const pendingStates = new Map<string, { provider: OAuthProvider; createdAt: number }>();

export function createOAuthState(provider: OAuthProvider) {
  const state = randomBytes(24).toString("hex");
  pendingStates.set(state, { provider, createdAt: Date.now() });
  pruneStates();
  return state;
}

export function consumeOAuthState(state: string, provider: OAuthProvider) {
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
