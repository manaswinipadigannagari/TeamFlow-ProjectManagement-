import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notification.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", getNotifications);
router.post("/mark-all-read", markAllAsRead);
router.patch("/:id/read", markAsRead);

export default router;
