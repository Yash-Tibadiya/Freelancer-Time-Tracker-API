import { Request, Response } from "express";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import Project from "../models/project.model.js";
import User from "../models/user.model.js";

// Extend Request to include `user` field
interface CustomRequest extends Request {
  user?: {
    _id: string;
  };
}

const createProject = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { name, description } = req.body;

    if (!name || !description) {
      throw new ApiError(400, "All fields are required");
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Create project without explicitly setting status (using default from model)
    // and automatically add the creator's ID to users array
    const project = await Project.create({
      name,
      description,
      users: [user._id],
    });

    // Add project to user's Projects array
    await User.findByIdAndUpdate(
      user._id,
      { $push: { Projects: project._id } },
      { new: true }
    );

    return res
      .status(201)
      .json(new ApiResponse(201, project, "Project created successfully"));
  }
);

const updateProject = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { projectId } = req.params;
    const { name, description, status } = req.body;

    if (!projectId) {
      throw new ApiError(400, "Project ID is required");
    }

    // Check if at least one field to update is provided
    if (!(name || description || status)) {
      throw new ApiError(400, "At least one field is required for update");
    }

    // If status is provided, validate it
    if (status && !["active", "completed", "archived"].includes(status)) {
      throw new ApiError(400, "Invalid status value");
    }

    // Find the project
    const project = await Project.findById(projectId);

    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    // Convert req.user?._id from string to ObjectId
    const userId = new mongoose.Types.ObjectId(req.user?._id);

    // Check if the user is part of the project
    if (!project.users.some((id) => id.toString() === userId.toString())) {
      throw new ApiError(
        403,
        "You don't have permission to update this project"
      );
    }

    // Update the project
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      {
        $set: {
          name,
          description,
          status,
        },
      },
      { new: true }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedProject, "Project updated successfully")
      );
  }
);

const deleteProject = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { projectId } = req.params;

    if (!projectId) {
      throw new ApiError(400, "Project ID is required");
    }

    // Find the project
    const project = await Project.findById(projectId);

    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    // Convert req.user?._id from string to ObjectId
    const userId = new mongoose.Types.ObjectId(req.user?._id);

    // Check if the user is part of the project
    if (!project.users.some((id) => id.toString() === userId.toString())) {
      throw new ApiError(
        403,
        "You don't have permission to delete this project"
      );
    }

    // Remove project from all associated users' Projects arrays
    await User.updateMany(
      { _id: { $in: project.users } },
      { $pull: { Projects: projectId } }
    );

    // Delete the project
    await Project.findByIdAndDelete(projectId);

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Project deleted successfully"));
  }
);

const changeProjectStatus = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { projectId } = req.params;
    const { status } = req.body;

    if (!projectId || !status) {
      throw new ApiError(400, "Project ID and status are required");
    }

    // Validate status
    if (!["active", "completed", "archived"].includes(status)) {
      throw new ApiError(400, "Invalid status value");
    }

    // Find the project
    const project = await Project.findById(projectId);

    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    // Convert req.user?._id from string to ObjectId
    const userId = new mongoose.Types.ObjectId(req.user?._id);

    // Check if the user is part of the project
    if (!project.users.some((id) => id.toString() === userId.toString())) {
      throw new ApiError(
        403,
        "You don't have permission to update this project status"
      );
    }

    // Update project status
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $set: { status } },
      { new: true }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedProject,
          `Project status changed to ${status}`
        )
      );
  }
);

const getAllUserProjects = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const user = await User.findById(req.user?._id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Fetch projects and populate the "tasks" field
    const projects = await Project.find({ users: user._id }).populate("tasks");

    return res
      .status(200)
      .json(
        new ApiResponse(200, projects, "User projects fetched successfully")
      );
  }
);

export {
  createProject,
  updateProject,
  deleteProject,
  changeProjectStatus,
  getAllUserProjects,
};
