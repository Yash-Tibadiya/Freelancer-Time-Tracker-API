import { Router } from "express";
import {
  createProject,
  updateProject,
  deleteProject,
  changeProjectStatus,
  getAllUserProjects,
} from "../controllers/project.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// Protected routes (authentication required)
router.route("/").post(verifyJWT, createProject); // Create a new project
router.route("/").get(verifyJWT, getAllUserProjects); // Get all projects of the logged-in user
router.route("/:projectId").patch(verifyJWT, updateProject); // Update a project
router.route("/:projectId").delete(verifyJWT, deleteProject); // Delete a project
router.route("/:projectId/status").patch(verifyJWT, changeProjectStatus); // Change project status

export default router;