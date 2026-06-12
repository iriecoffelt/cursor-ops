import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJiraTasks, type TaskListResponse } from "../api";
import { TaskList } from "../components/TaskList";
import { getDueWithin7Days } from "../utils/taskUrgency";

const REFRESH_MS = 60_000;

export function JiraPage() {
  const [data, setData] = useState<TaskListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchJiraTasks());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Jira tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const dueWithin7Days = useMemo(() => getDueWithin7Days(data?.items ?? []), [data?.items]);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Jira</h2>
          {data && (
            <p className="muted">
              {data.items.length} assigned · Updated {new Date(data.fetchedAt).toLocaleTimeString()}
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

      <div className="grid-2">
        <section className="panel panel-critical">
          <h3>Blockers ({data?.blockers.length ?? 0})</h3>
          <TaskList
            items={data?.blockers ?? []}
            emptyLabel="No blockers"
            sortByDueDate
            quickActions
            onTaskUpdated={() => void load()}
          />
        </section>
        <section className="panel panel-warn">
          <h3>Due today / overdue ({data?.dueToday.length ?? 0})</h3>
          <TaskList
            items={data?.dueToday ?? []}
            emptyLabel="Nothing due"
            sortByDueDate
            quickActions
            onTaskUpdated={() => void load()}
          />
        </section>
        <section className="panel" style={{ gridColumn: "1 / -1" }}>
          <h3>Due within 7 days ({dueWithin7Days.length})</h3>
          <TaskList
            items={dueWithin7Days}
            emptyLabel="Nothing due this week"
            sortByDueDate
            quickActions
            onTaskUpdated={() => void load()}
          />
        </section>
        <section className="panel" style={{ gridColumn: "1 / -1" }}>
          <h3>All assigned ({data?.items.length ?? 0})</h3>
          <TaskList
            items={data?.items ?? []}
            emptyLabel="No Jira issues"
            sortByDueDate
            quickActions
            onTaskUpdated={() => void load()}
          />
        </section>
      </div>
    </>
  );
}
