import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { disconnectWebex, fetchWebexStatus, type EnvStatus } from "../api";
import { useEnvStatus } from "../context/EnvStatusContext";

type WebexStatusResponse = {
  enabled: boolean;
  configured: boolean;
  connected: boolean;
  email?: string;
  warning?: string;
  oauthRedirectBase?: string;
};

export function WebexConnectSection({ webexError }: { webexError: string | null }) {
  const { status: envStatus, refresh: refreshEnv } = useEnvStatus();
  const [webexStatus, setWebexStatus] = useState<WebexStatusResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const webex = envStatus?.webex;
  const showConnect = Boolean(webex?.enabled && webex?.configured);

  const load = useCallback(async () => {
    if (!showConnect) {
      setWebexStatus(null);
      return;
    }
    try {
      setWebexStatus(await fetchWebexStatus());
    } catch {
      setWebexStatus(null);
    }
  }, [showConnect]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDisconnect() {
    setBusy(true);
    try {
      await disconnectWebex();
      await load();
      await refreshEnv();
    } finally {
      setBusy(false);
    }
  }

  if (!webex && !webexError) return null;

  return (
    <>
      {webexError ? <div className="warnings">OAuth error: {webexError}</div> : null}

      <h4 className="env-subhead">Connect account</h4>

      {!showConnect ? (
        <p className="muted" style={{ marginBottom: 0 }}>
          Complete the steps above first. Meetings on Pulse appear after{" "}
          <code className="inline-code">WEBEX_ENABLED</code>, <code className="inline-code">WEBEX_CLIENT_ID</code>, and{" "}
          <code className="inline-code">WEBEX_CLIENT_SECRET</code> are set and the server is restarted.
        </p>
      ) : (
        <>
          <p className="muted">
            Create a Webex integration, add the redirect URI below, then sign in once. Refresh tokens keep access
            without re-copying a 12-hour personal token.
          </p>

          {webexStatus?.email ? <p className="muted">{webexStatus.email}</p> : null}
          {webexStatus?.warning ? <p className="muted">{webexStatus.warning}</p> : null}

          <h4 className="env-subhead">OAuth redirect URI</h4>
          <p className="muted">Add this exact URI in your Webex integration → Redirect URI(s):</p>
          <code className="inline-code">{webex?.oauthRedirectBase}/api/webex/auth/callback</code>

          <div className="mail-connect-row" style={{ marginTop: 14 }}>
            {!webex?.connected ? (
              <a className="button primary" href="/api/webex/auth">
                Connect Webex
              </a>
            ) : (
              <button type="button" onClick={() => void handleDisconnect()} disabled={busy}>
                {busy ? "Disconnecting…" : "Disconnect"}
              </button>
            )}
            {webex?.connected ? <Link to="/">Open Pulse →</Link> : null}
          </div>
        </>
      )}
    </>
  );
}

export function webexGuideBadge(status: EnvStatus | null) {
  if (!status?.webex) return null;
  if (status.webex.connected) {
    return <span className="env-badge ok">Signed in</span>;
  }
  if (status.webex.configured) {
    return <span className="env-badge missing">Not signed in</span>;
  }
  return <span className="env-badge missing">Not configured</span>;
}
