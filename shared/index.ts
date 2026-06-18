export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  avatarUrl?: string;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  userId: string | User;
  role: "owner" | "admin" | "member" | "viewer";
  joinedAt: string;
}

export interface Workspace {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  logoUrl?: string;
  members: WorkspaceMember[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  userId: string | User;
  role: "admin" | "member" | "viewer";
}

export interface Project {
  _id: string;
  workspaceId: string;
  name: string;
  key: string;
  description?: string;
  status: "active" | "archived" | "completed";
  startDate?: string;
  endDate?: string;
  members: ProjectMember[];
  color: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAttachment {
  url: string;
  name: string;
  uploadedBy: string | User;
  uploadedAt: string;
}

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  _id: string;
  projectId: string;
  boardId: string;
  sprintId?: string | null;
  key: string;
  title: string;
  description?: string;
  status: string;
  priority: "low" | "medium" | "high" | "urgent";
  type: "task" | "bug" | "story" | "epic";
  assigneeIds: User[];
  reporterId: string | User;
  labels: string[];
  dueDate?: string;
  estimate: number;
  parentTaskId?: string | Task | null;
  attachments: TaskAttachment[];
  subtasks: SubTask[];
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoardColumn {
  id: string;
  name: string;
  order: number;
  taskIds: Task[];
  wipLimit?: number;
}

export interface Board {
  _id: string;
  projectId: string;
  name: string;
  columns: BoardColumn[];
  createdAt: string;
  updatedAt: string;
}

export interface Sprint {
  _id: string;
  projectId: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  status: "planned" | "active" | "completed";
  taskIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  taskId: string;
  authorId: User;
  body: string;
  mentions: string[];
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  _id: string;
  workspaceId: string;
  projectId?: string;
  actorId: User;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  type: "task.assigned" | "comment.mention" | "sprint.started" | "task.due" | "project.added";
  message: string;
  link?: string;
  isRead: boolean;
  relatedEntity?: {
    entityType: string;
    entityId: string;
  };
  createdAt: string;
}
