import mongoose from "mongoose";
import Notification from "../models/Notification";
import logger from "./logger";
import { emitToUser } from "../config/socket";

interface INotificationParams {
  userId: string | mongoose.Types.ObjectId;
  type: "task.assigned" | "comment.mention" | "sprint.started" | "task.due" | "project.added";
  message: string;
  link?: string;
  relatedEntity?: {
    entityType: "workspace" | "project" | "sprint" | "task" | "comment";
    entityId: string | mongoose.Types.ObjectId;
  };
}

export const createNotification = async (params: INotificationParams): Promise<void> => {
  try {
    const notification = await Notification.create({
      userId: new mongoose.Types.ObjectId(params.userId),
      type: params.type,
      message: params.message,
      link: params.link,
      isRead: false,
      relatedEntity: params.relatedEntity
        ? {
            entityType: params.relatedEntity.entityType,
            entityId: new mongoose.Types.ObjectId(params.relatedEntity.entityId),
          }
        : undefined,
    });

    // Send real-time notification to user personal channel
    emitToUser(params.userId.toString(), "notification:new", notification);
    logger.debug(`Notification sent to User ${params.userId}: ${params.message}`);
  } catch (error) {
    logger.error("Failed to create notification: ", error);
  }
};
