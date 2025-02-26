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
  const { name, description, assignedTo, startTime, endTime } = req.body;
  const { projectId } = req.params;

  if (!name || !description || !assignedTo || !startTime || !endTime) {
    throw new ApiError(400, "All fields are required");
  }

  // Validate project existence
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Validate assigned user existence
  const assignedUser = await User.findById(assignedTo);
  if (!assignedUser) {
    throw new ApiError(404, "Assigned user not found");
  }

  // Convert req.user?._id from string to ObjectId
  const userId = new mongoose.Types.ObjectId(req.user?._id);

  // Ensure the creator is part of the project
  if (!project.users.some((id) => id.toString() === userId.toString())) {
    throw new ApiError(
      403,
      "You don't have permission to create tasks for this project"
    );
  }

  // Create the task
  const task = await Task.create({
    name,
    description,
    assignedTo,
    project: projectId,
    startTime,
    endTime,
  });

  // Add the task to the project's tasks array
  await Project.findByIdAndUpdate(
    projectId,
    { $push: { tasks: task._id } },
    { new: true }
  );

  return res
    .status(201)
    .json(new ApiResponse(201, task, "Task created successfully"));
});

const getProjectTasks = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { projectId } = req.params;

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

    const tasks = await Task.find({ project: projectId });

    return res
      .status(200)
      .json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
  }
);

const updateTask = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { projectId, taskId } = req.params;
  const { name, description, assignedTo, startTime, endTime } = req.body;

  const task = await Task.findById(taskId);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Convert req.user?._id from string to ObjectId
  const userId = new mongoose.Types.ObjectId(req.user?._id);

  // Ensure user is part of the project
  if (!project.users.some((id) => id.toString() === userId.toString())) {
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
  const { projectId, taskId } = req.params;

  const task = await Task.findById(taskId);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Convert req.user?._id from string to ObjectId
  const userId = new mongoose.Types.ObjectId(req.user?._id);

  // Ensure user is part of the project
  if (!project.users.some((id) => id.toString() === userId.toString())) {
    throw new ApiError(403, "You don't have permission to delete this task");
  }

  await Task.findByIdAndDelete(taskId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Task deleted successfully"));
});

export { createTask, getProjectTasks, updateTask, deleteTask };
