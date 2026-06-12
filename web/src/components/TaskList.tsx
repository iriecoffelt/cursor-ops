import type { TaskItem } from "../../server/types";
import { TaskQuickActions } from "./TaskQuickActions";
import {
  formatDueLabel,
  getTaskUrgencies,
  sortByDueDate,
  sortByUrgency,
  urgencyLabel,
  type TaskUrgency,
} from "../utils/taskUrgency";

export type TaskListFocusControls = {
  isPinned: (item: TaskItem) => boolean;
  onPin: (item: TaskItem) => void;
  onUnpin: (item: TaskItem) => void;
  canPinMore: boolean;
};

type TaskListProps = {
  items: TaskItem[];
  emptyLabel: string;
  sortByUrgency?: boolean;
  sortByDueDate?: boolean;
  focus?: TaskListFocusControls;
  quickActions?: boolean;
  onTaskUpdated?: () => void;
};

function urgencyClass(tags: TaskUrgency[]): string {
  if (tags.includes("blocked")) return "task-item-blocked";
  if (tags.includes("overdue")) return "task-item-overdue";
  if (tags.includes("due-today")) return "task-item-due-today";
  return "";
}

export function TaskList({
  items,
  emptyLabel,
  sortByUrgency: shouldSortByUrgency = false,
  sortByDueDate: shouldSortByDueDate = false,
  focus,
  quickActions = false,
  onTaskUpdated,
}: TaskListProps) {
  if (!items.length) return <p className="empty">{emptyLabel}</p>;

  let visible = items;
  if (shouldSortByDueDate) visible = sortByDueDate(items);
  else if (shouldSortByUrgency) visible = sortByUrgency(items);

  return (
    <ul className="task-list">
      {visible.map((item) => {
        const tags = getTaskUrgencies(item);
        const dueLabel = formatDueLabel(item.due);

        const pinned = focus?.isPinned(item) ?? false;

        return (
          <li
            key={`${item.source}-${item.sourceLabel ?? ""}-${item.id}`}
            className={tags.length ? urgencyClass(tags) : undefined}
          >
            <div className="task-row">
              {tags.length ? (
                <div className="task-badges">
                  {tags.map((tag) => (
                    <span key={tag} className={`urgency-badge urgency-${tag}`}>
                      {urgencyLabel(tag)}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="task-title-row">
                {focus ? (
                  <button
                    type="button"
                    className={`focus-pin-btn${pinned ? " is-pinned" : ""}`}
                    aria-label={pinned ? `Unpin ${item.title}` : `Pin ${item.title} to today's focus`}
                    title={
                      pinned
                        ? "Unpin from focus"
                        : focus.canPinMore
                          ? "Pin to today's focus"
                          : "Focus list is full (5 max)"
                    }
                    disabled={!pinned && !focus.canPinMore}
                    onClick={() => (pinned ? focus.onUnpin(item) : focus.onPin(item))}
                  >
                    {pinned ? "★" : "☆"}
                  </button>
                ) : null}
                <div className="task-title">
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {item.title}
                    </a>
                  ) : (
                    item.title
                  )}
                </div>
              </div>
            </div>
            <div className="task-meta">
              {item.source}
              {item.sourceLabel ? ` · ${item.sourceLabel}` : ""}
              {item.status ? ` · ${item.status}` : ""}
              {item.priority ? ` · ${item.priority}` : ""}
              {dueLabel ? (
                <>
                  {" · "}
                  <span className={tags.includes("overdue") || tags.includes("due-today") ? "task-due-emphasis" : undefined}>
                    {dueLabel}
                  </span>
                </>
              ) : null}
            </div>
            {quickActions && (item.source === "jira" || item.source === "notion") ? (
              <TaskQuickActions item={item} onUpdated={onTaskUpdated} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
