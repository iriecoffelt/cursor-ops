import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { disconnectMailProvider, fetchMailStatus, type MailStatusResponse, type EnvStatus } from "../api";
import { useEnvStatus } from "../context/EnvStatusContext";

export function GmailConnectSection({ mailError }: { mailError: string | null }) {
  const { status: envStatus, refresh: refreshEnv } = useEnvStatus();
  const [mailStatus, setMailStatus] = useState<MailStatusResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const mail = envStatus?.mail;
  const showConnect = Boolean(mail?.showTab);

  const load = useCallback(async () => {
    if (!showConnect) {
      setMailStatus(null);
      return;
    }
    try {
      setMailStatus(await fetchMailStatus());
    } catch {
      setMailStatus(null);
    }
  }, [showConnect]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDisconnect() {
    setBusy(true);
    try {
      await disconnectMailProvider();
      await load();
      await refreshEnv();
    } finally {
      setBusy(false);
    }
  }

  if (!mail && !mailError) return null;

  return (
    <>
      {mailError ? <div className="warnings">OAuth error: {mailError}</div> : null}

      <h4 className="env-subhead">Connect account</h4>

      {!showConnect ? (
        <p className="muted" style={{ marginBottom: 0 }}>
          Complete the steps above first. The Mail tab appears after{" "}
          <code className="inline-code">MAIL_GOOGLE_ENABLED</code>, <code className="inline-code">GOOGLE_CLIENT_ID</code>
          , and <code className="inline-code">GOOGLE_CLIENT_SECRET</code> are set and the server is restarted.
        </p>
      ) : (
        <>
          <p className="muted">
            OAuth credentials are in <code className="inline-code">.env</code>. Sign in once to read unread mail.
          </p>

          {mailStatus?.google.email ? <p className="muted">{mailStatus.google.email}</p> : null}
          {mailStatus?.google.warning ? <p className="muted">{mailStatus.google.warning}</p> : null}

          <h4 className="env-subhead">OAuth redirect URI</h4>
          <p className="muted">Add this exact URI in Google Cloud Console → OAuth client → Authorized redirect URIs:</p>
          <code className="inline-code">{mail?.oauthRedirectBase}/api/mail/auth/google/callback</code>

          <div className="mail-connect-row" style={{ marginTop: 14 }}>
            {!mail?.googleConnected ? (
              <a className="button primary" href="/api/mail/auth/google">
                Connect Gmail
              </a>
            ) : (
              <button type="button" onClick={() => void handleDisconnect()} disabled={busy}>
                {busy ? "Disconnecting…" : "Disconnect"}
              </button>
            )}
            {mail?.googleConnected ? <Link to="/mail">Open Mail →</Link> : null}
          </div>
        </>
      )}
    </>
  );
}

export function gmailGuideBadge(status: EnvStatus | null) {
  if (!status?.mail) return null;
  if (status.mail.googleConnected) {
    return <span className="env-badge ok">Signed in</span>;
  }
  if (status.mail.showTab) {
    return <span className="env-badge missing">Not signed in</span>;
  }
  return <span className="env-badge missing">Not configured</span>;
}
