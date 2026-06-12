import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { envRouter } from "./routes/env.js";
import { agentsRouter } from "./routes/agents.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { tasksRouter } from "./routes/tasks.js";
import { mailRouter } from "./routes/mail.js";
import { webexRouter } from "./routes/webex.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use("/api/env", envRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/mail", mailRouter);
app.use("/api/webex", webexRouter);

app.listen(PORT, () => {
  console.log(`cursor-ops API listening on http://localhost:${PORT}`);
});
