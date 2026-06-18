import { Response, NextFunction } from "express";
import { IContextRequest } from "../middleware/rbac";
import Workspace from "../models/Workspace";
import User from "../models/User";
import Project from "../models/Project";
import { BadRequestError, NotFoundError, ForbiddenError } from "../utils/errors";
import mongoose from "mongoose";

const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

export const createWorkspace = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description } = req.body;
    const ownerId = req.user?.id;

    if (!ownerId) {
      throw new ForbiddenError("Unauthenticated");
    }

    let slug = slugify(name);
    // Ensure slug uniqueness
    const slugExists = await Workspace.findOne({ slug });
    if (slugExists) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const workspace = await Workspace.create({
      name,
      slug,
      description,
      ownerId,
      members: [
        {
          userId: ownerId,
          role: "owner",
          joinedAt: new Date(),
        },
      ],
    });

    res.status(201).json({
      success: true,
      data: workspace,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaces = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenError("Unauthenticated");
    }

    // Find all workspaces where user is in members array
    const workspaces = await Workspace.find({
      "members.userId": userId,
    });

    res.status(200).json({
      success: true,
      data: workspaces,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceById = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workspace = req.workspace; // attached by requireWorkspaceRole middleware
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    // Populate members details
    const populatedWorkspace = await Workspace.findById(workspace._id).populate(
      "members.userId",
      "name email avatarUrl role"
    );

    res.status(200).json({
      success: true,
      data: populatedWorkspace,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorkspace = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workspace = req.workspace;
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    const { name, description } = req.body;
    if (name) {
      workspace.name = name;
      let newSlug = slugify(name);
      // Check if new slug conflicts with another workspace
      if (newSlug !== workspace.slug) {
        const slugExists = await Workspace.findOne({ slug: newSlug });
        if (slugExists) {
          newSlug = `${newSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        workspace.slug = newSlug;
      }
    }
    if (description !== undefined) {
      workspace.description = description;
    }

    await workspace.save();

    res.status(200).json({
      success: true,
      data: workspace,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteWorkspace = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workspace = req.workspace;
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    // Double check owner permissions
    if (workspace.ownerId.toString() !== req.user?.id && req.user?.role !== "admin") {
      throw new ForbiddenError("Only the workspace owner can delete a workspace");
    }

    await Workspace.findByIdAndDelete(workspace._id);

    // Clean up projects associated with workspace
    await Project.deleteMany({ workspaceId: workspace._id });

    res.status(200).json({
      success: true,
      data: { message: "Workspace and its projects deleted successfully" },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const inviteMember = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workspace = req.workspace;
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    const { email, role } = req.body;

    const invitedUser = await User.findOne({ email });
    if (!invitedUser) {
      throw new NotFoundError("User with this email is not registered in TeamFlow yet");
    }

    const isMember = workspace.members.some(
      (m) => m.userId.toString() === invitedUser._id.toString()
    );
    if (isMember) {
      throw new BadRequestError("User is already a member of this workspace");
    }

    workspace.members.push({
      userId: invitedUser._id as mongoose.Types.ObjectId,
      role,
      joinedAt: new Date(),
    });

    await workspace.save();

    // Re-query to get populated representation
    const updatedWorkspace = await Workspace.findById(workspace._id).populate(
      "members.userId",
      "name email avatarUrl role"
    );

    res.status(200).json({
      success: true,
      data: updatedWorkspace,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMemberRole = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workspace = req.workspace;
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    const { userId } = req.params;
    const { role } = req.body;

    // Check if target user is owner
    if (workspace.ownerId.toString() === userId) {
      throw new BadRequestError("Cannot modify the role of the workspace owner");
    }

    const member = workspace.members.find((m) => m.userId.toString() === userId);
    if (!member) {
      throw new NotFoundError("Member not found in workspace");
    }

    member.role = role;
    await workspace.save();

    res.status(200).json({
      success: true,
      data: workspace,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (
  req: IContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workspace = req.workspace;
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    const { userId } = req.params;

    if (workspace.ownerId.toString() === userId) {
      throw new BadRequestError("Cannot remove the workspace owner");
    }

    const memberIndex = workspace.members.findIndex((m) => m.userId.toString() === userId);
    if (memberIndex === -1) {
      throw new NotFoundError("Member not found in workspace");
    }

    workspace.members.splice(memberIndex, 1);
    await workspace.save();

    // Clean up member from projects under this workspace
    const projects = await Project.find({ workspaceId: workspace._id });
    for (const project of projects) {
      const pMemberIndex = project.members.findIndex((pm) => pm.userId.toString() === userId);
      if (pMemberIndex !== -1) {
        project.members.splice(pMemberIndex, 1);
        await project.save();
      }
    }

    res.status(200).json({
      success: true,
      data: workspace,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};
