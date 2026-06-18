import mongoose, { Schema, Document } from "mongoose";

export interface ISprint extends Document {
  projectId: mongoose.Types.ObjectId;
  name: string;
  goal?: string;
  startDate: Date;
  endDate: Date;
  status: "planned" | "active" | "completed";
  taskIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const SprintSchema = new Schema<ISprint>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    name: { type: String, required: true, trim: true },
    goal: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["planned", "active", "completed"],
      default: "planned",
    },
    taskIds: [{ type: Schema.Types.ObjectId, ref: "Task", default: [] }],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISprint>("Sprint", SprintSchema);
