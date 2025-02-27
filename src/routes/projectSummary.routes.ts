import { Router } from "express";
import {
  getAllProjectsSummary,
  getProjectSummary,
} from "../controllers/projectSummary.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// Protected routes (authentication required)
router.route("/get-summary").get(verifyJWT, getAllProjectsSummary); // Get summary of all projects
router.route("/get-summary/:projectId").get(verifyJWT, getProjectSummary); // Get summary of a specific project

export default router;
