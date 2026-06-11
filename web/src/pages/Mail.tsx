import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchMailInbox, fetchMailStatus, type MailInboxResponse, type MailStatusResponse } from "../api";

const REFRESH_MS = 60_000;

export function MailPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<MailInboxResponse | null>(null);
  const [status, setStatus] = useState<MailStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const connected = searchParams.get("connected");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inbox, mailStatus] = await Promise.all([fetchMailInbox(), fetchMailStatus()]);
      setData(inbox);
      setStatus(mailStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mail");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!connected) return;
    searchParams.delete("connected");
    setSearchParams(searchParams, { replace: true });
  }, [connected, searchParams, setSearchParams]);

  const needsGoogleConnect = Boolean(
    status?.google.enabled && status.google.configured && !status.google.connected,
  );

  const warnings = [...new Set([...(data?.warnings ?? []), status?.google.warning].filter(Boolean))];

  return (
    <>
      <div className="page-header hero-header">
        <div>
          <p className="eyebrow">Inbox</p>
          <h2>Gmail</h2>
          {data && (
            <p className="muted">
              {data.unreadCount} unread
              {status?.google.connected ? ` · ${status.google.email ?? "Gmail"}` : ""}
              {" · "}
              Updated {new Date(data.fetchedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <button type="button" className={loading ? "is-loading" : undefined} onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {connected === "google" && (
        <div className="panel" style={{ marginBottom: 16, borderColor: "rgba(52, 211, 153, 0.35)" }}>
          <p className="muted" style={{ margin: 0 }}>
            Connected Gmail successfully.
          </p>
        </div>
      )}

      {error && <div className="warnings">{error}</div>}
      {warnings.map((w) => (
        <div className="warnings" key={w}>
          {w}
        </div>
      ))}

      {needsGoogleConnect ? (
        <section className="panel" style={{ marginBottom: 16 }}>
          <h3>Connect Gmail</h3>
          <p className="muted">Sign in once to read unread mail from your inbox.</p>
          <div className="mail-connect-row">
            <a className="button primary" href="/api/mail/auth/google">
              Connect Gmail
            </a>
            <Link to="/env">Mail settings →</Link>
          </div>
        </section>
      ) : null}

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <StatPanel label="Gmail unread" value={data?.unreadCount ?? 0} active={Boolean(status?.google.connected)} />
      </div>

      <section className="panel">
        <h3>Unread inbox ({data?.messages.length ?? 0})</h3>
        {!data?.messages.length ? (
          <p className="empty">No unread mail — or connect Gmail in Setup.</p>
        ) : (
          <ul className="mail-list">
            {data.messages.map((msg) => (
              <li key={msg.id} className="mail-item">
                <div className="mail-item-top">
                  <span className="badge mail-badge-google">Gmail</span>
                  <span className="mail-time">{new Date(msg.receivedAt).toLocaleString()}</span>
                </div>
                {msg.url ? (
                  <a href={msg.url} target="_blank" rel="noreferrer" className="mail-subject">
                    {msg.subject}
                  </a>
                ) : (
                  <div className="mail-subject">{msg.subject}</div>
                )}
                <div className="mail-from">{msg.from}</div>
                {msg.snippet ? <div className="mail-snippet">{msg.snippet}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function StatPanel({ label, value, active }: { label: string; value: number; active: boolean }) {
  return (
    <div className={`stat-card${active ? "" : " stat-card-muted"}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
