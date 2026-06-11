import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { cancelRun } from "../api";

export function AgentDetailPage() {
  const { agentId = "" } = useParams();
  const [params] = useSearchParams();
  const runtime = params.get("runtime") ?? "cloud";
  const runId = params.get("runId");
  const [streamText, setStreamText] = useState("");
  const [status, setStatus] = useState<string>("connecting");
  const cursorUrl = `https://cursor.com/agents/${agentId}`;

  const streamUrl = useMemo(() => {
    if (!runId || runtime !== "cloud") return null;
    return `/api/agents/${agentId}/runs/${runId}/stream?runtime=cloud`;
  }, [agentId, runId, runtime]);

  useEffect(() => {
    if (!streamUrl) {
      setStatus("no stream");
      return;
    }

    const source = new EventSource(streamUrl);
    setStreamText("");
    setStatus("streaming");

    source.onmessage = (event) => {
      setStreamText((prev) => `${prev}${event.data}\n`);
    };

    source.onerror = () => {
      setStatus("stream ended");
      source.close();
    };

    return () => source.close();
  }, [streamUrl]);

  async function handleCancel() {
    if (!runId) return;
    await cancelRun(agentId, runId);
    setStatus("cancelled");
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{agentId}</h2>
          <p className="muted">{runtime} agent · {status}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {runId && runtime === "cloud" && (
            <button type="button" onClick={() => void handleCancel()}>Cancel run</button>
          )}
          <a className="button" href={cursorUrl} target="_blank" rel="noreferrer">Open in Cursor</a>
        </div>
      </div>

      <p className="muted">
        <Link to="/agents">← Back to agents</Link>
      </p>

      {runId ? (
        <section className="panel">
          <h3>Live output</h3>
          <div className="stream-box">{streamText || "Waiting for stream…"}</div>
        </section>
      ) : (
        <section className="panel">
          <p className="empty">No active run id. Open this agent in Cursor for full transcript and takeover.</p>
        </section>
      )}
    </>
  );
}
