import mongoose, { Schema, Document } from "mongoose";

export interface IActivityLog extends Document {
  workspaceId: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  action: string; // e.g., 'task.created', 'task.moved', 'member.added'
  targetType: "workspace" | "project" | "board" | "sprint" | "task" | "comment" | "member";
  targetId: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true },
    targetType: {
      type: String,
      required: true,
      enum: ["workspace", "project", "board", "sprint", "task", "comment", "member"],
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    metadata: { type: Schema.Types.Map, of: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    // Disable default timestamps since we only need createdAt for chronological logs
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export default mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
