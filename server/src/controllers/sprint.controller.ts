import { Response, NextFunction } from "express";
import { IContextRequest } from "../middleware/rbac";
import Sprint from "../models/Sprint";
import Task from "../models/Task";
import { BadRequestError, NotFoundError } from "../utils/errors";

export const createSprint = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, goal, startDate, endDate } = req.body;
    const { projectId } = req.params;

    const sprint = await Sprint.create({
      projectId,
      name,
      goal,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: "planned",
      taskIds: [],
    });

    res.status(201).json({
      success: true,
      data: sprint,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectSprints = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { projectId } = req.params;

    const sprints = await Sprint.find({ projectId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: sprints,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSprint = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, goal, startDate, endDate, status } = req.body;

    const sprint = await Sprint.findById(id);
    if (!sprint) {
      throw new NotFoundError("Sprint not found");
    }

    if (name) sprint.name = name;
    if (goal !== undefined) sprint.goal = goal;
    if (startDate) sprint.startDate = new Date(startDate);
    if (endDate) sprint.endDate = new Date(endDate);
    if (status) sprint.status = status;

    await sprint.save();

    res.status(200).json({
      success: true,
      data: sprint,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const startSprint = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const sprint = await Sprint.findById(id);
    if (!sprint) {
      throw new NotFoundError("Sprint not found");
    }

    if (sprint.status !== "planned") {
      throw new BadRequestError("Sprint has already been started or completed");
    }

    // Check if there's already an active sprint for this project
    const activeSprint = await Sprint.findOne({
      projectId: sprint.projectId,
      status: "active",
    });

    if (activeSprint) {
      throw new BadRequestError(
        `Cannot start sprint: Sprint "${activeSprint.name}" is already active`
      );
    }

    sprint.status = "active";
    await sprint.save();

    res.status(200).json({
      success: true,
      data: sprint,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const completeSprint = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const sprint = await Sprint.findById(id);
    if (!sprint) {
      throw new NotFoundError("Sprint not found");
    }

    if (sprint.status !== "active") {
      throw new BadRequestError("Only active sprints can be completed");
    }

    sprint.status = "completed";
    await sprint.save();

    // Find all incomplete tasks inside this sprint
    // We assume tasks that do not have status 'done' are incomplete
    const incompleteTasks = await Task.find({
      sprintId: sprint._id,
      status: { $ne: "done" },
    });

    // Move incomplete tasks to the backlog (sprintId = null)
    if (incompleteTasks.length > 0) {
      const taskIdsToMove = incompleteTasks.map((t) => t._id);

      // Update tasks in DB
      await Task.updateMany({ _id: { $in: taskIdsToMove } }, { $set: { sprintId: null } });

      // Clean up board columns: tasks in backlog are in backlog, but let's make sure
      // that they stay on the board, just their sprint mapping is cleared.
      // Sprints are a timebox query filter; task mapping handles backlog vs. sprint.
    }

    res.status(200).json({
      success: true,
      data: {
        sprint,
        movedTasksCount: incompleteTasks.length,
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};
