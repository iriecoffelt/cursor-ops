import { oauthRedirectBase } from "../mail/settings.js";
import { createOAuthState } from "../oauthState.js";
import {
  clearWebexTokens,
  isWebexConnected,
  readWebexTokens,
  writeWebexTokens,
} from "./tokenStore.js";
import type { StoredWebexTokens } from "./types.js";

const WEBEX_AUTH = "https://webexapis.com/v1/authorize";
const WEBEX_TOKEN = "https://webexapis.com/v1/access_token";
const WEBEX_SCOPE = "meeting:schedules_read spark:people_read";

function webexClient() {
  const clientId = process.env.WEBEX_CLIENT_ID?.trim();
  const clientSecret = process.env.WEBEX_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function redirectUri() {
  return `${oauthRedirectBase()}/api/webex/auth/callback`;
}

async function exchangeToken(body: Record<string, string>) {
  const client = webexClient();
  if (!client) throw new Error("Webex OAuth not configured");

  const res = await fetch(WEBEX_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...body,
      client_id: client.clientId,
      client_secret: client.clientSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webex token exchange failed: ${text.slice(0, 160)}`);
  }

  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_token_expires_in?: number;
    scope?: string;
  };
}

async function fetchWebexEmail(accessToken: string): Promise<string | undefined> {
  const res = await fetch("https://webexapis.com/v1/people/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return undefined;
  const data = (await res.json()) as { emails?: string[] };
  return data.emails?.[0];
}

function storeTokens(
  data: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_token_expires_in?: number;
    scope?: string;
  },
  existing?: StoredWebexTokens | null,
  email?: string,
) {
  const tokens: StoredWebexTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? existing?.refresh_token,
    expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    refresh_token_expires_at: data.refresh_token_expires_in
      ? Date.now() + data.refresh_token_expires_in * 1000
      : existing?.refresh_token_expires_at,
    scope: data.scope ?? existing?.scope,
    email: email ?? existing?.email,
  };
  writeWebexTokens(tokens);
  return tokens;
}

export function webexAuthUrl() {
  const client = webexClient();
  if (!client) throw new Error("Set WEBEX_CLIENT_ID and WEBEX_CLIENT_SECRET in .env");

  const params = new URLSearchParams({
    client_id: client.clientId,
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: WEBEX_SCOPE,
    state: createOAuthState("webex"),
  });

  return `${WEBEX_AUTH}?${params}`;
}

export async function webexHandleCallback(code: string) {
  const data = await exchangeToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
  });

  const existing = readWebexTokens();
  const email = await fetchWebexEmail(data.access_token);
  storeTokens(data, existing, email);
}

export function disconnectWebex() {
  clearWebexTokens();
}

export async function getWebexAccessToken(): Promise<string> {
  const stored = readWebexTokens();
  if (!stored) throw new Error("Webex not connected — sign in under Setup");

  if (stored.access_token && stored.expires_at && stored.expires_at > Date.now() + 60_000) {
    return stored.access_token;
  }

  if (!stored.refresh_token) {
    if (stored.access_token) return stored.access_token;
    throw new Error("Webex session expired — reconnect in Setup");
  }

  const data = await exchangeToken({
    grant_type: "refresh_token",
    refresh_token: stored.refresh_token,
  });

  const email = stored.email ?? (await fetchWebexEmail(data.access_token));
  const next = storeTokens(data, stored, email);
  return next.access_token;
}

export async function getWebexStatus(enabled: boolean, configured: boolean) {
  if (!enabled) {
    return { enabled: false, configured, connected: false };
  }
  if (!configured) {
    return {
      enabled: true,
      configured: false,
      connected: false,
      warning: "Set WEBEX_CLIENT_ID and WEBEX_CLIENT_SECRET in .env",
    };
  }
  if (!isWebexConnected()) {
    return {
      enabled: true,
      configured: true,
      connected: false,
      warning: "Connect Webex in Setup to load today's meetings on Pulse",
    };
  }

  const stored = readWebexTokens();
  return {
    enabled: true,
    configured: true,
    connected: true,
    email: stored?.email,
    oauthRedirectBase: oauthRedirectBase(),
  };
}
