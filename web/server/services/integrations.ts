import type { SourceStats, TaskItem } from "./types.js";

function authHeader(email: string, token: string) {
  return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
}

const NOTION_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
});

/** Parse comma-separated IDs; supports optional `Label|uuid` entries. */
export function parseNotionDatabaseIds(): string[] {
  const raw =
    process.env.NOTION_TASKS_DB_IDS?.trim() ||
    process.env.NOTION_TASKS_DB_ID?.trim() ||
    "";

  if (!raw) return [];

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const pipe = entry.lastIndexOf("|");
      const id = pipe >= 0 ? entry.slice(pipe + 1).trim() : entry;
      return normalizeNotionId(id);
    })
    .filter(Boolean);
}

/** Optional explicit labels: `Sprint 12|uuid,Backlog|uuid` */
export function parseNotionDatabaseLabels(): Map<string, string> {
  const raw =
    process.env.NOTION_TASKS_DB_IDS?.trim() ||
    process.env.NOTION_TASKS_DB_ID?.trim() ||
    "";
  const labels = new Map<string, string>();

  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    const pipe = trimmed.lastIndexOf("|");
    if (pipe >= 0) {
      const label = trimmed.slice(0, pipe).trim();
      const id = normalizeNotionId(trimmed.slice(pipe + 1).trim());
      if (label && id) labels.set(id, label);
    }
  }

  return labels;
}

function normalizeNotionId(id: string): string {
  const compact = id.replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/i.test(compact)) return id;
  return compact;
}

function extractNotionTitle(properties?: Record<string, unknown>): string | undefined {
  const candidates = ["Name", "Title", "Task", "Tasks", "Idea"];
  for (const key of candidates) {
    const prop = properties?.[key];
    if (prop && typeof prop === "object" && prop !== null && "title" in prop) {
      const titles = (prop as { title?: Array<{ plain_text?: string }> }).title;
      const text = titles?.[0]?.plain_text;
      if (text) return text;
    }
  }

  for (const prop of Object.values(properties ?? {})) {
    if (prop && typeof prop === "object" && prop !== null && "title" in prop) {
      const titles = (prop as { title?: Array<{ plain_text?: string }> }).title;
      const text = titles?.[0]?.plain_text;
      if (text) return text;
    }
  }

  return undefined;
}

function extractNotionStatus(properties?: Record<string, unknown>): string | undefined {
  for (const key of ["Status", "State", "Done"]) {
    const prop = properties?.[key];
    if (!prop || typeof prop !== "object") continue;
    if ("status" in prop) {
      const name = (prop as { status?: { name?: string } }).status?.name;
      if (name) return name;
    }
    if ("select" in prop) {
      const name = (prop as { select?: { name?: string } }).select?.name;
      if (name) return name;
    }
    if ("checkbox" in prop) {
      const checked = (prop as { checkbox?: boolean }).checkbox;
      return checked ? "Done" : "Open";
    }
  }
  return undefined;
}

function extractNotionDue(properties?: Record<string, unknown>): string | undefined {
  for (const key of ["Due", "Due date", "Due Date", "Date", "Deadline"]) {
    const prop = properties?.[key];
    if (prop && typeof prop === "object" && prop !== null && "date" in prop) {
      const date = (prop as { date?: { start?: string } }).date?.start;
      if (date) return date.slice(0, 10);
    }
  }
  return undefined;
}

function isDoneStatus(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return (
    s.includes("done") ||
    s.includes("complete") ||
    s.includes("closed") ||
    s.includes("resolved") ||
    s.includes("cancelled") ||
    s.includes("canceled") ||
    s.includes("won't do") ||
    s.includes("wont do")
  );
}

export function filterOpenTasks(items: TaskItem[]): TaskItem[] {
  return items.filter((item) => !isDoneStatus(item.status));
}

async function fetchNotionDatabaseTitle(token: string, dbId: string): Promise<string> {
  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
    headers: NOTION_HEADERS(token),
  });
  if (!res.ok) return dbId.slice(0, 8);

  const data = (await res.json()) as {
    title?: Array<{ plain_text?: string }>;
  };
  return data.title?.[0]?.plain_text ?? dbId.slice(0, 8);
}

async function findChildDatabaseIds(token: string, blockId: string): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${blockId}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);

    const res = await fetch(url, { headers: NOTION_HEADERS(token) });
    if (!res.ok) break;

    const data = (await res.json()) as {
      results?: Array<{ id: string; type?: string; has_children?: boolean }>;
      has_more?: boolean;
      next_cursor?: string;
    };

    for (const block of data.results ?? []) {
      if (block.type === "child_database") ids.push(block.id);
      if (block.has_children) {
        ids.push(...(await findChildDatabaseIds(token, block.id)));
      }
    }

    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return ids;
}

