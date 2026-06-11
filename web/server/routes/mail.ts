import { Router } from "express";
import { appUiBase } from "../services/mail/settings.js";
import { consumeOAuthState } from "../services/mail/oauthState.js";
import {
  disconnectGoogle,
  googleAuthUrl,
  googleHandleCallback,
} from "../services/mail/googleMail.js";
import { fetchMailInbox, getMailStatus } from "../services/mail/index.js";

export const mailRouter = Router();

mailRouter.get("/status", async (_req, res) => {
  try {
    res.json(await getMailStatus());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Mail status failed" });
  }
});

mailRouter.get("/", async (_req, res) => {
  try {
    res.json(await fetchMailInbox());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Mail fetch failed" });
  }
});

mailRouter.get("/auth/google", (_req, res) => {
  try {
    res.redirect(googleAuthUrl());
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Google auth unavailable" });
  }
});

mailRouter.get("/auth/google/callback", async (req, res) => {
  const { code, state, error } = req.query;
  if (error) {
    res.redirect(`${appUiBase()}/env?mailError=${encodeURIComponent(String(error))}`);
    return;
  }
  if (!code || !state || !consumeOAuthState(String(state), "google")) {
    res.redirect(`${appUiBase()}/env?mailError=invalid_oauth_state`);
    return;
  }

  try {
    await googleHandleCallback(String(code));
    res.redirect(`${appUiBase()}/mail?connected=google`);
  } catch (err) {
    res.redirect(
      `${appUiBase()}/env?mailError=${encodeURIComponent(err instanceof Error ? err.message : "google_connect_failed")}`,
    );
  }
});

mailRouter.post("/disconnect/google", (_req, res) => {
  disconnectGoogle();
  res.json({ ok: true });
});
