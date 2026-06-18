import { Router } from "express";
import {
  getProjectOverviewAnalytics,
  getProjectBurndownAnalytics,
  getWorkspaceOverviewAnalytics,
} from "../controllers/analytics.controller";
import { requireAuth } from "../middleware/auth";
import { requireWorkspaceRole, requireProjectRole } from "../middleware/rbac";

const router = Router();

router.use(requireAuth);

// Project specific analytics
router.get(
  "/projects/:projectId/analytics/overview",
  requireProjectRole(["admin", "member", "viewer"]),
  getProjectOverviewAnalytics
);
router.get(
  "/projects/:projectId/analytics/burndown",
  requireProjectRole(["admin", "member", "viewer"]),
  getProjectBurndownAnalytics
);

// Workspace specific analytics
router.get(
  "/workspaces/:wsId/analytics/overview",
  requireWorkspaceRole(["owner", "admin", "member", "viewer"]),
  getWorkspaceOverviewAnalytics
);

export default router;