async function queryNotionDatabase(
  token: string,
  dbId: string,
  sourceLabel: string,
): Promise<{ items: TaskItem[]; warning?: string }> {
  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: "POST",
    headers: NOTION_HEADERS(token),
    body: JSON.stringify({ page_size: 50 }),
  });

  if (!res.ok) {
    const body = await res.text();
    const isPageId =
      (res.status === 400 && body.includes("is a page, not a database")) || res.status === 404;
    if (isPageId) {
      const childDbIds = await findChildDatabaseIds(token, dbId);
      if (!childDbIds.length) {
        return {
          items: [],
          warning: `Notion ${sourceLabel}: page has no embedded databases — open the task table as full page and use that ID`,
        };
      }

      const nested: TaskItem[] = [];
      const nestedWarnings: string[] = [];
      for (const childId of childDbIds) {
        const sub = await queryNotionDatabase(token, childId, sourceLabel);
        nested.push(...sub.items);
        if (sub.warning) nestedWarnings.push(sub.warning);
      }
      return { items: nested, warning: nestedWarnings[0] };
    }

    return {
      items: [],
      warning: `Notion database ${sourceLabel} (${dbId.slice(0, 8)}…): ${res.status} ${body.slice(0, 120)}`,
    };
  }

  const data = (await res.json()) as {
    results?: Array<{
      id: string;
      url?: string;
      properties?: Record<string, unknown>;
    }>;
  };

  const items: TaskItem[] = [];

  for (const page of data.results ?? []) {
    const status = extractNotionStatus(page.properties);
    if (isDoneStatus(status)) continue;

    items.push({
      id: page.id,
      title: extractNotionTitle(page.properties) ?? page.id,
      source: "notion",
      sourceLabel,
      status,
      due: extractNotionDue(page.properties),
      url: page.url,
    });
  }

  return { items };
}

