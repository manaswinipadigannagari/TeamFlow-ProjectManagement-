import mongoose, { Schema, Document } from "mongoose";

export interface IAttachment {
  url: string;
  name: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

export interface ISubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface ITask extends Document {
  projectId: mongoose.Types.ObjectId;
  boardId: mongoose.Types.ObjectId;
  sprintId?: mongoose.Types.ObjectId | null;
  key: string;
  title: string;
  description?: string;
  status: string; // matches column id (e.g., "todo", "inprogress")
  priority: "low" | "medium" | "high" | "urgent";
  type: "task" | "bug" | "story" | "epic";
  assigneeIds: mongoose.Types.ObjectId[];
  reporterId: mongoose.Types.ObjectId;
  labels: string[];
  dueDate?: Date;
  estimate: number; // story points or hours
  parentTaskId?: mongoose.Types.ObjectId | null;
  attachments: IAttachment[];
  subtasks: ISubTask[];
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>({
  url: { type: String, required: true },
  name: { type: String, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const SubTaskSchema = new Schema<ISubTask>({
  id: { type: String, required: true },
  title: { type: String, required: true },
  isCompleted: { type: Boolean, default: false },
});

const TaskSchema = new Schema<ITask>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    boardId: { type: Schema.Types.ObjectId, ref: "Board", required: true, index: true },
    sprintId: { type: Schema.Types.ObjectId, ref: "Sprint", default: null, index: true },
    key: { type: String, required: true, index: true }, // e.g. ENG-12
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: { type: String, required: true, default: "todo", index: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    type: {
      type: String,
      enum: ["task", "bug", "story", "epic"],
      default: "task",
      index: true,
    },
    assigneeIds: [{ type: Schema.Types.ObjectId, ref: "User", default: [], index: true }],
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    labels: [{ type: String, default: [] }],
    dueDate: { type: Date },
    estimate: { type: Number, default: 0 },
    parentTaskId: { type: Schema.Types.ObjectId, ref: "Task", default: null, index: true },
    attachments: [AttachmentSchema],
    subtasks: [SubTaskSchema],
    position: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Compounded indexes for performance
TaskSchema.index({ projectId: 1, key: 1 }, { unique: true });
TaskSchema.index({ boardId: 1, status: 1, position: 1 });

export default mongoose.model<ITask>("Task", TaskSchema);
