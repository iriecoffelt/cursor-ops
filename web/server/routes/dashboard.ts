import { Router } from "express";
import {
  buildSourceStats,
  countByBoard,
  countByBoardStatus,
  fetchGitHubTasks,
  fetchJiraTasks,
  fetchNotionTasks,
  getDueThisWeek,
  partitionTasks,
} from "../services/integrations.js";
import { listAllAgents } from "../services/cursor.js";
import { fetchMailInbox } from "../services/mail/index.js";
import { mailSettings } from "../services/mail/settings.js";
import { fetchWebexToday } from "../services/webex/meetings.js";
import { webexSettings } from "../services/webex/settings.js";
import type { DashboardData } from "../types.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (_req, res) => {
  const warnings: string[] = [];
  const mail = mailSettings();
  const webex = webexSettings();

  const [jira, notion, githubResult, agentsResult, mailInbox, webexToday] = await Promise.all([
    fetchJiraTasks(),
    fetchNotionTasks(),
    fetchGitHubTasks(),
    listAllAgents(),
    mail.showMailTab ? fetchMailInbox() : Promise.resolve(null),
    webex.showOnPulse ? fetchWebexToday() : Promise.resolve(null),
  ]);

  const githubItems = [
    ...githubResult.reviewRequested,
    ...githubResult.myOpenPRs,
    ...githubResult.assignedIssues,
  ];

  for (const w of [jira.warning, ...notion.warnings, githubResult.warning, ...agentsResult.warnings]) {
    if (w) warnings.push(w);
  }
  if (mailInbox) {
    for (const w of mailInbox.warnings) {
      if (w) warnings.push(w);
    }
  }
  if (webexToday && "warning" in webexToday) {
    warnings.push(webexToday.warning);
  }

  const allTasks = [...jira.items, ...notion.items, ...githubItems];
  const schedulableTasks = [...jira.items, ...notion.items];
  const { blockers, dueToday, waitingOnMe } = partitionTasks(allTasks);
  const urgentDue = dueToday.filter((t) => !blockers.some((b) => b.id === t.id && b.source === t.source));
  const dueThisWeek = getDueThisWeek(schedulableTasks).filter(
    (t) => !blockers.some((b) => b.id === t.id && b.source === t.source),
  );
  const activeAgents = agentsResult.agents.filter(
    (a) => !["finished", "archived", "deleted"].includes(a.status.toLowerCase()),
  );

  const data: DashboardData = {
    fetchedAt: new Date().toISOString(),
    totals: {
      open: allTasks.length,
      jira: jira.items.length,
      notion: notion.items.length,
      github: githubItems.length,
      blockers: blockers.length,
      dueToday: dueToday.length,
      dueThisWeek: dueThisWeek.length,
      waitingOnMe: waitingOnMe.length,
      activeAgents: activeAgents.length,
      gmailUnread: mailInbox?.unreadCount ?? 0,
      meetingsToday: webexToday && !("warning" in webexToday) ? webexToday.meetings.length : 0,
      meetingsRemaining: webexToday && !("warning" in webexToday) ? webexToday.remainingCount : 0,
    },
    jira: buildSourceStats(jira.items),
    notion: {
      ...buildSourceStats(notion.items),
      byBoard: countByBoard(notion.items),
      byBoardStatus: countByBoardStatus(notion.items),
    },
    github: buildSourceStats(githubItems),
    blockers,
    dueToday: urgentDue,
    dueThisWeek,
    waitingOnMe,
    agents: activeAgents,
    mail: mailInbox
      ? {
          unreadCount: mailInbox.unreadCount,
          messages: mailInbox.messages.map((msg) => ({
            subject: msg.subject,
            from: msg.from,
            url: msg.url,
          })),
        }
      : undefined,
    webex: webexToday && !("warning" in webexToday) ? webexToday : undefined,
    warnings: [...new Set(warnings)],
  };

  res.json(data);
});
