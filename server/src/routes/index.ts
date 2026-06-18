import { Router } from "express";
import authRoutes from "./auth.routes";
import workspaceRoutes from "./workspace.routes";
import projectRoutes from "./project.routes";
import sprintRoutes from "./sprint.routes";
import taskRoutes from "./task.routes";
import commentRoutes from "./comment.routes";
import notificationRoutes from "./notification.routes";
import activityRoutes from "./activity.routes";
import analyticsRoutes from "./analytics.routes";

const router = Router();

// Mount Auth routes
router.use("/auth", authRoutes);

// Mount Workspace routes
router.use("/workspaces", workspaceRoutes);

// Mount Project routes (contains /workspaces/:wsId/projects and /projects/:id paths)
router.use("/", projectRoutes);

// Mount Sprint routes (contains /projects/:projectId/sprints and /sprints/:id paths)
router.use("/", sprintRoutes);

// Mount Task routes (contains /projects/:projectId/tasks and /tasks/:id paths)
router.use("/", taskRoutes);

// Mount Comment routes (contains /tasks/:taskId/comments and /comments/:id paths)
router.use("/", commentRoutes);

// Mount Notification routes
router.use("/notifications", notificationRoutes);

// Mount Activity routes (contains /projects/:projectId/activity path)
router.use("/", activityRoutes);

// Mount Analytics routes (contains project and workspace overview routes)
router.use("/", analyticsRoutes);

export default router;
