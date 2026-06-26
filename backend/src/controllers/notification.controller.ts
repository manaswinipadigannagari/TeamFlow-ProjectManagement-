import { Request, Response, NextFunction } from "express";
import Notification from "../models/Notification";
import { NotFoundError, ForbiddenError } from "../utils/errors";

export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenError("Unauthenticated");
    }

    const { limit = 20, page = 1 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Notification.countDocuments({ userId });

    res.status(200).json({
      success: true,
      data: {
        items: notifications,
        total,
        page: Number(page),
        pageSize: Number(limit),
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      throw new ForbiddenError("Unauthenticated");
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    if (notification.userId.toString() !== userId) {
      throw new ForbiddenError("Not authorized to read this notification");
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      data: notification,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenError("Unauthenticated");
    }

    await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });

    res.status(200).json({
      success: true,
      data: { message: "All notifications marked as read" },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};
