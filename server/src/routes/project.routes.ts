import { Router } from "express";
import {
  createProject,
  getWorkspaceProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectBoard,
  updateBoardColumns,
  addProjectMember,
  removeProjectMember,
} from "../controllers/project.controller";
import { requireAuth } from "../middleware/auth";
import { requireWorkspaceRole, requireProjectRole } from "../middleware/rbac";
import { validateRequest } from "../middleware/validation";
import {
  createProjectSchema,
  updateProjectSchema,
  updateProjectMemberSchema,
} from "../schemas/project.schema";

const router = Router();

// All project routes require authentication
router.use(requireAuth);

// Workspace scope
router.get("/workspaces/:wsId/projects", getWorkspaceProjects);
router.post(
  "/workspaces/:wsId/projects",
  requireWorkspaceRole(["owner", "admin"]),
  validateRequest(createProjectSchema),
  createProject
);

// Project scope
router.get("/projects/:id", requireProjectRole(["admin", "member", "viewer"]), getProjectById);
router.patch(
  "/projects/:id",
  requireProjectRole(["admin"]),
  validateRequest(updateProjectSchema),
  updateProject
);
router.delete("/projects/:id", requireProjectRole(["admin"]), deleteProject);

// Board scope
router.get(
  "/projects/:id/board",
  requireProjectRole(["admin", "member", "viewer"]),
  getProjectBoard
);
router.patch(
  "/projects/:id/board/columns",
  requireProjectRole(["admin", "member"]),
  updateBoardColumns
);

// Member scope
router.post(
  "/projects/:id/members",
  requireProjectRole(["admin"]),
  validateRequest(updateProjectMemberSchema),
  addProjectMember
);
router.delete("/projects/:id/members/:userId", requireProjectRole(["admin"]), removeProjectMember);

export default router;
