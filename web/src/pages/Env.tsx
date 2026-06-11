import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useEnvStatus } from "../context/EnvStatusContext";

type IntegrationId = "cursor" | "jira" | "notion" | "github";

type IntegrationGuide = {
  id: IntegrationId;
  name: string;
  required: boolean;
  tabLabel: string;
  vars: string[];
  steps: string[];
  links: { label: string; href: string }[];
};

type AppSetting = {
  var: string;
  label: string;
  description: string;
  defaultValue: string;
};

const APP_SETTINGS: AppSetting[] = [
  {
    var: "APP_TITLE",
    label: "App title",
    description: "Shown in the header and browser tab. Defaults to “Cursor Ops” if unset.",
    defaultValue: "Cursor Ops",
  },
];

const GUIDES: IntegrationGuide[] = [
  {
    id: "cursor",
    name: "Cursor Cloud Agents",
    required: false,
    tabLabel: "Agents",
    vars: ["CURSOR_API_KEY", "LOCAL_AGENT_CWD"],
    steps: [
      "Open Cursor → Dashboard → Integrations (or visit cursor.com/dashboard/integrations).",
      "Create or copy your user API key.",
      "Set CURSOR_API_KEY in .env at the repo root.",
      "Optional: set LOCAL_AGENT_CWD to a project path for local agents (defaults to repo root).",
      "Restart the dev server: npm start from the repo root.",
      "The Agents tab appears once CURSOR_API_KEY is set. Pulse shows running agents there too.",
    ],
    links: [{ label: "Cursor Integrations", href: "https://cursor.com/dashboard/integrations" }],
  },
  {
    id: "jira",
    name: "Jira (Atlassian Cloud)",
    required: false,
    tabLabel: "Jira",
    vars: ["JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN"],
    steps: [
      "Set JIRA_BASE_URL to your site, e.g. https://yourcompany.atlassian.net",
      "Set JIRA_EMAIL to the Atlassian account email.",
      "Create an API token at id.atlassian.com → Security → API tokens.",
      "Set JIRA_API_TOKEN to that token.",
      "Restart the dev server — the Jira tab and Pulse Jira stats appear automatically.",
      "Blockers and due/overdue issues are highlighted on Pulse and the Jira page.",
    ],
    links: [
      { label: "Atlassian API tokens", href: "https://id.atlassian.com/manage-profile/security/api-tokens" },
    ],
  },
  {
    id: "notion",
    name: "Notion",
    required: false,
    tabLabel: "Notion",
    vars: ["NOTION_TOKEN", "NOTION_TASKS_DB_IDS", "NOTION_TASKS_DB_ID"],
    steps: [
      "Create an integration at notion.so/my-integrations.",
      "Copy the Internal Integration Secret (starts with ntn_ or secret_) — not the integrations page URL.",
      "Set NOTION_TOKEN in .env.",
      "Open each task database in Notion → ⋯ → Connections → add your integration.",
      "Copy database IDs from the URL (32-character hex after the database slug).",
      "Set NOTION_TASKS_DB_IDS with comma-separated entries: Label|database-id",
      "Example: NOTION_TASKS_DB_IDS=\"Sprint 12|abc123...,iOS App Ideas|def456...\"",
      "Legacy: NOTION_TASKS_DB_ID works for a single database if you prefer one var.",
      "Restart — the Notion tab and board charts on Pulse appear when token + at least one DB ID are set.",
    ],
    links: [{ label: "Notion integrations", href: "https://www.notion.so/my-integrations" }],
  },
  {
    id: "github",
    name: "GitHub",
    required: false,
    tabLabel: "GitHub",
    vars: ["GITHUB_TOKEN"],
    steps: [
      "GitHub → Settings → Developer settings → Personal access tokens.",
      "Classic token: repo or public_repo scope. Fine-grained: Pull requests → Read access.",
      "Set GITHUB_TOKEN in .env.",
      "Restart — the GitHub tab appears and Pulse shows PR reviews, your open PRs, and assigned issues.",
      "Review requests also surface under Waiting on me on Pulse.",
    ],
    links: [{ label: "GitHub PAT settings", href: "https://github.com/settings/tokens" }],
  },
];

const ALL_VARS = [
  "APP_TITLE",
  "CURSOR_API_KEY",
  "LOCAL_AGENT_CWD",
  "JIRA_BASE_URL",
  "JIRA_EMAIL",
  "JIRA_API_TOKEN",
  "NOTION_TOKEN",
  "NOTION_TASKS_DB_IDS",
  "NOTION_TASKS_DB_ID",
  "GITHUB_TOKEN",
];

