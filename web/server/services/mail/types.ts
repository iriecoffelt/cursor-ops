export type MailProvider = "google";

export type StoredOAuthTokens = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
};

export type MailTokenStore = {
  google?: StoredOAuthTokens;
};

export type MailMessage = {
  id: string;
  provider: MailProvider;
  subject: string;
  from: string;
  snippet: string;
  receivedAt: string;
  isUnread: boolean;
  url?: string;
};

export type MailProviderStatus = {
  enabled: boolean;
  configured: boolean;
  connected: boolean;
  email?: string;
  warning?: string;
};

export type MailStatusResponse = {
  google: MailProviderStatus;
  showMailTab: boolean;
  oauthRedirectBase: string;
};

export type MailInboxResponse = {
  fetchedAt: string;
  messages: MailMessage[];
  unreadCount: number;
  warnings: string[];
};
