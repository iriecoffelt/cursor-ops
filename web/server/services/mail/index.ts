import { mailSettings, oauthRedirectBase } from "./settings.js";
import { fetchGoogleMail, googleStatus } from "./googleMail.js";
import type { MailInboxResponse, MailStatusResponse } from "./types.js";

export async function getMailStatus(): Promise<MailStatusResponse> {
  const settings = mailSettings();
  const google = await googleStatus(settings.googleEnabled, settings.googleConfigured);

  return {
    google,
    showMailTab: settings.showMailTab,
    oauthRedirectBase: oauthRedirectBase(),
  };
}

export async function fetchMailInbox(): Promise<MailInboxResponse> {
  const settings = mailSettings();
  const warnings: string[] = [];

  if (!settings.showMailTab) {
    warnings.push(
      "Mail not configured — set MAIL_GOOGLE_ENABLED=true, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET in .env",
    );
    return {
      fetchedAt: new Date().toISOString(),
      messages: [],
      unreadCount: 0,
      warnings,
    };
  }

  const batch = await fetchGoogleMail();
  if (batch.warning) warnings.push(batch.warning);

  const messages = [...batch.messages].sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  );

  return {
    fetchedAt: new Date().toISOString(),
    messages,
    unreadCount: messages.filter((m) => m.isUnread).length,
    warnings: [...new Set(warnings)],
  };
}
