import { Response, NextFunction } from "express";
import { IContextRequest } from "../middleware/rbac";
import Project from "../models/Project";
import Workspace from "../models/Workspace";
import Board from "../models/Board";
import Task from "../models/Task";
import Sprint from "../models/Sprint";
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from "../utils/errors";
import mongoose from "mongoose";

export const createProject = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, key, description, startDate, endDate, color, icon } = req.body;
    const { wsId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ForbiddenError("Unauthenticated");
    }

    // Verify workspace exists
    const workspace = await Workspace.findById(wsId);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    // Check if project key already exists in this workspace
    const projectKeyExists = await Project.findOne({ workspaceId: wsId, key: key.toUpperCase() });
    if (projectKeyExists) {
      throw new ConflictError("A project with this key already exists in this workspace");
    }

    // Create the project. The creator is added as a project admin
    const project = await Project.create({
      workspaceId: wsId,
      name,
      key: key.toUpperCase(),
      description,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      color,
      icon,
      members: [
        {
          userId,
          role: "admin",
        },
      ],
    });

    // Automatically initialize a default Kanban board for this project
    await Board.create({
      projectId: project._id,
      name: `${name} Board`,
      columns: [
        { id: "backlog", name: "Backlog", order: 0, taskIds: [] },
        { id: "todo", name: "To Do", order: 1, taskIds: [] },
        { id: "inprogress", name: "In Progress", order: 2, taskIds: [] },
        { id: "inreview", name: "In Review", order: 3, taskIds: [] },
        { id: "done", name: "Done", order: 4, taskIds: [] },
      ],
    });

    res.status(201).json({
      success: true,
      data: project,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceProjects = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { wsId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ForbiddenError("Unauthenticated");
    }

    const workspace = await Workspace.findById(wsId);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    // Check if user is Workspace Owner or Admin. If so, they see all projects.
    const wsMember = workspace.members.find((m) => m.userId.toString() === userId);
    const hasFullAccess =
      req.user?.role === "admin" ||
      (wsMember && (wsMember.role === "owner" || wsMember.role === "admin"));

    let projects;
    if (hasFullAccess) {
      projects = await Project.find({ workspaceId: wsId });
    } else {
      // Regular members see only projects they are assigned to
      projects = await Project.find({
        workspaceId: wsId,
        "members.userId": userId,
      });
    }

    res.status(200).json({
      success: true,
      data: projects,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const project = req.project; // attached by requireProjectRole
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const populatedProject = await Project.findById(project._id).populate(
      "members.userId",
      "name email avatarUrl role"
    );

    res.status(200).json({
      success: true,
      data: populatedProject,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const project = req.project;
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const { name, description, status, startDate, endDate, color, icon } = req.body;

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (status) project.status = status;
    if (startDate !== undefined) project.startDate = startDate ? new Date(startDate) : undefined;
    if (endDate !== undefined) project.endDate = endDate ? new Date(endDate) : undefined;
    if (color) project.color = color;
    if (icon) project.icon = icon;

    await project.save();

    res.status(200).json({
      success: true,
      data: project,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const project = req.project;
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    await Project.findByIdAndDelete(project._id);

    // Clean up Board, Sprints, Tasks
    await Board.findOneAndDelete({ projectId: project._id });
    await Sprint.deleteMany({ projectId: project._id });
    await Task.deleteMany({ projectId: project._id });

    res.status(200).json({
      success: true,
      data: { message: "Project and its boards/sprints/tasks deleted successfully" },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectBoard = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const project = req.project;
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const board = await Board.findOne({ projectId: project._id }).populate({
      path: "columns.taskIds",
      model: "Task",
      populate: {
        path: "assigneeIds",
        select: "name email avatarUrl",
      },
    });

    if (!board) {
      throw new NotFoundError("Board not found for this project");
    }

    res.status(200).json({
      success: true,
      data: board,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBoardColumns = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const project = req.project;
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const { columns } = req.body; // Array of IBoardColumn input
    if (!Array.isArray(columns)) {
      throw new BadRequestError("Columns payload must be an array");
    }

    const board = await Board.findOne({ projectId: project._id });
    if (!board) {
      throw new NotFoundError("Board not found");
    }

    // Standard column formatting update (e.g. updating order or titles)
    board.columns = columns.map((col: any) => ({
      id: col.id,
      name: col.name,
      order: col.order,
      wipLimit: col.wipLimit,
      taskIds: col.taskIds ? col.taskIds.map((id: string) => new mongoose.Types.ObjectId(id)) : [],
    }));

    await board.save();

    res.status(200).json({
      success: true,
      data: board,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const addProjectMember = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const project = req.project;
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const { userId, role } = req.body;

    // Check if target user is in the parent workspace first
    const workspace = await Workspace.findById(project.workspaceId);
    if (!workspace) {
      throw new NotFoundError("Parent workspace not found");
    }

    const inWorkspace = workspace.members.some((m) => m.userId.toString() === userId);
    if (!inWorkspace) {
      throw new BadRequestError(
        "User must be added to the Workspace before being invited to this project"
      );
    }

    // Check if already in project
    const inProject = project.members.some((m) => m.userId.toString() === userId);
    if (inProject) {
      throw new BadRequestError("User is already a member of this project");
    }

    project.members.push({
      userId: new mongoose.Types.ObjectId(userId),
      role: role || "member",
    });

    await project.save();

    const populatedProject = await Project.findById(project._id).populate(
      "members.userId",
      "name email avatarUrl role"
    );

    res.status(200).json({
      success: true,
      data: populatedProject,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const removeProjectMember = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const project = req.project;
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const { userId } = req.params;

    const memberIndex = project.members.findIndex((m) => m.userId.toString() === userId);
    if (memberIndex === -1) {
      throw new NotFoundError("Member not found in this project");
    }

    // Don't allow removing the last admin in the project
    const member = project.members[memberIndex];
    if (member.role === "admin") {
      const adminCount = project.members.filter((m) => m.role === "admin").length;
      if (adminCount <= 1) {
        throw new BadRequestError("Cannot remove the last project administrator");
      }
    }

    project.members.splice(memberIndex, 1);
    await project.save();

    res.status(200).json({
      success: true,
      data: project,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};
