import { useCallback, useEffect, useState } from "react";
import { fetchGitHubTasks, type GitHubTaskResponse } from "../api";
import { BarChart } from "../components/BarChart";
import { TaskList } from "../components/TaskList";

const REFRESH_MS = 60_000;

export function GitHubPage() {
  const [data, setData] = useState<GitHubTaskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchGitHubTasks());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load GitHub items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>GitHub</h2>
          {data && (
            <p className="muted">
              {data.items.length} open · Updated {new Date(data.fetchedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <button type="button" className={loading ? "is-loading" : undefined} onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && <div className="warnings">{error}</div>}
      {data?.warnings.map((w) => (
        <div className="warnings" key={w}>{w}</div>
      ))}

      <section className="panel">
        <h3>By category</h3>
        <BarChart data={data?.byCategory ?? {}} emptyLabel="No GitHub data — add GITHUB_TOKEN in .env" />
      </section>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <section className="panel">
          <h3>Reviews requested ({data?.reviewRequested.length ?? 0})</h3>
          <TaskList items={data?.reviewRequested ?? []} emptyLabel="No PRs waiting on your review" />
        </section>
        <section className="panel">
          <h3>My open PRs ({data?.myOpenPRs.length ?? 0})</h3>
          <TaskList items={data?.myOpenPRs ?? []} emptyLabel="No open PRs authored by you" />
        </section>
        <section className="panel" style={{ gridColumn: "1 / -1" }}>
          <h3>Assigned issues ({data?.assignedIssues.length ?? 0})</h3>
          <TaskList items={data?.assignedIssues ?? []} emptyLabel="No assigned issues" />
        </section>
      </div>
    </>
  );
}
