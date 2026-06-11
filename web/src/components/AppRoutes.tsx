import { Navigate, Route, Routes } from "react-router-dom";
import { useEnvStatus } from "../context/EnvStatusContext";
import { AgentDetailPage } from "../pages/AgentDetail";
import { AgentsPage } from "../pages/Agents";
import { DashboardPage } from "../pages/Dashboard";
import { EnvPage } from "../pages/Env";
import { GitHubPage } from "../pages/GitHub";
import { JiraPage } from "../pages/Jira";
import { MailPage } from "../pages/Mail";
import { NotionPage } from "../pages/Notion";
import { Layout } from "./Layout";

export function AppRoutes() {
  const { status } = useEnvStatus();

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        {status?.jira ? <Route path="jira" element={<JiraPage />} /> : null}
        {status?.notion ? <Route path="notion" element={<NotionPage />} /> : null}
        {status?.github ? <Route path="github" element={<GitHubPage />} /> : null}
        {status?.mail?.showTab ? <Route path="mail" element={<MailPage />} /> : null}
        {status?.cursor ? <Route path="agents" element={<AgentsPage />} /> : null}
        {status?.cursor ? <Route path="agents/:agentId" element={<AgentDetailPage />} /> : null}
        <Route path="env" element={<EnvPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
