import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDashboard, type DashboardData } from "../api";
import { BarChart } from "../components/BarChart";
import { StackedBoardChart } from "../components/StackedBoardChart";
import { FocusListPanel } from "../components/FocusListPanel";
import { MeetingsTodayPanel } from "../components/MeetingsTodayPanel";
import { MorningBriefPanel } from "../components/MorningBriefPanel";
import { StatCard } from "../components/StatCard";
import { TaskList, type TaskListFocusControls } from "../components/TaskList";
import { useEnvStatus } from "../context/EnvStatusContext";
import { useFocusList } from "../hooks/useFocusList";
import { formatStartsIn } from "../utils/meetings";

const REFRESH_MS = 60_000;

export function DashboardPage() {
  const { status } = useEnvStatus();
  const focusList = useFocusList();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pulse");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const t = data?.totals;
  const openWorkSources = [
    status?.jira && "Jira",
    status?.notion && "Notion",
    status?.github && "GitHub",
  ]
    .filter(Boolean)
    .join(" + ");

  const focus: TaskListFocusControls = {
    isPinned: focusList.isPinned,
    onPin: focusList.pin,
    onUnpin: focusList.unpin,
    canPinMore: focusList.canPinMore,
  };

  const taskListProps = {
    quickActions: true,
    onTaskUpdated: () => void load(),
  };

  const nextMeeting = data?.webex?.nextMeeting;
  const nextMeetingHint = nextMeeting
    ? nextMeeting.title.length > 42
      ? `${nextMeeting.title.slice(0, 42)}…`
      : nextMeeting.title
    : data?.webex
      ? "No more meetings today"
      : undefined;

  return (
    <>
      <div className="page-header hero-header">
        <div>
          <p className="eyebrow">Live dashboard</p>
          <h2>Workload pulse</h2>
          {data && (
            <p className="muted">
              Updated {new Date(data.fetchedAt).toLocaleTimeString()}
              {(t?.activeAgents ?? 0) > 0 ? (
                <>
                  {" "}
                  · <span className="live-dot">{t?.activeAgents} agent{t?.activeAgents === 1 ? "" : "s"} running</span>
                </>
              ) : null}
            </p>
          )}
        </div>
        <button type="button" className={loading ? "is-loading" : undefined} onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && <div className="warnings">{error}</div>}

      <MorningBriefPanel data={data} loading={loading} />

      <FocusListPanel data={data} focus={focusList} onTaskUpdated={() => void load()} />

      <div className="pulse-metrics-row">
        <div className="stat-grid">
        <StatCard
          label="Open work"
          value={t?.open ?? 0}
          hint={openWorkSources || "Configure integrations in Setup"}
          delay={0}
        />
        {status?.jira ? (
          <StatCard label="Jira" value={t?.jira ?? 0} hint={<Link to="/jira">View all →</Link>} delay={1} />
        ) : null}
        {status?.notion ? (
          <StatCard label="Notion" value={t?.notion ?? 0} hint={<Link to="/notion">View all →</Link>} delay={2} />
        ) : null}
        {status?.github ? (
          <StatCard label="GitHub" value={t?.github ?? 0} hint={<Link to="/github">View all →</Link>} delay={3} />
        ) : null}
        {status?.mail?.showTab ? (
          <StatCard
            label="Gmail unread"
            value={t?.gmailUnread ?? 0}
            hint={<Link to="/mail">Open inbox →</Link>}
            variant={(t?.gmailUnread ?? 0) > 0 ? "warn" : "default"}
            delay={4}
          />
        ) : null}
        {status?.webex?.showOnPulse ? (
          <StatCard
            label="Next meeting"
            value={
              nextMeeting
                ? formatStartsIn(nextMeeting.startsInMinutes, nextMeeting.inProgress)
                : "—"
            }
            hint={nextMeetingHint}
            variant={nextMeeting?.inProgress ? "warn" : "default"}
            delay={5}
          />
        ) : null}
        {status?.cursor ? (
          <StatCard
            label="Active agents"
            value={t?.activeAgents ?? 0}
            hint={<Link to="/agents">Manage →</Link>}
            delay={6}
          />
        ) : null}
        <StatCard
          label="Blockers"
          value={t?.blockers ?? 0}
          variant={(t?.blockers ?? 0) > 0 ? "danger" : "default"}
          delay={7}
        />
        <StatCard
          label="Due / overdue"
          value={t?.dueToday ?? 0}
          variant={(t?.dueToday ?? 0) > 0 ? "warn" : "default"}
          delay={8}
        />
        {status?.jira || status?.notion ? (
          <StatCard
            label="Due this week"
            value={t?.dueThisWeek ?? 0}
            hint="Next 7 days · Jira + Notion"
            delay={9}
          />
        ) : null}
        </div>

        {status?.webex?.showOnPulse ? (
          <MeetingsTodayPanel webex={data?.webex} dueTodayCount={t?.dueToday ?? 0} />
        ) : null}
      </div>

      {(data?.blockers.length ?? 0) > 0 || (data?.dueToday.length ?? 0) > 0 ? (
        <section className="attention-section animate-in" style={{ marginTop: 16 }}>
          <div className="attention-section-inner">
            <div className="attention-header">
              <h3>Needs attention</h3>
              <p className="muted">Blocked and due or overdue work across your sources</p>
            </div>
            <div className="grid-2">
              {(data?.blockers.length ?? 0) > 0 ? (
                <section className="panel panel-critical panel-glow-danger">
                  <h3>Blockers ({data?.blockers.length ?? 0})</h3>
                  <TaskList items={data?.blockers ?? []} emptyLabel="No blockers" focus={focus} {...taskListProps} />
                </section>
              ) : null}
              {(data?.dueToday.length ?? 0) > 0 ? (
                <section className="panel panel-warn panel-glow-warn">
                  <h3>Due today / overdue ({data?.dueToday.length ?? 0})</h3>
                  <TaskList items={data?.dueToday ?? []} emptyLabel="Nothing due" focus={focus} {...taskListProps} />
                </section>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {status?.jira || status?.notion ? (
        <section className="panel panel-week" style={{ marginTop: 16 }}>
          <h3>Due this week ({data?.dueThisWeek.length ?? 0})</h3>
          <p className="muted" style={{ marginTop: -4, marginBottom: 12 }}>
            Jira & Notion due in the next 7 days — not today or overdue
          </p>
          <TaskList
            items={data?.dueThisWeek ?? []}
            emptyLabel="Nothing due this week"
            sortByDueDate
            focus={focus}
            {...taskListProps}
          />
        </section>
      ) : null}

      <div className="grid-2" style={{ marginTop: 16 }}>
        {status?.jira ? (
          <section className="panel">
            <h3>Jira by status</h3>
            <BarChart data={data?.jira.byStatus ?? {}} emptyLabel="No Jira data" />
            <p className="muted" style={{ marginTop: 12 }}>
              <Link to="/jira">Open Jira tasks →</Link>
            </p>
          </section>
        ) : null}
        {status?.notion ? (
          <section className="panel">
            <h3>Notion by status</h3>
            <BarChart data={data?.notion.byStatus ?? {}} emptyLabel="No Notion data" />
            <p className="muted" style={{ marginTop: 12 }}>
              <Link to="/notion">Open Notion tasks →</Link>
            </p>
          </section>
        ) : null}
        {status?.github ? (
          <section className="panel">
            <h3>GitHub by type</h3>
            <BarChart
              data={{
                "Review requested": data?.github.byStatus["Review requested"] ?? 0,
                "My open PR": data?.github.byStatus["My open PR"] ?? 0,
                "Assigned issue": data?.github.byStatus["Assigned issue"] ?? 0,
              }}
              emptyLabel="No GitHub data"
            />
            <p className="muted" style={{ marginTop: 12 }}>
              <Link to="/github">Open GitHub →</Link>
            </p>
          </section>
        ) : null}
      </div>

      {status?.notion && Object.keys(data?.notion.byBoardStatus ?? {}).length > 0 && (
        <section className="panel" style={{ marginTop: 16 }}>
          <h3>Notion by board</h3>
          <StackedBoardChart data={data?.notion.byBoardStatus ?? {}} />
        </section>
      )}

      <div className={status?.cursor ? "grid-2" : undefined} style={{ marginTop: 16 }}>
        <section className="panel">
          <h3>Waiting on me</h3>
          <TaskList items={data?.waitingOnMe ?? []} emptyLabel="Nothing waiting" focus={focus} {...taskListProps} />
        </section>
        {status?.cursor ? (
          <section className="panel">
            <h3>Running agents</h3>
            {!data?.agents.length ? (
              <p className="empty">No active agents</p>
            ) : (
              <ul className="task-list">
                {data.agents.map((agent) => (
                  <li key={agent.id}>
                    <Link to={`/agents/${agent.id}?runtime=${agent.runtime}`}>{agent.name}</Link>
                    <div className="task-meta">
                      <span className={`badge ${agent.runtime}`}>{agent.runtime}</span> · {agent.status}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>

      {data?.warnings.length ? (
        <div className="warnings warnings-bottom">
          <strong>Configuration notes</strong>
          <ul>
            {data.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
            <Link to="/env">View setup guide →</Link>
          </p>
        </div>
      ) : null}
    </>
  );
}
