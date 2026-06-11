import type { AgentListItem, AgentSummary, CreateAgentRequest, DashboardData, GitHubTaskResponse, TaskListResponse } from "../../server/types";

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export function fetchEnvStatus() {
  return json<EnvStatus>("/api/env/status");
}

export type EnvStatus = {
  appTitle: string;
  repoRoot: string;
  envFilePath: string;
  cursor: boolean;
  jira: boolean;
  notion: boolean;
  notionDatabaseCount: number;
  github: boolean;
  localAgentCwd: string;
  localAgentCwdFromEnv: boolean;
};

export function fetchDashboard() {
  return json<DashboardData>("/api/dashboard");
}

export function fetchJiraTasks() {
  return json<TaskListResponse>("/api/tasks/jira");
}

export function fetchNotionTasks() {
  return json<TaskListResponse>("/api/tasks/notion");
}

export function fetchGitHubTasks() {
  return json<GitHubTaskResponse>("/api/tasks/github");
}

export function fetchAgents() {
  return json<{ agents: AgentListItem[]; warnings: string[] }>("/api/agents");
}

export function createAgent(body: CreateAgentRequest) {
  return json<{ agentId: string; runId?: string; runtime: string; cursorUrl: string }>("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function cancelRun(agentId: string, runId: string) {
  return json<{ ok: boolean }>(`/api/agents/${agentId}/runs/${runId}/cancel`, { method: "POST" });
}

export type { AgentSummary, AgentListItem, DashboardData, GitHubTaskResponse, TaskListResponse };
