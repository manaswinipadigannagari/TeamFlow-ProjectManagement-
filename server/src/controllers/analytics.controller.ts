import { Response, NextFunction } from "express";
import { IContextRequest } from "../middleware/rbac";
import Task from "../models/Task";
import Project from "../models/Project";
import Sprint from "../models/Sprint";
import Workspace from "../models/Workspace";
import { NotFoundError } from "../utils/errors";
import mongoose from "mongoose";
import { eachDayOfInterval, format, startOfDay } from "date-fns";

export const getProjectOverviewAnalytics = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // 1. Status Breakdown aggregation
    const statusBreakdown = await Task.aggregate([
      { $match: { projectId: new mongoose.Types.ObjectId(projectId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // 2. Priority Breakdown aggregation
    const priorityBreakdown = await Task.aggregate([
      { $match: { projectId: new mongoose.Types.ObjectId(projectId) } },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]);

    // 3. Task Type Breakdown aggregation
    const typeBreakdown = await Task.aggregate([
      { $match: { projectId: new mongoose.Types.ObjectId(projectId) } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    // 4. Overdue tasks count
    const now = new Date();
    const overdueCount = await Task.countDocuments({
      projectId,
      dueDate: { $lt: now },
      status: { $ne: "done" },
    });

    // 5. General stats
    const totalTasks = await Task.countDocuments({ projectId });
    const completedTasks = await Task.countDocuments({ projectId, status: "done" });

    // 6. Workload breakdown by assignee
    const workloadBreakdown = await Task.aggregate([
      { $match: { projectId: new mongoose.Types.ObjectId(projectId) } },
      { $unwind: "$assigneeIds" },
      {
        $group: {
          _id: "$assigneeIds",
          taskCount: { $sum: 1 },
          totalPoints: { $sum: "$estimate" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          userId: "$_id",
          name: "$userInfo.name",
          email: "$userInfo.email",
          avatarUrl: "$userInfo.avatarUrl",
          taskCount: 1,
          totalPoints: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalTasks,
        completedTasks,
        overdueCount,
        statusBreakdown: statusBreakdown.map((s) => ({ status: s._id, count: s.count })),
        priorityBreakdown: priorityBreakdown.map((p) => ({ priority: p._id, count: p.count })),
        typeBreakdown: typeBreakdown.map((t) => ({ type: t._id, count: t.count })),
        workloadBreakdown,
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectBurndownAnalytics = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { projectId } = req.params;

    // Find the currently active sprint for this project
    const activeSprint = await Sprint.findOne({ projectId, status: "active" });
    if (!activeSprint) {
      res.status(200).json({
        success: true,
        data: { activeSprint: null, burndownData: [] },
        error: null,
      });
      return;
    }

    // Get all tasks in this sprint
    const tasks = await Task.find({ sprintId: activeSprint._id });

    // Calculate dates interval
    const start = startOfDay(activeSprint.startDate);
    const end = startOfDay(activeSprint.endDate);

    // Generate each day in interval
    const days = eachDayOfInterval({ start, end });
    const totalDays = days.length - 1 || 1;

    // Calculate total story points estimate in this sprint
    const totalPoints = tasks.reduce((sum, task) => sum + (task.estimate || 0), 0);

    const burndownData = days.map((day, index) => {
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      // Ideal points remaining at this day index (linear decline)
      const idealRemaining = Math.max(0, totalPoints - (totalPoints / totalDays) * index);

      // Actual points remaining at this day: sum estimates of tasks NOT done,
      // OR tasks that were marked done AFTER this day.
      const actualRemaining = tasks.reduce((sum, task) => {
        const isCompleted = task.status === "done";
        const completedDate = task.updatedAt;

        // If task is not completed, it counts as remaining.
        // If it was completed but AFTER this day, it also counts as remaining.
        if (!isCompleted || (completedDate && completedDate > dayEnd)) {
          return sum + (task.estimate || 0);
        }
        return sum;
      }, 0);

      return {
        day: format(day, "MMM dd"),
        ideal: parseFloat(idealRemaining.toFixed(1)),
        actual: actualRemaining,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        activeSprint: {
          id: activeSprint._id,
          name: activeSprint.name,
          goal: activeSprint.goal,
          startDate: activeSprint.startDate,
          endDate: activeSprint.endDate,
        },
        burndownData,
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceOverviewAnalytics = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { wsId } = req.params;

    const workspace = await Workspace.findById(wsId);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    // List of projects in workspace
    const projects = await Project.find({ workspaceId: wsId });
    const projectIds = projects.map((p) => p._id);

    // 1. Project Health Statuses
    const projectHealth = projects.reduce(
      (acc, project) => {
        acc[project.status] = (acc[project.status] || 0) + 1;
        return acc;
      },
      { active: 0, archived: 0, completed: 0 } as Record<string, number>
    );

    // 2. Member workload across all projects in workspace
    const workloadBreakdown = await Task.aggregate([
      { $match: { projectId: { $in: projectIds } } },
      { $unwind: "$assigneeIds" },
      {
        $group: {
          _id: "$assigneeIds",
          taskCount: { $sum: 1 },
          completedCount: {
            $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          userId: "$_id",
          name: "$userInfo.name",
          avatarUrl: "$userInfo.avatarUrl",
          taskCount: 1,
          completedCount: 1,
        },
      },
    ]);

    // 3. Task completions over time (completed tasks in last 30 days grouped by day)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const completionHistory = await Task.aggregate([
      {
        $match: {
          projectId: { $in: projectIds },
          status: "done",
          updatedAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
          completedCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        projectCount: projects.length,
        projectHealth,
        workloadBreakdown,
        completionHistory: completionHistory.map((ch) => ({
          day: ch._id,
          count: ch.completedCount,
        })),
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};
