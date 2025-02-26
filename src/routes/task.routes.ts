import { Router } from "express";
import {
  createTask,
  getProjectTasks,
  updateTask,
  deleteTask,
} from "../controllers/task.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router({ mergeParams: true });

// Protected routes (authentication required)
router.route("/").post(verifyJWT, createTask); // Create a new task
router.route("/").get(verifyJWT, getProjectTasks); // Get all tasks for a project
router.route("/:taskId").patch(verifyJWT, updateTask); // Update a task
router.route("/:taskId").delete(verifyJWT, deleteTask); // Delete a task

export default router;
