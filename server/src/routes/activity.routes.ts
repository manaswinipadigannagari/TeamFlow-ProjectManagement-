import { Router } from "express";
import { getProjectActivity } from "../controllers/activity.controller";
import { requireAuth } from "../middleware/auth";
import { requireProjectRole } from "../middleware/rbac";

const router = Router();

router.use(requireAuth);

router.get(
  "/projects/:projectId/activity",
  requireProjectRole(["admin", "member", "viewer"]),
  getProjectActivity
);

export default router;
