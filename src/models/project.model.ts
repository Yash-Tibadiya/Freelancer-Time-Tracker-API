import mongoose, { Schema, Document, Model } from "mongoose";

// Define the allowed statuses
export type ProjectStatus = "active" | "completed" | "archived";

export interface IProject extends Document {
  name: string;
  description: string;
  status: ProjectStatus;
  tasks: Schema.Types.ObjectId[];
  users: Schema.Types.ObjectId[];
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      required: true,
      default: "active",
    },
    tasks: [
      {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Project: Model<IProject> = mongoose.model<IProject>(
  "Project",
  projectSchema
);
export default Project;
