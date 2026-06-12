import { useMemo, useState } from "react";
import type { DashboardData } from "../api";
import { formatMorningBrief, hasBriefContent, type BriefFormat } from "../utils/morningBrief";

type MorningBriefPanelProps = {
  data: DashboardData | null;
  loading?: boolean;
};

export function MorningBriefPanel({ data, loading }: MorningBriefPanelProps) {
  const [format, setFormat] = useState<BriefFormat>("plain");
  const [copied, setCopied] = useState(false);

  const brief = useMemo(() => (data ? formatMorningBrief(data, format) : ""), [data, format]);

  async function handleCopy() {
    if (!brief) return;
    await navigator.clipboard.writeText(brief);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (!data && loading) {
    return (
      <section className="panel morning-brief-panel">
        <div className="morning-brief-header">
          <div>
            <h3>Morning brief</h3>
            <p className="muted">Loading your standup summary…</p>
          </div>
        </div>
      </section>
    );
  }

  if (!data) return null;

  const empty = !hasBriefContent(data);

  return (
    <section className="panel morning-brief-panel">
      <div className="morning-brief-header">
        <div>
          <h3>Morning brief</h3>
          <p className="muted">
            Blockers → due today → action needed → agents & PRs.{" "}
            {empty
              ? "Nothing urgent right now."
              : "Copy and paste into Slack or Webex (enable Markdown with Ctrl+M / the M toggle)."}
          </p>
        </div>
        <div className="morning-brief-actions">
          <div className="format-toggle" role="group" aria-label="Brief format">
            <button
              type="button"
              className={format === "plain" ? "is-active" : undefined}
              onClick={() => setFormat("plain")}
            >
              Plain
            </button>
            <button
              type="button"
              className={format === "slack" ? "is-active" : undefined}
              onClick={() => setFormat("slack")}
            >
              Slack
            </button>
            <button
              type="button"
              className={format === "webex" ? "is-active" : undefined}
              onClick={() => setFormat("webex")}
            >
              Webex
            </button>
          </div>
          <button type="button" className="primary" onClick={() => void handleCopy()} disabled={!brief}>
            {copied ? "Copied!" : "Copy standup"}
          </button>
        </div>
      </div>
      <pre className="morning-brief-preview">{brief}</pre>
    </section>
  );
}
