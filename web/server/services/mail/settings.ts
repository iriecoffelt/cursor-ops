export function envBool(name: string, defaultValue = false): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return defaultValue;
  return value === "true" || value === "1" || value === "yes";
}

export function oauthRedirectBase() {
  return process.env.OAUTH_REDIRECT_BASE?.trim() || "http://localhost:3001";
}

export function appUiBase() {
  return process.env.APP_UI_BASE?.trim() || "http://localhost:5173";
}

export function mailSettings() {
  const googleEnabled = envBool("MAIL_GOOGLE_ENABLED");
  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );

  return {
    googleEnabled,
    googleConfigured,
    showMailTab: googleEnabled && googleConfigured,
  };
}
