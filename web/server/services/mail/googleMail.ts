import { friendlyGoogleApiError } from "./errors.js";
import { oauthRedirectBase } from "./settings.js";
import { createOAuthState } from "./oauthState.js";
import { clearProviderTokens, isProviderConnected, readMailTokens, saveProviderTokens } from "./tokenStore.js";
import type { MailMessage, MailProviderStatus, StoredOAuthTokens } from "./types.js";

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";

function googleClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function redirectUri() {
  return `${oauthRedirectBase()}/api/mail/auth/google/callback`;
}

async function exchangeToken(body: Record<string, string>) {
  const client = googleClient();
  if (!client) throw new Error("Google OAuth not configured");

  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...body, client_id: client.clientId, client_secret: client.clientSecret }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${text.slice(0, 120)}`);
  }

  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
}

async function getAccessToken(): Promise<string> {
  const stored = readMailTokens().google;
  if (!stored) throw new Error("Google mail not connected");

  if (stored.access_token && stored.expires_at && stored.expires_at > Date.now() + 60_000) {
    return stored.access_token;
  }

  if (!stored.refresh_token) {
    if (stored.access_token) return stored.access_token;
    throw new Error("Google mail session expired — reconnect in Setup");
  }

  const data = await exchangeToken({
    grant_type: "refresh_token",
    refresh_token: stored.refresh_token,
  });

  const next: StoredOAuthTokens = {
    access_token: data.access_token,
    refresh_token: stored.refresh_token,
    expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    scope: data.scope,
  };
  saveProviderTokens("google", next);
  return next.access_token;
}

export function googleAuthUrl() {
  const client = googleClient();
  if (!client) throw new Error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env");

  const params = new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state: createOAuthState("google"),
  });

  return `${GOOGLE_AUTH}?${params}`;
}

export async function googleHandleCallback(code: string) {
  const data = await exchangeToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
  });

  const existing = readMailTokens().google;
  saveProviderTokens("google", {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? existing?.refresh_token,
    expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    scope: data.scope,
  });
}

export function disconnectGoogle() {
  clearProviderTokens("google");
}

export async function googleStatus(enabled: boolean, configured: boolean): Promise<MailProviderStatus> {
  if (!enabled) {
    return { enabled: false, configured, connected: false };
  }
  if (!configured) {
    return {
      enabled: true,
      configured: false,
      connected: false,
      warning: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env",
    };
  }
  if (!isProviderConnected("google")) {
    return { enabled: true, configured: true, connected: false };
  }

  try {
    const accessToken = await getAccessToken();
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        enabled: true,
        configured: true,
        connected: true,
        warning: friendlyGoogleApiError(res.status, text),
      };
    }
    const profile = (await res.json()) as { emailAddress?: string };
    return {
      enabled: true,
      configured: true,
      connected: true,
      email: profile.emailAddress,
    };
  } catch (err) {
    return {
      enabled: true,
      configured: true,
      connected: true,
      warning: err instanceof Error ? err.message : "Google connection failed",
    };
  }
}

function headerValue(headers: Array<{ name?: string; value?: string }> | undefined, name: string) {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function safeIsoFromEmailDate(dateHeader: string): string {
  const parsed = new Date(dateHeader);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export async function fetchGoogleMail(): Promise<{ messages: MailMessage[]; warning?: string }> {
  if (!isProviderConnected("google")) {
    return { messages: [] };
  }

  try {
    const accessToken = await getAccessToken();
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=in:inbox+is:unread",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!listRes.ok) {
      const text = await listRes.text();
      return { messages: [], warning: friendlyGoogleApiError(listRes.status, text) };
    }

    const list = (await listRes.json()) as { messages?: Array<{ id: string }> };
    const ids = list.messages ?? [];
    if (!ids.length) return { messages: [] };

    const messages = await Promise.all(
      ids.slice(0, 20).map(async ({ id }) => {
        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (!res.ok) return null;
        const data = (await res.json()) as {
          id: string;
          snippet?: string;
          labelIds?: string[];
          payload?: { headers?: Array<{ name?: string; value?: string }> };
        };

        const subject = headerValue(data.payload?.headers, "Subject") || "(no subject)";
        const from = headerValue(data.payload?.headers, "From") || "Unknown sender";
        const date = headerValue(data.payload?.headers, "Date");
        const receivedAt = date ? safeIsoFromEmailDate(date) : new Date().toISOString();

        return {
          id: data.id,
          provider: "google" as const,
          subject,
          from,
          snippet: data.snippet ?? "",
          receivedAt,
          isUnread: data.labelIds?.includes("UNREAD") ?? true,
          url: `https://mail.google.com/mail/u/0/#inbox/${data.id}`,
        };
      }),
    );

    return { messages: messages.filter(Boolean) as MailMessage[] };
  } catch (err) {
    return { messages: [], warning: err instanceof Error ? err.message : "Gmail fetch failed" };
  }
}
