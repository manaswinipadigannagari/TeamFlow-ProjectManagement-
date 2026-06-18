import { Router } from "express";
import {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  moveTask,
  deleteTask,
} from "../controllers/task.controller";
import { requireAuth } from "../middleware/auth";
import { requireProjectRole } from "../middleware/rbac";
import { validateRequest } from "../middleware/validation";
import { createTaskSchema, updateTaskSchema, moveTaskSchema } from "../schemas/task.schema";

const router = Router();

// All task routes require authentication
router.use(requireAuth);

// Project scope task management
router.get(
  "/projects/:projectId/tasks",
  requireProjectRole(["admin", "member", "viewer"]),
  getProjectTasks
);
router.post(
  "/projects/:projectId/tasks",
  requireProjectRole(["admin", "member"]),
  validateRequest(createTaskSchema),
  createTask
);

// Individual task scope
router.get("/tasks/:id", requireProjectRole(["admin", "member", "viewer"]), getTaskById);
router.patch(
  "/tasks/:id",
  requireProjectRole(["admin", "member"]),
  validateRequest(updateTaskSchema),
  updateTask
);
router.patch(
  "/tasks/:id/move",
  requireProjectRole(["admin", "member"]),
  validateRequest(moveTaskSchema),
  moveTask
);
router.delete("/tasks/:id", requireProjectRole(["admin", "member"]), deleteTask);

export default router;
