# cursor-ops

Local command hub for Cursor — workload pulse, task integrations (Jira, Notion, GitHub), Gmail, and agent launcher.

## Requirements

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **Git**

## Install

```bash
git clone https://github.com/iriecoffelt/cursor-ops.git
cd cursor-ops
npm run setup
```

Setup creates `.env` from `.env.example` and installs dependencies.

Edit `.env` with your keys, then start:

```bash
npm start
```

Open [http://localhost:5173](http://localhost:5173) → **Setup** to verify connections.

## Environment variables

All config lives in **`.env` at the repo root**. Nav tabs appear only for configured integrations.

| Variable | Enables |
|----------|---------|
| `CURSOR_API_KEY` | Agents tab, cloud/local agents |
| `APP_TITLE` | Header + browser tab (default: Cursor Ops) |
| `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` | Jira tab |
| `NOTION_TOKEN` + `NOTION_TASKS_DB_IDS` | Notion tab |
| `GITHUB_TOKEN` | GitHub tab |
| `MAIL_GOOGLE_ENABLED` + `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Mail tab + Gmail unread on Pulse |
| `LOCAL_AGENT_CWD` | Local agent working directory (defaults to repo root) |
| `OAUTH_REDIRECT_BASE`, `APP_UI_BASE` | OAuth callbacks (defaults: `:3001` / `:5173`) |

Get `CURSOR_API_KEY` from [Cursor → Integrations](https://cursor.com/dashboard/integrations).

**Notion (multiple boards):**

```
NOTION_TASKS_DB_IDS=Sprint 12|abc123...,iOS App Ideas|def456...
```

Restart the dev server after changing `.env`.

### Gmail setup

1. Set `MAIL_GOOGLE_ENABLED=true` and add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
2. In [Google Cloud Console](https://console.cloud.google.com/), enable the [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com).
3. Create an OAuth web client with redirect URI:  
   `http://localhost:3001/api/mail/auth/google/callback`  
   (exact URI also shown on Setup → Integrations → Gmail.)
4. Restart, then **Connect Gmail** on Setup.
5. OAuth tokens save to `.mail-tokens.json` (gitignored).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | First-time install (`.env` + `npm install`) |
| `npm start` | Dev server (UI :5173, API :3001) |
| `npm run build` | Production build |

## Features

- **Pulse** — open work, blockers, due/overdue, charts, running agents, Gmail unread count
- **Jira / Notion / GitHub** — per-source task views
- **Mail** — unread Gmail inbox
- **Agents** — launch cloud or local Cursor agents
- **Setup** — collapsible integration guides and connection status

## Security

- Never commit `.env` or paste secrets in chat
- `.env` and `.mail-tokens.json` are gitignored
