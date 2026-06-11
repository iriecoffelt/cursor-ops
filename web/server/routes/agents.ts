import { Router } from "express";
import {
  cancelCloudRun,
  createCloudAgent,
  createLocalAgent,
  getCloudRunStream,
  listAllAgents,
} from "../services/cursor.js";
import type { CreateAgentRequest } from "../types.js";

export const agentsRouter = Router();

agentsRouter.get("/", async (_req, res) => {
  try {
    const { agents, warnings } = await listAllAgents();
    res.json({ agents, warnings });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to list agents" });
  }
});

agentsRouter.post("/", async (req, res) => {
  const body = req.body as CreateAgentRequest;
  if (!body.prompt?.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  try {
    const result =
      body.runtime === "local"
        ? await createLocalAgent(body)
        : await createCloudAgent(body);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to create agent" });
  }
});

agentsRouter.get("/:agentId/runs/:runId/stream", async (req, res) => {
  const { agentId, runId } = req.params;
  const runtime = (req.query.runtime as string) ?? "cloud";

  if (runtime !== "cloud") {
    res.status(501).json({ error: "Local run streaming not yet implemented in MVP" });
    return;
  }

  try {
    const upstream = await getCloudRunStream(agentId, runId);
    if (!upstream.ok || !upstream.body) {
      res.status(upstream.status).json({ error: "Stream unavailable" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = upstream.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    };

    req.on("close", () => reader.cancel());
    await pump();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Stream failed" });
    }
  }
});

agentsRouter.post("/:agentId/runs/:runId/cancel", async (req, res) => {
  try {
    await cancelCloudRun(req.params.agentId, req.params.runId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Cancel failed" });
  }
});
