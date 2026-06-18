import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: "task.assigned" | "comment.mention" | "sprint.started" | "task.due" | "project.added";
  message: string;
  link?: string;
  isRead: boolean;
  relatedEntity?: {
    entityType: "workspace" | "project" | "sprint" | "task" | "comment";
    entityId: mongoose.Types.ObjectId;
  };
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ["task.assigned", "comment.mention", "sprint.started", "task.due", "project.added"],
    },
    message: { type: String, required: true },
    link: { type: String },
    isRead: { type: Boolean, default: false, index: true },
    relatedEntity: {
      entityType: { type: String, enum: ["workspace", "project", "sprint", "task", "comment"] },
      entityId: { type: Schema.Types.ObjectId },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export default mongoose.model<INotification>("Notification", NotificationSchema);
