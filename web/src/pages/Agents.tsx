import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createAgent, fetchAgents, type AgentListItem } from "../api";

export function AgentsPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [runtime, setRuntime] = useState<"cloud" | "local">("cloud");
  const [repoUrl, setRepoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchAgents();
      setAgents(data.agents);
      setWarnings(data.warnings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createAgent({
        prompt: prompt.trim(),
        runtime,
        repoUrl: repoUrl.trim() || undefined,
      });
      setPrompt("");
      await load();
      if (result.runId) {
        navigate(`/agents/${result.agentId}?runtime=${result.runtime}&runId=${result.runId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h2>Agents</h2>
        <button type="button" onClick={() => void load()}>Refresh list</button>
      </div>

      <form className="composer panel" onSubmit={(e) => void handleCreate(e)}>
        <h3 style={{ margin: 0 }}>Launch agent</h3>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What should the agent do?"
        />
        <div className="composer-row">
          <select value={runtime} onChange={(e) => setRuntime(e.target.value as "cloud" | "local")}>
            <option value="cloud">Cloud</option>
            <option value="local">Local</option>
          </select>
          {runtime === "cloud" && (
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="GitHub repo URL (optional)"
              style={{ flex: 1, minWidth: 220, padding: "8px 10px", borderRadius: 8, border: "1px solid #333944", background: "#0f1115", color: "#e8eaed" }}
            />
          )}
          <button type="submit" className="primary" disabled={busy || !prompt.trim()}>
            {busy ? "Starting…" : "Run"}
          </button>
        </div>
      </form>

      {error && <div className="warnings">{error}</div>}
      {warnings.length ? (
        <div className="warnings">
          <ul>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      ) : null}

      <section className="panel">
        <table className="agent-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Runtime</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty">No agents yet</td>
              </tr>
            ) : (
              agents.map((agent) => (
                <tr key={agent.id}>
                  <td>{agent.name}</td>
                  <td><span className={`badge ${agent.runtime}`}>{agent.runtime}</span></td>
                  <td>{agent.status}</td>
                  <td>
                    <Link to={`/agents/${agent.id}?runtime=${agent.runtime}`}>View</Link>
                    {" · "}
                    <a href={agent.cursorUrl} target="_blank" rel="noreferrer">Open in Cursor</a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
