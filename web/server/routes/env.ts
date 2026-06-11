import { Router } from "express";
import { getEnvFilePath, getLocalAgentCwd, getRepoRoot } from "../paths.js";
import { mailSettings, oauthRedirectBase } from "../services/mail/settings.js";
import { isProviderConnected } from "../services/mail/tokenStore.js";

export const envRouter = Router();

envRouter.get("/status", (_req, res) => {
  const notionIds =
    process.env.NOTION_TASKS_DB_IDS?.trim() ||
    process.env.NOTION_TASKS_DB_ID?.trim() ||
    "";

  const localCwd = getLocalAgentCwd();
  const localFromEnv = Boolean(process.env.LOCAL_AGENT_CWD?.trim());
  const mail = mailSettings();

  res.json({
    appTitle: process.env.APP_TITLE?.trim() || "Cursor Ops",
    repoRoot: getRepoRoot(),
    envFilePath: getEnvFilePath(),
    cursor: Boolean(process.env.CURSOR_API_KEY?.trim()),
    jira: Boolean(
      process.env.JIRA_BASE_URL?.trim() &&
        process.env.JIRA_EMAIL?.trim() &&
        process.env.JIRA_API_TOKEN?.trim(),
    ),
    notion: Boolean(process.env.NOTION_TOKEN?.trim() && notionIds),
    notionDatabaseCount: notionIds ? notionIds.split(",").filter(Boolean).length : 0,
    github: Boolean(process.env.GITHUB_TOKEN?.trim()),
    localAgentCwd: localCwd,
    localAgentCwdFromEnv: localFromEnv,
    mail: {
      showTab: mail.showMailTab,
      googleEnabled: mail.googleEnabled,
      googleConfigured: mail.googleConfigured,
      googleConnected: isProviderConnected("google"),
      oauthRedirectBase: oauthRedirectBase(),
    },
  });
});
