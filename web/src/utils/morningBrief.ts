import type { AgentSummary, DashboardData, TaskItem } from "../../server/types";
import { formatDueLabel } from "./taskUrgency";

export type BriefFormat = "plain" | "slack" | "webex";

function formatDateHeading(date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function taskKey(item: TaskItem): string {
  return `${item.source}:${item.id}`;
}

/** Drop duplicate Jira/Notion items that share the same title. */
function dedupeCrossSource(items: TaskItem[]): TaskItem[] {
  const seen = new Set<string>();
  const seenTitles = new Set<string>();
  const out: TaskItem[] = [];

  for (const item of items) {
    const key = taskKey(item);
    if (seen.has(key)) continue;

    const titleKey = item.title.trim().toLowerCase();
    if (
      (item.source === "jira" || item.source === "notion") &&
      seenTitles.has(titleKey)
    ) {
      continue;
    }

    seen.add(key);
    if (item.source === "jira" || item.source === "notion") seenTitles.add(titleKey);
    out.push(item);
  }

  return out;
}

function githubItems(items: TaskItem[], status: string): TaskItem[] {
  return items.filter((item) => item.source === "github" && item.status === status);
}

function nonGithubWaiting(items: TaskItem[]): TaskItem[] {
  return items.filter((item) => item.source !== "github");
}

function formatMeta(item: TaskItem): string {
  const parts = [
    item.source,
    item.sourceLabel,
    item.status,
    item.priority,
    formatDueLabel(item.due),
  ].filter(Boolean);
  return parts.join(" · ");
}

function listPrefix(format: BriefFormat): string {
  return format === "webex" ? "- " : "• ";
}

function formatLine(text: string, url: string | undefined, format: BriefFormat): string {
  const prefix = listPrefix(format);
  if (!url) return `${prefix}${text}`;
  if (format === "slack") return `${prefix}<${url}|${text}>`;
  if (format === "webex") return `${prefix}[${text}](${url})`;
  return `• ${text}\n  ${url}`;
}

function formatTask(item: TaskItem, format: BriefFormat): string {
  const meta = formatMeta(item);
  const label = meta ? `${item.title} (${meta})` : item.title;
  return formatLine(label, item.url, format);
}

function formatAgent(agent: AgentSummary, format: BriefFormat): string {
  const label = `${agent.name} (${agent.runtime} · ${agent.status})`;
  return formatLine(label, agent.cursorUrl, format);
}

function boldLabel(label: string, format: BriefFormat): string {
  if (format === "plain") return label.toUpperCase();
  if (format === "webex") return `**${label}**`;
  return `*${label}*`;
}

function sectionHeader(title: string, count: number | undefined, format: BriefFormat): string {
  const label = count === undefined ? title : `${title} (${count})`;
  return boldLabel(label, format);
}

function joinSections(sections: string[]): string {
  return sections.filter(Boolean).join("\n\n");
}

export function formatMorningBrief(data: DashboardData, format: BriefFormat = "plain"): string {
  const blockers = dedupeCrossSource(data.blockers);
  const dueToday = dedupeCrossSource(data.dueToday);
  const reviewRequested = githubItems(data.waitingOnMe, "Review requested");
  const assignedIssues = githubItems(data.waitingOnMe, "Assigned issue");
  const myOpenPRs = githubItems(data.waitingOnMe, "My open PR");
  const otherWaiting = nonGithubWaiting(data.waitingOnMe);

  const actionItems = dedupeCrossSource([...otherWaiting, ...reviewRequested, ...assignedIssues]);
  const agents = data.agents;

  const dateHeading = formatDateHeading(new Date(data.fetchedAt));
  const heading = boldLabel(`Morning brief — ${dateHeading}`, format);

  const sections: string[] = [heading];

  if (blockers.length) {
    sections.push(
      [
        sectionHeader("Blockers", blockers.length, format),
        ...blockers.map((item) => formatTask(item, format)),
      ].join("\n"),
    );
  }

  if (dueToday.length) {
    sections.push(
      [
        sectionHeader("Due today / overdue", dueToday.length, format),
        ...dueToday.map((item) => formatTask(item, format)),
      ].join("\n"),
    );
  }

  if (actionItems.length) {
    sections.push(
      [
        sectionHeader("Action needed", actionItems.length, format),
        ...actionItems.map((item) => formatTask(item, format)),
      ].join("\n"),
    );
  }

  const agentLines: string[] = [];
  if (agents.length) {
    agentLines.push(boldLabel(`Running agents (${agents.length})`, format));
    agentLines.push(...agents.map((agent) => formatAgent(agent, format)));
  }
  if (myOpenPRs.length) {
    if (agentLines.length) agentLines.push("");
    agentLines.push(boldLabel(`My open PRs (${myOpenPRs.length})`, format));
    agentLines.push(...myOpenPRs.map((item) => formatTask(item, format)));
  }
  if (agentLines.length) {
    sections.push([sectionHeader("Agents & open PRs", undefined, format), ...agentLines].join("\n"));
  }

  if (sections.length === 1) {
    sections.push(
      format === "slack"
        ? "_All clear — nothing on your radar._"
        : format === "webex"
          ? "_All clear — nothing on your radar._"
          : "All clear — nothing on your radar.",
    );
  }

  return joinSections(sections);
}

export function hasBriefContent(data: DashboardData): boolean {
  return (
    data.blockers.length > 0 ||
    data.dueToday.length > 0 ||
    data.waitingOnMe.length > 0 ||
    data.agents.length > 0
  );
}
