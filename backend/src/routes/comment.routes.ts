import { Router } from "express";
import { createComment, getTaskComments, deleteComment } from "../controllers/comment.controller";
import { requireAuth } from "../middleware/auth";
import { requireProjectRole } from "../middleware/rbac";
import { validateRequest } from "../middleware/validation";
import { createCommentSchema } from "../schemas/comment.schema";

const router = Router();

// All comment routes require authentication
router.use(requireAuth);

// Task scoped comment list and addition
router.get(
  "/tasks/:taskId/comments",
  requireProjectRole(["admin", "member", "viewer"]),
  getTaskComments
);
router.post(
  "/tasks/:taskId/comments",
  requireProjectRole(["admin", "member"]),
  validateRequest(createCommentSchema),
  createComment
);

// Individual comment deletion
router.delete("/comments/:id", requireProjectRole(["admin", "member"]), deleteComment);

export default router;
