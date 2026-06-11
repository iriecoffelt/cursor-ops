# cursor-ops

Local command hub for Cursor — workload pulse, integrations (Jira, Notion, GitHub), and agent launcher.

## Requirements

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **Git**

## Install (new machine)

```bash
git clone https://github.com/iriecoffelt/cursor-ops.git
cd cursor-ops
npm run setup
```

Setup creates `.env` from `.env.example` and installs dependencies. **That’s the only install step.**

Then edit `.env` with your keys:

```bash
# macOS / Linux
${EDITOR:-nano} .env

# or open in Cursor
cursor .env
```

Start the app:

```bash
npm start
```

Open [http://localhost:5173](http://localhost:5173) → **Setup** tab to verify connections.

## Environment variables

All config lives in **`.env` at the repo root**. Only set what you need — missing integrations are hidden from the nav.

| Variable | Required | Enables |
|----------|----------|---------|
| `CURSOR_API_KEY` | For agents | Agents tab, cloud/local agents |
| `APP_TITLE` | No | Header + browser tab (default: Cursor Ops) |
| `JIRA_*` | No | Jira tab (all three vars) |
| `NOTION_TOKEN` + `NOTION_TASKS_DB_IDS` | No | Notion tab |
| `GITHUB_TOKEN` | No | GitHub tab |
| `LOCAL_AGENT_CWD` | No | Local agent path (defaults to repo root) |

Get `CURSOR_API_KEY` from [Cursor → Integrations](https://cursor.com/dashboard/integrations).

**Notion (multiple boards):**

```
NOTION_TASKS_DB_IDS=Sprint 12|abc123...,iOS App Ideas|def456...
```

Restart the dev server after changing `.env`. Visit the Setup page to refresh status.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | First-time install (`.env` + `npm install`) |
| `npm start` | Run dev server (UI :5173, API :3001) |
| `npm run build` | Production build |

## What it does

- **Pulse** — open work, blockers, due/overdue, charts, running agents
- **Jira / Notion / GitHub** — per-source task views (when configured)
- **Agents** — launch cloud or local Cursor agents
- **Setup** — integration guides and connection status

## Security

- Never commit `.env` or paste secrets in chat
- `.env` is gitignored by default
