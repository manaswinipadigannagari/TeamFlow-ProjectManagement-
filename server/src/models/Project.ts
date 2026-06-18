import mongoose, { Schema, Document } from "mongoose";

export interface IProjectMember {
  userId: mongoose.Types.ObjectId;
  role: "admin" | "member" | "viewer";
}

export interface IProject extends Document {
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  key: string;
  description?: string;
  status: "active" | "archived" | "completed";
  startDate?: Date;
  endDate?: Date;
  members: IProjectMember[];
  color: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectMemberSchema = new Schema<IProjectMember>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  role: {
    type: String,
    enum: ["admin", "member", "viewer"],
    default: "member",
  },
});

const ProjectSchema = new Schema<IProject>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
    key: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: { type: String },
    status: {
      type: String,
      enum: ["active", "archived", "completed"],
      default: "active",
    },
    startDate: { type: Date },
    endDate: { type: Date },
    members: [ProjectMemberSchema],
    color: { type: String, default: "#4865f5" },
    icon: { type: String, default: "Folder" },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure project keys are unique within a workspace
ProjectSchema.index({ workspaceId: 1, key: 1 }, { unique: true });

export default mongoose.model<IProject>("Project", ProjectSchema);
