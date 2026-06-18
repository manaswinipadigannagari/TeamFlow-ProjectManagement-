import { IWorkspace } from "../models/Workspace";
import { IProject } from "../models/Project";

declare global {
  namespace Express {
    interface User {
      id: string;
      role: "admin" | "member";
    }

    interface Request {
      user?: User;
      workspace?: IWorkspace;
      project?: IProject;
    }
  }
}

export {};
