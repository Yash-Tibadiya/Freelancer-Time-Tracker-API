import { Request, Response } from "express";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";

// Extend Request to include `user`
interface CustomRequest extends Request {
  user?: {
    _id: string;
  };
}

const createTask = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { name, description, assignedTo, project, startTime, endTime } =
    req.body;

  if (
    !name ||
    !description ||
    !assignedTo ||
    !project ||
    !startTime ||
    !endTime
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Validate project existence
  const existingProject = await Project.findById(project);
  if (!existingProject) {
    throw new ApiError(404, "Project not found");
  }

  // Validate assigned user existence
  const assignedUser = await User.findById(assignedTo);
  if (!assignedUser) {
    throw new ApiError(404, "Assigned user not found");
  }

  // Convert req.user?._id from string to ObjectId
  const userId = new mongoose.Types.ObjectId(req.user?._id);

  // Check if the user is part of the project
  if (
    !existingProject.users.some((id) => id.toString() === userId.toString())
  ) {
    throw new ApiError(
      403,
      "You don't have permission to create tasks for this project"
    );
  }

  const task = await Task.create({
    name,
    description,
    assignedTo,
    project,
    startTime,
    endTime,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, task, "Task created successfully"));
});

const getProjectTasks = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { projectId } = req.params;

    if (!projectId) {
      throw new ApiError(400, "Project ID is required");
    }

    // Validate project existence
    const project = await Project.findById(projectId);
    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    // Convert req.user?._id from string to ObjectId
    const userId = new mongoose.Types.ObjectId(req.user?._id);

    // Ensure user is part of the project
    if (!project.users.some((id) => id.toString() === userId.toString())) {
      throw new ApiError(
        403,
        "You don't have permission to view tasks for this project"
      );
    }

    const tasks = await Task.find({ project });

    return res
      .status(200)
      .json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
  }
);

const updateTask = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { taskId } = req.params;
  const { name, description, assignedTo, startTime, endTime } = req.body;

  if (!taskId) {
    throw new ApiError(400, "Task ID is required");
  }

  const task = await Task.findById(taskId);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const project = await Project.findById(task.project);
  // Convert req.user?._id from string to ObjectId
  const userId = new mongoose.Types.ObjectId(req.user?._id);

  // Ensure user is part of the project
  if (
    !project ||
    !project.users.some((id) => id.toString() === userId.toString())
  ) {
    throw new ApiError(403, "You don't have permission to update this task");
  }

  // If updating assigned user, validate existence
  if (assignedTo) {
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      throw new ApiError(404, "Assigned user not found");
    }
  }

  // Update task
  const updatedTask = await Task.findByIdAndUpdate(
    taskId,
    {
      $set: {
        name,
        description,
        assignedTo,
        startTime,
        endTime,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTask, "Task updated successfully"));
});

const deleteTask = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { taskId } = req.params;

  if (!taskId) {
    throw new ApiError(400, "Task ID is required");
  }

  const task = await Task.findById(taskId);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  // Convert req.user?._id from string to ObjectId
  const userId = new mongoose.Types.ObjectId(req.user?._id);
  // Fetch the project associated with the task
  const project = await Project.findById(task.project);

  // Ensure user is part of the project
  if (
    !project ||
    !project.users.some((id) => id.toString() === userId.toString())
  ) {
    throw new ApiError(403, "You don't have permission to delete this task");
  }

  await Task.findByIdAndDelete(taskId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Task deleted successfully"));
});

export { createTask, getProjectTasks, updateTask, deleteTask };
