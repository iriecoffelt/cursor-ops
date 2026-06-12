import { Router } from "express";
import { appUiBase } from "../services/mail/settings.js";
import { consumeOAuthState } from "../services/oauthState.js";
import { disconnectWebex, getWebexStatus, webexAuthUrl, webexHandleCallback } from "../services/webex/oauth.js";
import { webexSettings } from "../services/webex/settings.js";

export const webexRouter = Router();

webexRouter.get("/status", async (_req, res) => {
  try {
    const settings = webexSettings();
    res.json(await getWebexStatus(settings.enabled, settings.configured));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Webex status failed" });
  }
});

webexRouter.get("/auth", (_req, res) => {
  try {
    res.redirect(webexAuthUrl());
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Webex auth unavailable" });
  }
});

webexRouter.get("/auth/callback", async (req, res) => {
  const { code, state, error } = req.query;
  if (error) {
    res.redirect(`${appUiBase()}/env?webexError=${encodeURIComponent(String(error))}`);
    return;
  }
  if (!code || !state || !consumeOAuthState(String(state), "webex")) {
    res.redirect(`${appUiBase()}/env?webexError=invalid_oauth_state`);
    return;
  }

  try {
    await webexHandleCallback(String(code));
    res.redirect(`${appUiBase()}/?webexConnected=1`);
  } catch (err) {
    res.redirect(
      `${appUiBase()}/env?webexError=${encodeURIComponent(err instanceof Error ? err.message : "webex_connect_failed")}`,
    );
  }
});

webexRouter.post("/disconnect", (_req, res) => {
  disconnectWebex();
  res.json({ ok: true });
});
