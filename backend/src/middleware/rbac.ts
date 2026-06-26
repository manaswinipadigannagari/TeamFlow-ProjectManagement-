import { Request, Response, NextFunction } from "express";
import Workspace, { IWorkspace } from "../models/Workspace";
import Project, { IProject } from "../models/Project";
import Sprint from "../models/Sprint";
import Task from "../models/Task";
import Comment from "../models/Comment";
import { ForbiddenError, NotFoundError } from "../utils/errors";

// Extend Request type to hold current workspace and project contexts
export interface IContextRequest extends Request {
  workspace?: IWorkspace;
  project?: IProject;
}

export const requireWorkspaceRole = (roles: ("owner" | "admin" | "member" | "viewer")[]) => {
  return async (req: IContextRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ForbiddenError("Access denied: unauthenticated");
      }

      // Check workspace ID in parameters (id or wsId), query, or body
      let workspaceId =
        req.params.wsId || req.params.id || req.body.workspaceId || req.query.workspaceId;

      // If none of these, but we have a projectId, we can find the project and get its workspaceId
      const projectId = req.params.projectId || req.body.projectId || req.query.projectId;
      if (!workspaceId && projectId) {
        const project = await Project.findById(projectId);
        if (project) {
          workspaceId = project.workspaceId.toString();
        }
      }

      if (!workspaceId) {
        throw new ForbiddenError("Access denied: Workspace identifier is missing");
      }

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new NotFoundError("Workspace not found");
      }

      // Global admin override
      if (req.user?.role === "admin") {
        req.workspace = workspace;
        return next();
      }

      // Find member in workspace
      const member = workspace.members.find((m) => m.userId.toString() === userId);

      if (!member) {
        throw new ForbiddenError("Access denied: you are not a member of this workspace");
      }

      if (!roles.includes(member.role)) {
        throw new ForbiddenError("Access denied: insufficient workspace permissions");
      }

      req.workspace = workspace;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireProjectRole = (roles: ("admin" | "member" | "viewer")[]) => {
  return async (req: IContextRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ForbiddenError("Access denied: unauthenticated");
      }

      let projectId = req.params.projectId || req.body.projectId || req.query.projectId;

      // Auto-resolve project ID based on route structure and parameter patterns
      const idParam = req.params.id;
      const urlPath = req.baseUrl + req.path;

      if (!projectId && idParam) {
        if (urlPath.includes("/projects/")) {
          projectId = idParam;
        } else if (urlPath.includes("/sprints/")) {
          const sprint = await Sprint.findById(idParam);
          if (sprint) {
            projectId = sprint.projectId.toString();
          }
        } else if (urlPath.includes("/tasks/")) {
          const task = await Task.findById(idParam);
          if (task) {
            projectId = task.projectId.toString();
          }
        } else if (urlPath.includes("/comments/")) {
          const comment = await Comment.findById(idParam);
          if (comment) {
            const task = await Task.findById(comment.taskId);
            if (task) {
              projectId = task.projectId.toString();
            }
          }
        }
      }

      // If we are hitting a sub-route containing taskId (e.g. /tasks/:taskId/comments)
      if (!projectId && req.params.taskId) {
        const task = await Task.findById(req.params.taskId);
        if (task) {
          projectId = task.projectId.toString();
        }
      }

      if (!projectId) {
        throw new ForbiddenError("Access denied: Project identifier is missing");
      }

      const project = await Project.findById(projectId);
      if (!project) {
        throw new NotFoundError("Project not found");
      }

      // First check if user is a member of the workspace with Owner/Admin role - they override project access
      const workspace = await Workspace.findById(project.workspaceId);
      if (workspace) {
        const wsMember = workspace.members.find((m) => m.userId.toString() === userId);
        if (wsMember && (wsMember.role === "owner" || wsMember.role === "admin")) {
          req.workspace = workspace;
          req.project = project;
          return next();
        }
      }

      // Global admin override
      if (req.user?.role === "admin") {
        req.project = project;
        return next();
      }

      // Check project specific membership
      const pMember = project.members.find((m) => m.userId.toString() === userId);

      if (!pMember) {
        throw new ForbiddenError("Access denied: you are not a member of this project");
      }

      if (!roles.includes(pMember.role)) {
        throw new ForbiddenError("Access denied: insufficient project permissions");
      }

      req.project = project;
      next();
    } catch (error) {
      next(error);
    }
  };
};
