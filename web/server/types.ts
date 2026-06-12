export type TaskItem = {
  id: string;
  title: string;
  source: "jira" | "notion" | "github";
  sourceLabel?: string;
  status?: string;
  priority?: string;
  url?: string;
  due?: string;
};

export type AgentSummary = {
  id: string;
  name: string;
  runtime: "cloud" | "local";
  status: string;
  updatedAt?: string;
  cursorUrl?: string;
};

export type SourceStats = {
  total: number;
  blockers: number;
  dueToday: number;
  byStatus: Record<string, number>;
};

export type GitHubTaskResponse = {
  fetchedAt: string;
  items: TaskItem[];
  reviewRequested: TaskItem[];
  myOpenPRs: TaskItem[];
  assignedIssues: TaskItem[];
  byCategory: Record<string, number>;
  warnings: string[];
};

export type WebexMeetingItem = {
  id: string;
  title: string;
  start: string;
  end: string;
  webLink?: string;
  state: string;
};

export type WebexMeetingGap = {
  afterTitle: string;
  beforeTitle: string;
  start: string;
  end: string;
  minutes: number;
};

export type WebexTodaySummary = {
  fetchedAt: string;
  meetings: WebexMeetingItem[];
  nextMeeting?: {
    id: string;
    title: string;
    start: string;
    end: string;
    webLink?: string;
    startsInMinutes: number;
    inProgress: boolean;
  };
  gaps: WebexMeetingGap[];
  remainingCount: number;
};

export type DashboardMailPreview = {
  unreadCount: number;
  messages: Array<{
    subject: string;
    from: string;
    url?: string;
  }>;
};

export type DashboardData = {
  fetchedAt: string;
  totals: {
    open: number;
    jira: number;
    notion: number;
    github: number;
    blockers: number;
    dueToday: number;
    dueThisWeek: number;
    waitingOnMe: number;
    activeAgents: number;
    gmailUnread: number;
    meetingsToday: number;
    meetingsRemaining: number;
  };
  jira: SourceStats;
  notion: SourceStats & {
    byBoard: Record<string, number>;
    byBoardStatus: Record<string, Record<string, number>>;
  };
  github: SourceStats;
  blockers: TaskItem[];
  dueToday: TaskItem[];
  dueThisWeek: TaskItem[];
  waitingOnMe: TaskItem[];
  agents: AgentSummary[];
  mail?: DashboardMailPreview;
  webex?: WebexTodaySummary;
  warnings: string[];
};

export type TaskListResponse = {
  fetchedAt: string;
  items: TaskItem[];
  blockers: TaskItem[];
  dueToday: TaskItem[];
  warnings: string[];
};

export type AgentListItem = AgentSummary & {
  repo?: string;
};

export type CreateAgentRequest = {
  prompt: string;
  runtime: "cloud" | "local";
  repoUrl?: string;
  cwd?: string;
  name?: string;
};

export type CreateAgentResponse = {
  agentId: string;
  runId?: string;
  runtime: "cloud" | "local";
  cursorUrl: string;
};
