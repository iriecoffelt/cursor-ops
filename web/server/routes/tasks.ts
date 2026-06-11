import { Router } from "express";
import { fetchJiraTasks, fetchNotionTasks, fetchGitHubTasks, partitionTasks } from "../services/integrations.js";
import type { GitHubTaskResponse, TaskListResponse } from "../types.js";

export const tasksRouter = Router();

tasksRouter.get("/jira", async (_req, res) => {
  const result = await fetchJiraTasks();
  const { blockers, dueToday } = partitionTasks(result.items);
  const warnings = result.warning ? [result.warning] : [];

  const data: TaskListResponse = {
    fetchedAt: new Date().toISOString(),
    items: result.items,
    blockers,
    dueToday,
    warnings,
  };

  res.json(data);
});

tasksRouter.get("/notion", async (_req, res) => {
  const result = await fetchNotionTasks();
  const { blockers, dueToday } = partitionTasks(result.items);

  const data: TaskListResponse = {
    fetchedAt: new Date().toISOString(),
    items: result.items,
    blockers,
    dueToday,
    warnings: result.warnings,
  };

  res.json(data);
});

tasksRouter.get("/github", async (_req, res) => {
  const result = await fetchGitHubTasks();
  const items = [...result.reviewRequested, ...result.myOpenPRs, ...result.assignedIssues];
  const warnings = result.warning ? [result.warning] : [];

  const data: GitHubTaskResponse = {
    fetchedAt: new Date().toISOString(),
    items,
    reviewRequested: result.reviewRequested,
    myOpenPRs: result.myOpenPRs,
    assignedIssues: result.assignedIssues,
    byCategory: {
      "Review requested": result.reviewRequested.length,
      "My open PRs": result.myOpenPRs.length,
      "Assigned issues": result.assignedIssues.length,
    },
    warnings,
  };

  res.json(data);
});
