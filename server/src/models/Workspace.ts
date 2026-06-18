import mongoose, { Schema, Document } from "mongoose";

export interface IWorkspaceMember {
  userId: mongoose.Types.ObjectId;
  role: "owner" | "admin" | "member" | "viewer";
  joinedAt: Date;
}

export interface IWorkspace extends Document {
  name: string;
  slug: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  logoUrl?: string;
  members: IWorkspaceMember[];
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceMemberSchema = new Schema<IWorkspaceMember>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  role: {
    type: String,
    enum: ["owner", "admin", "member", "viewer"],
    default: "member",
  },
  joinedAt: { type: Date, default: Date.now },
});

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: { type: String },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    logoUrl: { type: String, default: "" },
    members: [WorkspaceMemberSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IWorkspace>("Workspace", WorkspaceSchema);
