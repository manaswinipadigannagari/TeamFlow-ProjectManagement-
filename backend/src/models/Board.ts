import mongoose, { Schema, Document } from "mongoose";

export interface IBoardColumn {
  id: string;
  name: string;
  order: number;
  taskIds: mongoose.Types.ObjectId[];
  wipLimit?: number;
}

export interface IBoard extends Document {
  projectId: mongoose.Types.ObjectId;
  name: string;
  columns: IBoardColumn[];
  createdAt: Date;
  updatedAt: Date;
}

const BoardColumnSchema = new Schema<IBoardColumn>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  order: { type: Number, required: true },
  taskIds: [{ type: Schema.Types.ObjectId, ref: "Task", default: [] }],
  wipLimit: { type: Number },
});

const BoardSchema = new Schema<IBoard>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true, default: "Kanban Board" },
    columns: [BoardColumnSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IBoard>("Board", BoardSchema);
