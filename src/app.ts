import express, { Application } from "express";
import cors from "cors";
import cookiparser from "cookie-parser";

const app: Application = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));
app.use(express.static("public"));
app.use(cookiparser());

// import routes
import userRoutes from "./routes/user.routes.js";
import projectRoutes from "./routes/project.routes.js"
import taskRoutes from "./routes/task.routes.js"
import projectSummaryRoutes from "./routes/projectSummary.routes.js"

// use routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/projects/:projectId/tasks", taskRoutes);
app.use("/api/v1/projects", projectSummaryRoutes);

export { app };