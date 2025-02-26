import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITask extends Document {
  name: string;
  description: string;
  assignedTo: Schema.Types.ObjectId;
  project: Schema.Types.ObjectId;
  startTime: Date;
  endTime: Date;
}

const taskSchema = new Schema<ITask>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Task: Model<ITask> = mongoose.model<ITask>("Task", taskSchema);
export default Task;
