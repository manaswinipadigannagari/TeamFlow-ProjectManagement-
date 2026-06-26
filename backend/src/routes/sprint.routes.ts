import { Router } from "express";
import {
  createSprint,
  getProjectSprints,
  updateSprint,
  startSprint,
  completeSprint,
} from "../controllers/sprint.controller";
import { requireAuth } from "../middleware/auth";
import { requireProjectRole } from "../middleware/rbac";
import { validateRequest } from "../middleware/validation";
import { createSprintSchema, updateSprintSchema } from "../schemas/sprint.schema";

const router = Router();

// All sprint routes require authentication
router.use(requireAuth);

// Project scoped sprint list and create
router.get(
  "/projects/:projectId/sprints",
  requireProjectRole(["admin", "member", "viewer"]),
  getProjectSprints
);
router.post(
  "/projects/:projectId/sprints",
  requireProjectRole(["admin", "member"]),
  validateRequest(createSprintSchema),
  createSprint
);

// Individual sprint CRUD and actions
router.patch(
  "/sprints/:id",
  requireProjectRole(["admin", "member"]),
  validateRequest(updateSprintSchema),
  updateSprint
);
router.post("/sprints/:id/start", requireProjectRole(["admin", "member"]), startSprint);
router.post("/sprints/:id/complete", requireProjectRole(["admin", "member"]), completeSprint);

export default router;