export function EnvPage() {
  const { status, refresh } = useEnvStatus();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const configuredCount = [
    status?.cursor,
    status?.jira,
    status?.notion,
    status?.github,
  ].filter(Boolean).length;

  const envPath = status?.envFilePath ?? ".env";
  const repoRoot = status?.repoRoot;

  return (
    <>
      <div className="page-header hero-header">
        <div>
          <p className="eyebrow">Configuration</p>
          <h2>Environment setup</h2>
          <p className="muted">
            Edit <code className="inline-code">{envPath}</code>
            {status ? ` · ${configuredCount} integration${configuredCount === 1 ? "" : "s"} connected` : null}
          </p>
        </div>
      </div>

      <section className="panel env-intro">
        <h3>Install (one time)</h3>
        <pre className="code-block">{`git clone https://github.com/iriecoffelt/cursor-ops.git
cd cursor-ops
npm run setup`}</pre>
        <h4 className="env-subhead">Then configure</h4>
        <pre className="code-block">{`# edit .env with your API keys
npm start
# open http://localhost:5173`}</pre>
        <p className="muted">
          <code className="inline-code">npm run setup</code> creates <code className="inline-code">.env</code> and installs
          dependencies. After that, you only need to edit <code className="inline-code">.env</code> and restart. Never
          commit <code className="inline-code">.env</code> or paste secrets in chat. Nav tabs appear only for configured
          integrations.
        </p>
        {repoRoot ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            Repo root on this machine: <code className="inline-code">{repoRoot}</code>
          </p>
        ) : null}
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h3>App settings</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          These don&apos;t require API keys. Changes apply after a server restart.
        </p>
        <div className="env-grid env-settings-grid">
          {APP_SETTINGS.map((setting) => (
            <div className="env-setting-row" key={setting.var}>
              <div>
                <strong>{setting.label}</strong>
                <p className="muted env-setting-desc">{setting.description}</p>
              </div>
              <div className="env-setting-meta">
                <code className="inline-code">{setting.var}</code>
                {setting.var === "APP_TITLE" && status?.appTitle ? (
                  <span className="env-badge ok">Current: {status.appTitle}</span>
                ) : (
                  <span className="env-badge missing">Default: {setting.defaultValue}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h3>Nav tabs &amp; visibility</h3>
        <ul className="env-var-list env-visibility-list">
          <li>
            <strong>Pulse</strong> and <strong>Setup</strong> — always visible
          </li>
          <li>
            <strong>Jira</strong> — requires JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN
          </li>
          <li>
            <strong>Notion</strong> — requires NOTION_TOKEN and NOTION_TASKS_DB_IDS (or NOTION_TASKS_DB_ID)
          </li>
          <li>
            <strong>GitHub</strong> — requires GITHUB_TOKEN
          </li>
          <li>
            <strong>Agents</strong> — requires CURSOR_API_KEY
          </li>
        </ul>
        {status?.notionDatabaseCount ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            Notion: {status.notionDatabaseCount} database{status.notionDatabaseCount === 1 ? "" : "s"} configured.
          </p>
        ) : null}
      </section>

      <div className="env-grid" style={{ marginTop: 16 }}>
        {GUIDES.map((guide) => {
          const ok = status ? Boolean(status[guide.id]) : null;
          return (
            <section className="panel env-card" key={guide.id}>
              <div className="env-card-header">
                <h3>{guide.name}</h3>
                {ok === null ? null : (
                  <span className={`env-badge ${ok ? "ok" : "missing"}`}>
                    {ok ? "Connected" : "Not configured"}
                  </span>
                )}
              </div>

              <p className="muted env-tab-hint">
                Enables the <strong>{guide.tabLabel}</strong> tab
                {ok ? " · visible in nav" : " · hidden until configured"}
              </p>

              {!guide.required && <p className="muted env-optional">Optional integration</p>}

              <h4 className="env-subhead">Variables</h4>
              <ul className="env-var-list">
                {guide.vars.map((v) => (
                  <li key={v}>
                    <code className="inline-code">{v}</code>
                  </li>
                ))}
              </ul>

              <h4 className="env-subhead">Steps</h4>
              <ol className="env-steps">
                {guide.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>

              {guide.links.length > 0 && (
                <p className="env-links">
                  {guide.links.map((link) => (
                    <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  ))}
                </p>
              )}
            </section>
          );
        })}
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <h3>Local agents</h3>
        <p className="muted">
          <code className="inline-code">LOCAL_AGENT_CWD</code> sets the default repo path when listing and launching local
          agents via the SDK. Agents started in other folders won&apos;t appear unless this path matches their{" "}
          <code className="inline-code">cwd</code>.
        </p>
        {status?.localAgentCwd ? (
          <p>
            Current: <code className="inline-code">{status.localAgentCwd}</code>
            {!status.localAgentCwdFromEnv ? (
              <span className="muted"> (default — repo root; set LOCAL_AGENT_CWD to override)</span>
            ) : null}
          </p>
        ) : null}
        <p className="muted" style={{ marginBottom: 0 }}>
          {status?.cursor ? (
            <>
              <Link to="/agents">Open Agents →</Link> to launch cloud or local runs. Local agents also show on Pulse when
              active.
            </>
          ) : (
            <>Set <code className="inline-code">CURSOR_API_KEY</code> to enable the Agents tab.</>
          )}
        </p>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h3>All environment variables</h3>
        <div className="env-var-pills">
          {ALL_VARS.map((v) => (
            <code className="inline-code env-var-pill" key={v}>
              {v}
            </code>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
          See <code className="inline-code">.env.example</code> in the project root for a starter template.
        </p>
      </section>
    </>
  );
}
