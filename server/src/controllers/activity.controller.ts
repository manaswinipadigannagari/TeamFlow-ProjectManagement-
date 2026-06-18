import { Response, NextFunction } from "express";
import { IContextRequest } from "../middleware/rbac";
import ActivityLog from "../models/ActivityLog";
import { NotFoundError } from "../utils/errors";

export const getProjectActivity = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const project = req.project;
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const { limit = 30, page = 1 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const logs = await ActivityLog.find({ projectId: project._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("actorId", "name email avatarUrl");

    const total = await ActivityLog.countDocuments({ projectId: project._id });

    res.status(200).json({
      success: true,
      data: {
        items: logs,
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
