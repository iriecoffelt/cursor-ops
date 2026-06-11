# cursor-ops

Local command hub for Cursor — dashboard, agent launcher, and live run monitoring.

## Quick start

```bash
cd web
cp ../.env.example ../.env   # fill in API keys
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## What it does

- **Dashboard** — Jira, Notion, GitHub PRs, running agents (refresh on demand)
- **Agents** — launch cloud or local Cursor agents, stream output, cancel runs
- **Open in Cursor** — hand off to Agents Window for deep work

## Environment

Copy `.env.example` to `.env` at the repo root. Integrations degrade gracefully when keys are missing.

**Notion (multiple sprints/projects):** set `NOTION_TASKS_DB_IDS` to a comma-separated list of database IDs. Optional labels:

```
NOTION_TASKS_DB_IDS=Sprint 12|b7376c40...,Project Alpha|abc123...,def456...
```

If you omit labels, the app fetches each database title from Notion automatically.