export async function fetchJiraTasks(): Promise<{ items: TaskItem[]; warning?: string }> {
  const base = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!base || !email || !token) {
    return { items: [], warning: "Jira not configured (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN)" };
  }

  const jql = "assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC";
  const url = `${base.replace(/\/$/, "")}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=50&fields=summary,status,priority,duedate`;

  const res = await fetch(url, {
    headers: {
      Authorization: authHeader(email, token),
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    return { items: [], warning: `Jira API error: ${res.status} ${res.statusText}` };
  }

  const data = (await res.json()) as {
    issues?: Array<{
      key: string;
      fields?: {
        summary?: string;
        status?: { name?: string };
        priority?: { name?: string };
        duedate?: string;
      };
    }>;
  };

  const items = filterOpenTasks(
    (data.issues ?? []).map((issue) => ({
      id: issue.key,
      title: issue.fields?.summary ?? issue.key,
      source: "jira" as const,
      status: issue.fields?.status?.name,
      priority: issue.fields?.priority?.name,
      due: issue.fields?.duedate,
      url: `${base.replace(/\/$/, "")}/browse/${issue.key}`,
    })),
  );

  return { items };
}

export async function fetchNotionTasks(): Promise<{ items: TaskItem[]; warnings: string[] }> {
  const token = process.env.NOTION_TOKEN;
  const dbIds = parseNotionDatabaseIds();

  if (!token) {
    return { items: [], warnings: ["Notion not configured (NOTION_TOKEN)"] };
  }

  if (!dbIds.length) {
    return {
      items: [],
      warnings: ["Notion not configured (NOTION_TASKS_DB_IDS — comma-separated database IDs)"],
    };
  }

  const explicitLabels = parseNotionDatabaseLabels();
  const warnings: string[] = [];

  const results = await Promise.all(
    dbIds.map(async (dbId) => {
      const sourceLabel =
        explicitLabels.get(dbId) ??
        explicitLabels.get(normalizeNotionId(dbId)) ??
        (await fetchNotionDatabaseTitle(token, dbId));
      return queryNotionDatabase(token, dbId, sourceLabel);
    }),
  );

  const seen = new Set<string>();
  const items: TaskItem[] = [];

  for (const result of results) {
    if (result.warning) warnings.push(result.warning);
    for (const item of result.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }

  return { items: filterOpenTasks(items), warnings };
}

export async function fetchGitHubPRs(): Promise<{ items: TaskItem[]; warning?: string }> {
  const data = await fetchGitHubTasks();
  return { items: data.reviewRequested, warning: data.warning };
}

type GitHubSearchItem = {
  id: number;
  title: string;
  html_url: string;
  repository_url?: string;
};

async function githubSearch(token: string, query: string): Promise<{ items: GitHubSearchItem[]; error?: string }> {
  const res = await fetch(
    `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=updated&per_page=30`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!res.ok) {
    const body = await res.text();
    return { items: [], error: `GitHub search failed (${query}): ${res.status} ${body.slice(0, 80)}` };
  }

  const data = (await res.json()) as { items?: GitHubSearchItem[] };
  return { items: data.items ?? [] };
}

function mapGitHubItem(item: GitHubSearchItem, status: string): TaskItem {
  const repo = item.repository_url?.match(/repos\/([^/]+\/[^/]+)$/)?.[1];
  return {
    id: String(item.id),
    title: item.title,
    source: "github",
    sourceLabel: repo,
    status,
    url: item.html_url,
  };
}

export async function fetchGitHubTasks(): Promise<{
  reviewRequested: TaskItem[];
  myOpenPRs: TaskItem[];
  assignedIssues: TaskItem[];
  warning?: string;
}> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return {
      reviewRequested: [],
      myOpenPRs: [],
      assignedIssues: [],
      warning: "GitHub not configured (GITHUB_TOKEN)",
    };
  }

  const [reviews, myPRs, issues] = await Promise.all([
    githubSearch(token, "is:pr is:open review-requested:@me"),
    githubSearch(token, "is:pr is:open author:@me"),
    githubSearch(token, "is:issue is:open assignee:@me -is:pr"),
  ]);

  const warnings = [reviews.error, myPRs.error, issues.error].filter(Boolean) as string[];

  return {
    reviewRequested: reviews.items.map((item) => mapGitHubItem(item, "Review requested")),
    myOpenPRs: myPRs.items.map((item) => mapGitHubItem(item, "My open PR")),
    assignedIssues: issues.items.map((item) => mapGitHubItem(item, "Assigned issue")),
    warning: warnings[0],
  };
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isToday(iso?: string) {
  if (!iso) return false;
  const d = parseLocalDate(iso);
  const today = startOfToday();
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

function isOverdue(iso?: string) {
  if (!iso) return false;
  return parseLocalDate(iso) < startOfToday();
}

function isDueWithinDays(due: string, days: number): boolean {
  const d = parseLocalDate(due);
  const today = startOfToday();
  if (d <= today) return false;
  const end = new Date(today);
  end.setDate(end.getDate() + days);
  return d <= end;
}

/** Jira/Notion tasks due in the next 7 days, excluding today and overdue. */
export function getDueThisWeek(items: TaskItem[]): TaskItem[] {
  return items
    .filter(
      (t) =>
        (t.source === "jira" || t.source === "notion") &&
        t.due &&
        !isOverdue(t.due) &&
        !isToday(t.due) &&
        isDueWithinDays(t.due, 7),
    )
    .sort((a, b) => {
      const diff = parseLocalDate(a.due!).getTime() - parseLocalDate(b.due!).getTime();
      return diff !== 0 ? diff : a.title.localeCompare(b.title);
    });
}

export function partitionTasks(all: TaskItem[]) {
  const blockers = all.filter((t) => t.status?.toLowerCase().includes("block") || t.priority?.toLowerCase() === "highest");
  const dueToday = all.filter((t) => isToday(t.due) || isOverdue(t.due));
  const waitingOnMe = all.filter((t) => t.source === "github" || t.status?.toLowerCase().includes("review"));
  return { blockers, dueToday, waitingOnMe };
}

export function countByStatus(items: TaskItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = item.status?.trim() || "No status";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort((a, b) => b[1] - a[1]),
  );
}

export function countByBoard(items: TaskItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = item.sourceLabel?.trim() || "Notion";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function countByBoardStatus(items: TaskItem[]): Record<string, Record<string, number>> {
  const boards: Record<string, Record<string, number>> = {};
  for (const item of items) {
    const board = item.sourceLabel?.trim() || "Notion";
    const status = item.status?.trim() || "No status";
    if (!boards[board]) boards[board] = {};
    boards[board][status] = (boards[board][status] ?? 0) + 1;
  }

  for (const board of Object.keys(boards)) {
    boards[board] = Object.fromEntries(
      Object.entries(boards[board]).sort((a, b) => b[1] - a[1]),
    );
  }

  return boards;
}

export function buildSourceStats(items: TaskItem[]): SourceStats {
  const { blockers, dueToday } = partitionTasks(items);
  return {
    total: items.length,
    blockers: blockers.length,
    dueToday: dueToday.length,
    byStatus: countByStatus(items),
  };
}

const IN_PROGRESS_PATTERNS = [/in\s*progress/i, /^doing$/i, /^started$/i, /^active$/i, /^working$/i];

type NotionSchemaProperty = {
  type: string;
  status?: { options?: Array<{ name: string }> };
  select?: { options?: Array<{ name: string }> };
};

function findNotionStatusSchema(properties: Record<string, NotionSchemaProperty>) {
  for (const key of ["Status", "State", "Done"]) {
    const prop = properties[key];
    if (!prop) continue;
    if (prop.type === "status" && prop.status?.options?.length) {
      return { name: key, type: "status" as const, options: prop.status.options };
    }
    if (prop.type === "select" && prop.select?.options?.length) {
      return { name: key, type: "select" as const, options: prop.select.options };
    }
  }

  for (const [name, prop] of Object.entries(properties)) {
    if (prop.type === "status" && prop.status?.options?.length) {
      return { name, type: "status" as const, options: prop.status.options };
    }
    if (prop.type === "select" && prop.select?.options?.length) {
      return { name, type: "select" as const, options: prop.select.options };
    }
  }

  return null;
}

function pickInProgressStatus(
  options: Array<{ name: string }>,
  preferred?: string,
): string | undefined {
  if (preferred && options.some((option) => option.name === preferred)) {
    return preferred;
  }
  for (const pattern of IN_PROGRESS_PATTERNS) {
    const match = options.find((option) => pattern.test(option.name));
    if (match) return match.name;
  }
  return undefined;
}

export async function setNotionPageStatus(
  pageId: string,
  preferredStatus?: string,
): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return { ok: false, error: "Notion not configured (NOTION_TOKEN)" };
  }

  const pageRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    headers: NOTION_HEADERS(token),
  });
  if (!pageRes.ok) {
    const body = await pageRes.text();
    return { ok: false, error: `Notion page lookup failed: ${pageRes.status} ${body.slice(0, 120)}` };
  }

  const page = (await pageRes.json()) as {
    parent?: { type?: string; database_id?: string };
  };
  const databaseId = page.parent?.database_id;
  if (!databaseId) {
    return { ok: false, error: "Task is not in a Notion database — cannot update status" };
  }

  const dbRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: NOTION_HEADERS(token),
  });
  if (!dbRes.ok) {
    const body = await dbRes.text();
    return { ok: false, error: `Notion database lookup failed: ${dbRes.status} ${body.slice(0, 120)}` };
  }

  const database = (await dbRes.json()) as { properties?: Record<string, NotionSchemaProperty> };
  const statusProp = findNotionStatusSchema(database.properties ?? {});
  if (!statusProp) {
    return { ok: false, error: "No status property found on this Notion database" };
  }

  const statusName = pickInProgressStatus(statusProp.options, preferredStatus);
  if (!statusName) {
    const available = statusProp.options.map((option) => option.name).join(", ");
    return {
      ok: false,
      error: `No in-progress status found. Available: ${available}`,
    };
  }

  const properties =
    statusProp.type === "status"
      ? { [statusProp.name]: { status: { name: statusName } } }
      : { [statusProp.name]: { select: { name: statusName } } };

  const patchRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: NOTION_HEADERS(token),
    body: JSON.stringify({ properties }),
  });

  if (!patchRes.ok) {
    const body = await patchRes.text();
    return { ok: false, error: `Notion update failed: ${patchRes.status} ${body.slice(0, 120)}` };
  }

  return { ok: true, status: statusName };
}

export async function addJiraComment(
  issueKey: string,
  text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  const body = text.trim();

  if (!base || !email || !token) {
    return { ok: false, error: "Jira not configured (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN)" };
  }
  if (!body) {
    return { ok: false, error: "Comment cannot be empty" };
  }

  const res = await fetch(`${base.replace(/\/$/, "")}/rest/api/3/issue/${issueKey}/comment`, {
    method: "POST",
    headers: {
      Authorization: authHeader(email, token),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      body: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: body }],
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    return { ok: false, error: `Jira comment failed: ${res.status} ${errBody.slice(0, 120)}` };
  }

  return { ok: true };
}
