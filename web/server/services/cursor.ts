import type { AgentListItem, AgentSummary, CreateAgentRequest, CreateAgentResponse } from "../types.js";
import { getLocalAgentCwd } from "../paths.js";

const CURSOR_API = "https://api.cursor.com/v1";

function apiKey() {
  return process.env.CURSOR_API_KEY ?? "";
}

function cursorUrl(agentId: string) {
  return `https://cursor.com/agents/${agentId}`;
}

async function cursorFetch(path: string, init?: RequestInit) {
  const key = apiKey();
  if (!key) throw new Error("CURSOR_API_KEY not configured");

  const res = await fetch(`${CURSOR_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cursor API ${res.status}: ${text}`);
  }

  return res;
}

export async function listCloudAgents(): Promise<{ agents: AgentListItem[]; warning?: string }> {
  if (!apiKey()) {
    return { agents: [], warning: "CURSOR_API_KEY not configured" };
  }

  try {
    const res = await cursorFetch("/agents?limit=30");
    const data = (await res.json()) as {
      items?: Array<{ id: string; name?: string; status?: string; updatedAt?: string }>;
    };

    const agents: AgentListItem[] = (data.items ?? []).map((a) => ({
      id: a.id,
      name: a.name ?? a.id,
      runtime: "cloud",
      status: a.status ?? "unknown",
      updatedAt: a.updatedAt,
      cursorUrl: cursorUrl(a.id),
    }));

    return { agents };
  } catch (err) {
    return { agents: [], warning: err instanceof Error ? err.message : "Cloud agents fetch failed" };
  }
}

export async function createCloudAgent(body: CreateAgentRequest): Promise<CreateAgentResponse> {
  const payload: Record<string, unknown> = {
    prompt: { text: body.prompt },
    name: body.name ?? body.prompt.slice(0, 80),
  };

  if (body.repoUrl) {
    payload.repos = [{ url: body.repoUrl }];
  }

  const res = await cursorFetch("/agents", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as {
    agent?: { id: string };
    run?: { id: string };
  };

  const agentId = data.agent?.id;
  if (!agentId) throw new Error("No agent id returned");

  return {
    agentId,
    runId: data.run?.id,
    runtime: "cloud",
    cursorUrl: cursorUrl(agentId),
  };
}

export async function listLocalAgents(): Promise<{ agents: AgentListItem[]; warning?: string }> {
  if (!apiKey()) {
    return { agents: [], warning: "CURSOR_API_KEY not configured for local agents" };
  }

  try {
    const { Agent } = await import("@cursor/sdk");
    const cwd = getLocalAgentCwd();
    const list = await Agent.list({ runtime: "local", cwd, apiKey: apiKey() });
    const rows = (list as { items?: Array<{ id: string; name?: string; status?: string }> }).items ?? [];

    const agents: AgentListItem[] = rows.map((a) => ({
      id: a.id,
      name: a.name ?? a.id,
      runtime: "local",
      status: a.status ?? "unknown",
      cursorUrl: cursorUrl(a.id),
    }));

    return { agents };
  } catch (err) {
    return { agents: [], warning: err instanceof Error ? err.message : "Local agents fetch failed" };
  }
}

export async function createLocalAgent(body: CreateAgentRequest): Promise<CreateAgentResponse> {
  const { Agent } = await import("@cursor/sdk");
  const cwd = body.cwd ?? getLocalAgentCwd();

  const agent = await Agent.create({
    apiKey: apiKey(),
    model: { id: "composer-2.5" },
    local: { cwd },
  });

  const run = await agent.send(body.prompt);
  const agentId = agent.agentId;

  // Keep agent alive — user monitors via Cursor or web UI; do not dispose here.
  return {
    agentId,
    runId: run.id,
    runtime: "local",
    cursorUrl: cursorUrl(agentId),
  };
}

export async function listAllAgents(): Promise<{ agents: AgentSummary[]; warnings: string[] }> {
  const [cloud, local] = await Promise.all([listCloudAgents(), listLocalAgents()]);
  const warnings = [cloud.warning, local.warning].filter(Boolean) as string[];
  return { agents: [...cloud.agents, ...local.agents], warnings };
}

export function proxyStreamUrl(agentId: string, runId: string) {
  return `/api/agents/${agentId}/runs/${runId}/stream?runtime=cloud`;
}

export async function getCloudRunStream(agentId: string, runId: string): Promise<Response> {
  const key = apiKey();
  return fetch(`${CURSOR_API}/agents/${agentId}/runs/${runId}/stream`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "text/event-stream" },
  });
}

export async function cancelCloudRun(agentId: string, runId: string) {
  await cursorFetch(`/agents/${agentId}/runs/${runId}/cancel`, { method: "POST", body: "{}" });
}
