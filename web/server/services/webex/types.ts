export type StoredWebexTokens = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  refresh_token_expires_at?: number;
  scope?: string;
  email?: string;
};
