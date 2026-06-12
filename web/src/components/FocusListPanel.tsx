import { useMemo } from "react";
import type { DashboardData } from "../api";
import type { FocusListControls } from "../hooks/useFocusList";
import {
  collectDashboardTasks,
  mergePinWithTask,
  resolveFocusPins,
  taskPinKey,
} from "../utils/focusList";
import { TaskQuickActions } from "./TaskQuickActions";
import { formatDueLabel } from "../utils/taskUrgency";

type FocusListPanelProps = {
  data: DashboardData | null;
  focus: FocusListControls;
  onTaskUpdated?: () => void;
};

export function FocusListPanel({ data, focus, onTaskUpdated }: FocusListPanelProps) {
  const entries = useMemo(() => {
    if (!data) return [];
    const liveTasks = collectDashboardTasks(data);
    return resolveFocusPins(focus.pins, liveTasks);
  }, [data, focus.pins]);

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <section className="panel focus-list-panel">
      <div className="focus-list-header">
        <div>
          <h3>Today&apos;s focus</h3>
          <p className="muted">
            {todayLabel} · Pin up to {focus.max} items you&apos;re committing to today
          </p>
        </div>
        <span className="focus-count">
          {focus.pins.length}/{focus.max}
        </span>
      </div>

      {!entries.length ? (
        <p className="empty focus-empty">
          Nothing pinned yet — use the pin icon on blockers, due items, or waiting-on-you tasks below.
        </p>
      ) : (
        <ol className="focus-list">
          {entries.map(({ pin, live, missing }, index) => {
            const item = mergePinWithTask(pin, live);
            const dueLabel = formatDueLabel(item.due);

            return (
              <li key={taskPinKey(pin)} className={missing ? "focus-item-missing" : undefined}>
                <span className="focus-rank" aria-hidden="true">
                  {index + 1}
                </span>
                <div className="focus-item-body">
                  <div className="focus-item-title">
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noreferrer">
                        {item.title}
                      </a>
                    ) : (
                      item.title
                    )}
                  </div>
                  <div className="task-meta">
                    {item.source}
                    {item.sourceLabel ? ` · ${item.sourceLabel}` : ""}
                    {item.status ? ` · ${item.status}` : ""}
                    {dueLabel ? ` · ${dueLabel}` : ""}
                    {missing ? " · No longer on Pulse" : ""}
                  </div>
                  {item.source === "jira" || item.source === "notion" ? (
                    <TaskQuickActions item={item} onUpdated={onTaskUpdated} />
                  ) : null}
                </div>
                <button
                  type="button"
                  className="focus-pin-btn is-pinned"
                  aria-label={`Unpin ${item.title}`}
                  title="Unpin"
                  onClick={() => focus.unpin(pin)}
                >
                  ★
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
