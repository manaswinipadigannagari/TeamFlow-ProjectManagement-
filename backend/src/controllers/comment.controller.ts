import { Response, NextFunction } from "express";
import { IContextRequest } from "../middleware/rbac";
import Comment from "../models/Comment";
import Task from "../models/Task";
import Project from "../models/Project";
import { NotFoundError, ForbiddenError } from "../utils/errors";
import mongoose from "mongoose";
import { emitToRoom } from "../config/socket";

export const createComment = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { body, mentions } = req.body;
    const authorId = req.user?.id;

    if (!authorId) {
      throw new ForbiddenError("Unauthenticated");
    }

    const task = await Task.findById(taskId);
    if (!task) {
      throw new NotFoundError("Task not found");
    }

    const parsedMentions = mentions
      ? mentions.map((id: string) => new mongoose.Types.ObjectId(id))
      : [];

    const comment = await Comment.create({
      taskId,
      authorId: new mongoose.Types.ObjectId(authorId),
      body,
      mentions: parsedMentions,
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      "authorId",
      "name email avatarUrl"
    );

    // Socket broadcast
    emitToRoom(`project:${task.projectId}`, "comment:created", populatedComment);

    res.status(201).json({
      success: true,
      data: populatedComment,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskComments = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { taskId } = req.params;

    const comments = await Comment.find({ taskId })
      .populate("authorId", "name email avatarUrl")
      .sort({ createdAt: 1 }); // chronological

    res.status(200).json({
      success: true,
      data: comments,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const comment = await Comment.findById(id);
    if (!comment) {
      throw new NotFoundError("Comment not found");
    }

    // Only allow comment author or project admins to delete a comment
    const task = await Task.findById(comment.taskId).populate("projectId");
    const project = await Project.findById(task?.projectId);
    const isProjectAdmin = project?.members.some(
      (m: any) => m.userId.toString() === userId && m.role === "admin"
    );

    if (comment.authorId.toString() !== userId && !isProjectAdmin && req.user?.role !== "admin") {
      throw new ForbiddenError("You are not authorized to delete this comment");
    }

    await Comment.findByIdAndDelete(id);

    emitToRoom(`project:${task?.projectId}`, "comment:deleted", { commentId: id });

    res.status(200).json({
      success: true,
      data: { message: "Comment deleted successfully" },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};
