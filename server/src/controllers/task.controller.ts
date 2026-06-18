import { Response, NextFunction } from "express";
import { IContextRequest } from "../middleware/rbac";
import Task from "../models/Task";
import Project from "../models/Project";
import Board from "../models/Board";
import Sprint from "../models/Sprint";
import { BadRequestError, NotFoundError, ForbiddenError } from "../utils/errors";
import mongoose from "mongoose";
import { emitToRoom } from "../config/socket";

export const createTask = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { title, description, status, priority, type, assigneeIds, dueDate, estimate, sprintId } =
      req.body;
    const reporterId = req.user?.id;

    if (!reporterId) {
      throw new ForbiddenError("Unauthenticated");
    }

    const project = await Project.findById(projectId);
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // Determine task key by counting tasks in this project
    const taskCount = await Task.countDocuments({ projectId });
    const taskKey = `${project.key}-${taskCount + 1}`;

    const parsedAssignees = assigneeIds
      ? assigneeIds.map((id: string) => new mongoose.Types.ObjectId(id))
      : [];

    const task = await Task.create({
      projectId,
      boardId: null, // We'll resolve and attach boardId
      sprintId: sprintId ? new mongoose.Types.ObjectId(sprintId) : null,
      key: taskKey,
      title,
      description,
      status: status || "todo",
      priority,
      type,
      assigneeIds: parsedAssignees,
      reporterId: new mongoose.Types.ObjectId(reporterId),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      estimate,
      position: 0,
      attachments: [],
      subtasks: [],
    });

    // Resolve Board
    const board = await Board.findOne({ projectId });
    if (!board) {
      await Task.findByIdAndDelete(task._id);
      throw new NotFoundError("Kanban Board not initialized for this project");
    }

    // Attach boardId
    task.boardId = board._id as mongoose.Types.ObjectId;

    // Determine task position in the column
    const column = board.columns.find((col) => col.id === task.status);
    if (!column) {
      await Task.findByIdAndDelete(task._id);
      throw new BadRequestError(`Column "${task.status}" does not exist on this board`);
    }

    task.position = column.taskIds.length;
    await task.save();

    // Push into board column taskIds
    column.taskIds.push(task._id as mongoose.Types.ObjectId);
    await board.save();

    // Push into Sprint taskIds if mapped
    if (sprintId) {
      const sprint = await Sprint.findById(sprintId);
      if (sprint) {
        sprint.taskIds.push(task._id as mongoose.Types.ObjectId);
        await sprint.save();
      }
    }

    const populatedTask = await Task.findById(task._id)
      .populate("assigneeIds", "name email avatarUrl")
      .populate("reporterId", "name email avatarUrl");

    // Real-time socket event broadcast
    emitToRoom(`project:${projectId}`, "task:created", populatedTask);

    res.status(201).json({
      success: true,
      data: populatedTask,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectTasks = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { assigneeId, priority, type, sprintId, search, status } = req.query;

    const query: Record<string, any> = { projectId };

    if (assigneeId) {
      query.assigneeIds = new mongoose.Types.ObjectId(assigneeId as string);
    }
    if (priority) {
      query.priority = priority;
    }
    if (type) {
      query.type = type;
    }
    if (status) {
      query.status = status;
    }

    // Sprint filtering handles 'null' (backlog query string) or actual IDs
    if (sprintId === "null") {
      query.sprintId = null;
    } else if (sprintId) {
      query.sprintId = new mongoose.Types.ObjectId(sprintId as string);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { key: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const tasks = await Task.find(query)
      .populate("assigneeIds", "name email avatarUrl")
      .populate("reporterId", "name email avatarUrl")
      .sort({ position: 1 });

    res.status(200).json({
      success: true,
      data: tasks,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate("assigneeIds", "name email avatarUrl")
      .populate("reporterId", "name email avatarUrl")
      .populate("parentTaskId", "title key status");

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    res.status(200).json({
      success: true,
      data: task,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      status,
      priority,
      type,
      assigneeIds,
      dueDate,
      estimate,
      sprintId,
      subtasks,
    } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      throw new NotFoundError("Task not found");
    }

    const oldStatus = task.status;
    const oldSprintId = task.sprintId;

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority) task.priority = priority;
    if (type) task.type = type;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (estimate !== undefined) task.estimate = estimate;
    if (subtasks) task.subtasks = subtasks;

    if (assigneeIds) {
      task.assigneeIds = assigneeIds.map((idStr: string) => new mongoose.Types.ObjectId(idStr));
    }

    // Handle sprint changes
    if (sprintId !== undefined) {
      const targetSprintId = sprintId ? new mongoose.Types.ObjectId(sprintId) : null;
      if (String(oldSprintId) !== String(targetSprintId)) {
        task.sprintId = targetSprintId;

        // Pull task from old sprint
        if (oldSprintId) {
          await Sprint.findByIdAndUpdate(oldSprintId, { $pull: { taskIds: task._id } });
        }
        // Push task into new sprint
        if (targetSprintId) {
          await Sprint.findByIdAndUpdate(targetSprintId, { $addToSet: { taskIds: task._id } });
        }
      }
    }

    // Handle status changes (column change on board)
    if (status && status !== oldStatus) {
      task.status = status;

      const board = await Board.findById(task.boardId);
      if (board) {
        // Pull task from old column
        const oldCol = board.columns.find((c) => c.id === oldStatus);
        if (oldCol) {
          oldCol.taskIds = oldCol.taskIds.filter((tId) => tId.toString() !== task._id.toString());
        }

        // Push task to new column
        const newCol = board.columns.find((c) => c.id === status);
        if (newCol) {
          newCol.taskIds.push(task._id as mongoose.Types.ObjectId);
          task.position = newCol.taskIds.length - 1;
        }
        await board.save();
      }
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assigneeIds", "name email avatarUrl")
      .populate("reporterId", "name email avatarUrl");

    // Socket notification
    emitToRoom(`project:${task.projectId}`, "task:updated", populatedTask);

    res.status(200).json({
      success: true,
      data: populatedTask,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const moveTask = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { columnId, position, sprintId } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      throw new NotFoundError("Task not found");
    }

    const oldStatus = task.status;
    const oldSprintId = task.sprintId;
    const projectId = task.projectId;

    const board = await Board.findOne({ projectId });
    if (!board) {
      throw new NotFoundError("Board not found");
    }

    // Step 1: Remove task from its old column on the board
    const oldCol = board.columns.find((c) => c.id === oldStatus);
    if (oldCol) {
      oldCol.taskIds = oldCol.taskIds.filter((tId) => tId.toString() !== task._id.toString());
    }

    // Step 2: Insert task into its new column at target position
    const newCol = board.columns.find((c) => c.id === columnId);
    if (!newCol) {
      throw new BadRequestError(`Column "${columnId}" does not exist on this project board`);
    }

    // Insert task at specific index position
    newCol.taskIds.splice(position, 0, task._id as mongoose.Types.ObjectId);

    // Save board
    await board.save();

    // Step 3: Update position indices in the database for tasks in this column
    const updatePromises = newCol.taskIds.map((tId, idx) =>
      Task.findByIdAndUpdate(tId, { $set: { position: idx } })
    );
    await Promise.all(updatePromises);

    // Step 4: Handle sprint transition if sprintId is provided or changes
    if (sprintId !== undefined) {
      const targetSprintId = sprintId ? new mongoose.Types.ObjectId(sprintId) : null;
      if (String(oldSprintId) !== String(targetSprintId)) {
        task.sprintId = targetSprintId;

        // Remove from old sprint
        if (oldSprintId) {
          await Sprint.findByIdAndUpdate(oldSprintId, { $pull: { taskIds: task._id } });
        }
        // Add to new sprint
        if (targetSprintId) {
          await Sprint.findByIdAndUpdate(targetSprintId, { $addToSet: { taskIds: task._id } });
        }
      }
    }

    // Step 5: Update the moved task document attributes
    task.status = columnId;
    task.position = position;
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assigneeIds", "name email avatarUrl")
      .populate("reporterId", "name email avatarUrl");

    // Real-time broadcast for other project viewers
    emitToRoom(`project:${projectId}`, "task:moved", {
      task: populatedTask,
      columnId,
      position,
      sprintId,
    });

    res.status(200).json({
      success: true,
      data: populatedTask,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      throw new NotFoundError("Task not found");
    }

    const { projectId, status, sprintId } = task;

    await Task.findByIdAndDelete(id);

    // Clean up Board references
    const board = await Board.findOne({ projectId });
    if (board) {
      const col = board.columns.find((c) => c.id === status);
      if (col) {
        col.taskIds = col.taskIds.filter((tId) => tId.toString() !== id);
        await board.save();
      }
    }

    // Clean up Sprint references
    if (sprintId) {
      await Sprint.findByIdAndUpdate(sprintId, { $pull: { taskIds: id } });
    }

    // Socket notification
    emitToRoom(`project:${projectId}`, "task:deleted", { taskId: id });

    res.status(200).json({
      success: true,
      data: { message: "Task deleted successfully" },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};
