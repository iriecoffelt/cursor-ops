import type { TaskItem } from "../../server/types";

export type TaskUrgency = "blocked" | "overdue" | "due-today";

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function isBlocked(item: TaskItem): boolean {
  return (
    item.status?.toLowerCase().includes("block") === true ||
    item.priority?.toLowerCase() === "highest"
  );
}

export function isDueToday(due?: string): boolean {
  if (!due) return false;
  const d = parseLocalDate(due);
  const today = startOfToday();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export function isOverdue(due?: string): boolean {
  if (!due) return false;
  return parseLocalDate(due) < startOfToday();
}

export function getTaskUrgencies(item: TaskItem): TaskUrgency[] {
  const tags: TaskUrgency[] = [];
  if (isBlocked(item)) tags.push("blocked");
  if (isOverdue(item.due)) tags.push("overdue");
  else if (isDueToday(item.due)) tags.push("due-today");
  return tags;
}

export function urgencyScore(item: TaskItem): number {
  let score = 0;
  if (isBlocked(item)) score += 100;
  if (isOverdue(item.due)) score += 50;
  else if (isDueToday(item.due)) score += 25;
  return score;
}

export function sortByUrgency(items: TaskItem[]): TaskItem[] {
  return [...items].sort((a, b) => urgencyScore(b) - urgencyScore(a));
}

function formatShortDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDueLabel(due?: string): string | null {
  if (!due) return null;
  if (isOverdue(due)) return `Overdue · ${formatShortDate(due)}`;
  if (isDueToday(due)) return "Due today";
  return `Due ${formatShortDate(due)}`;
}

export function urgencyLabel(tag: TaskUrgency): string {
  if (tag === "blocked") return "Blocked";
  if (tag === "overdue") return "Overdue";
  return "Due today";
}
