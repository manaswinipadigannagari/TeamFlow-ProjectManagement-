import mongoose from "mongoose";
import ActivityLog from "../models/ActivityLog";
import logger from "./logger";
import { emitToRoom } from "../config/socket";

interface ILogParams {
  workspaceId: string | mongoose.Types.ObjectId;
  projectId?: string | mongoose.Types.ObjectId;
  actorId: string | mongoose.Types.ObjectId;
  action: string;
  targetType: "workspace" | "project" | "board" | "sprint" | "task" | "comment" | "member";
  targetId: string | mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
}

export const logActivity = async (params: ILogParams): Promise<void> => {
  try {
    const activity = await ActivityLog.create({
      workspaceId: new mongoose.Types.ObjectId(params.workspaceId),
      projectId: params.projectId ? new mongoose.Types.ObjectId(params.projectId) : undefined,
      actorId: new mongoose.Types.ObjectId(params.actorId),
      action: params.action,
      targetType: params.targetType,
      targetId: new mongoose.Types.ObjectId(params.targetId),
      metadata: params.metadata || {},
    });

    const populatedActivity = await ActivityLog.findById(activity._id).populate(
      "actorId",
      "name email avatarUrl"
    );

    if (params.projectId) {
      // Emit real-time project activity
      emitToRoom(`project:${params.projectId}`, "activity:logged", populatedActivity);
    }
    logger.debug(`Activity logged: ${params.action} by User ${params.actorId}`);
  } catch (error) {
    logger.error("Failed to log activity: ", error);
  }
};
