import { Router } from "express";
import {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  inviteMember,
  updateMemberRole,
  removeMember,
} from "../controllers/workspace.controller";
import { requireAuth } from "../middleware/auth";
import { requireWorkspaceRole } from "../middleware/rbac";
import { validateRequest } from "../middleware/validation";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from "../schemas/workspace.schema";

const router = Router();

// All workspace routes require authentication
router.use(requireAuth);

router.get("/", getWorkspaces);
router.post("/", validateRequest(createWorkspaceSchema), createWorkspace);

router.get("/:id", requireWorkspaceRole(["owner", "admin", "member", "viewer"]), getWorkspaceById);
router.patch(
  "/:id",
  requireWorkspaceRole(["owner", "admin"]),
  validateRequest(updateWorkspaceSchema),
  updateWorkspace
);
router.delete("/:id", requireWorkspaceRole(["owner"]), deleteWorkspace);

// Member routes
router.post(
  "/:id/invite",
  requireWorkspaceRole(["owner", "admin"]),
  validateRequest(inviteMemberSchema),
  inviteMember
);
router.patch(
  "/:id/members/:userId",
  requireWorkspaceRole(["owner", "admin"]),
  validateRequest(updateMemberRoleSchema),
  updateMemberRole
);
router.delete("/:id/members/:userId", requireWorkspaceRole(["owner", "admin"]), removeMember);

export default router;
