import type { TaskItem } from "../../server/types";
import {
  formatDueLabel,
  getTaskUrgencies,
  sortByUrgency,
  urgencyLabel,
  type TaskUrgency,
} from "../utils/taskUrgency";

type TaskListProps = {
  items: TaskItem[];
  emptyLabel: string;
  sortByUrgency?: boolean;
};

function urgencyClass(tags: TaskUrgency[]): string {
  if (tags.includes("blocked")) return "task-item-blocked";
  if (tags.includes("overdue")) return "task-item-overdue";
  if (tags.includes("due-today")) return "task-item-due-today";
  return "";
}

export function TaskList({ items, emptyLabel, sortByUrgency: shouldSort = false }: TaskListProps) {
  if (!items.length) return <p className="empty">{emptyLabel}</p>;

  const visible = shouldSort ? sortByUrgency(items) : items;

  return (
    <ul className="task-list">
      {visible.map((item) => {
        const tags = getTaskUrgencies(item);
        const dueLabel = formatDueLabel(item.due);

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
          </li>
        );
      })}
    </ul>
  );
}
