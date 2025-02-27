import { Request, Response } from "express";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createObjectCsvWriter } from "csv-writer";
import path from "path";
import fs from "fs";
import os from "os";

import Project from "../models/project.model.js";
import User, { IUser } from "../models/user.model.js";
import { ITask } from "../models/task.model.js";

// Extend Request to include `user` field
interface CustomRequest extends Request {
  user?: {
    _id: string;
  };
}

// Helper function to calculate task duration in hours
const calculateTaskDuration = (startTime: Date, endTime: Date): number => {
  const durationMs = endTime.getTime() - startTime.getTime();
  return parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2)); // Convert to hours with 2 decimal places
};

// Get summary of all projects
const getAllProjectsSummary = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    // Find the user
    const user = await User.findById(req.user?._id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Get all projects that the user is a part of
    const projects = await Project.find({ users: user._id })
      .populate<{ users: IUser[] }>("users", "fullName username email")
      .populate<{ tasks: ITask[] }>({
        path: "tasks",
        populate: {
          path: "assignedTo",
          select: "fullName username",
        },
      })
      .exec();

    if (!projects.length) {
      throw new ApiError(404, "No projects found");
    }

    // Create a temporary directory for the CSV file
    const tempDir = os.tmpdir();
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const csvFilePath = path.join(
      tempDir,
      `all-projects-summary-${timestamp}.csv`
    );

    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: csvFilePath,
      header: [
        { id: "projectName", title: "Project Name" },
        { id: "projectDescription", title: "Project Description" },
        { id: "projectStatus", title: "Project Status" },
        { id: "projectCreatedAt", title: "Project Created At" },
        { id: "projectUsers", title: "Project Users" },
        { id: "totalTasks", title: "Total Tasks" },
        { id: "completedTasks", title: "Completed Tasks" },
        { id: "totalHours", title: "Total Hours" },
        { id: "taskName", title: "Task Name" },
        { id: "taskDescription", title: "Task Description" },
        { id: "taskAssignedTo", title: "Task Assigned To" },
        { id: "taskStartTime", title: "Task Start Time" },
        { id: "taskEndTime", title: "Task End Time" },
        { id: "taskDuration", title: "Task Duration (hours)" },
      ],
    });

    // Prepare data for CSV
    const csvData: any[] = [];

    for (const project of projects) {
      let totalProjectHours = 0;
      const projectUsers = project.users
        .map((user: any) => user.fullName)
        .join(", ");

      // Calculate completed tasks
      const completedTasks = project.tasks.filter(
        (task: any) => new Date(task.endTime) < new Date()
      ).length;

      if (project.tasks.length === 0) {
        // If project has no tasks, add a single row with project info
        csvData.push({
          projectName: project.name,
          projectDescription: project.description,
          projectStatus: project.status,
          projectCreatedAt: project.createdAt.toISOString().split("T")[0],
          projectUsers: projectUsers,
          totalTasks: 0,
          completedTasks: 0,
          totalHours: 0,
          taskName: "No tasks",
          taskDescription: "",
          taskAssignedTo: "",
          taskStartTime: "",
          taskEndTime: "",
          taskDuration: "",
        });
      } else {
        // Add each task as a row
        for (const task of project.tasks) {
          const taskDuration = calculateTaskDuration(
            new Date(task.startTime),
            new Date(task.endTime)
          );
          totalProjectHours += taskDuration;

          csvData.push({
            projectName: project.name,
            projectDescription: project.description,
            projectStatus: project.status,
            projectCreatedAt: project.createdAt.toISOString().split("T")[0],
            projectUsers: projectUsers,
            totalTasks: project.tasks.length,
            completedTasks: completedTasks,
            totalHours: totalProjectHours.toFixed(2),
            taskName: task.name,
            taskDescription: task.description,
            taskAssignedTo: task.assignedTo?.fullName || "Unassigned",
            taskStartTime: new Date(task.startTime).toISOString().split("T")[0],
            taskEndTime: new Date(task.endTime).toISOString().split("T")[0],
            taskDuration: taskDuration.toFixed(2),
          });
        }
      }
    }

    // Write to CSV file
    await csvWriter.writeRecords(csvData);

    // Send file as download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="all-projects-summary-${timestamp}.csv"`
    );

    const fileStream = fs.createReadStream(csvFilePath);
    fileStream.pipe(res);

    // Clean up file after sending
    fileStream.on("end", () => {
      fs.unlinkSync(csvFilePath);
    });
  }
);

// Get summary of a specific project
const getProjectSummary = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { projectId } = req.params;

    // Validate projectId
    if (!projectId) {
      throw new ApiError(400, "Project ID is required");
    }

    // Find the project
    const project = await Project.findById(projectId)
      .populate<{ users: IUser[] }>("users", "fullName username email")
      .populate<{ tasks: ITask[] }>({
        path: "tasks",
        populate: {
          path: "assignedTo",
          select: "fullName username",
        },
      })
      .exec();

    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    // Convert req.user?._id from string to ObjectId
    const userId = new mongoose.Types.ObjectId(req.user?._id);

    // Check if the user is part of the project
    if (
      !project.users.some((id: any) => id._id.toString() === userId.toString())
    ) {
      throw new ApiError(
        403,
        "You don't have permission to access this project's summary"
      );
    }

    // Create a temporary directory for the CSV file
    const tempDir = os.tmpdir();
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const csvFilePath = path.join(
      tempDir,
      `project-summary-${project.name}-${timestamp}.csv`
    );

    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: csvFilePath,
      header: [
        { id: "projectName", title: "Project Name" },
        { id: "projectDescription", title: "Project Description" },
        { id: "projectStatus", title: "Project Status" },
        { id: "projectCreatedAt", title: "Project Created At" },
        { id: "projectUsers", title: "Project Users" },
        { id: "totalTasks", title: "Total Tasks" },
        { id: "completedTasks", title: "Completed Tasks" },
        { id: "totalHours", title: "Total Hours" },
        { id: "taskName", title: "Task Name" },
        { id: "taskDescription", title: "Task Description" },
        { id: "taskAssignedTo", title: "Task Assigned To" },
        { id: "taskStartTime", title: "Task Start Time" },
        { id: "taskEndTime", title: "Task End Time" },
        { id: "taskDuration", title: "Task Duration (hours)" },
      ],
    });

    // Prepare data for CSV
    const csvData: any[] = [];
    let totalProjectHours = 0;
    const projectUsers = project.users
      .map((user: any) => user.fullName)
      .join(", ");

    // Calculate completed tasks
    const completedTasks = project.tasks.filter(
      (task: any) => new Date(task.endTime) < new Date()
    ).length;

    if (project.tasks.length === 0) {
      // If project has no tasks, add a single row with project info
      csvData.push({
        projectName: project.name,
        projectDescription: project.description,
        projectStatus: project.status,
        projectCreatedAt: project.createdAt.toISOString().split("T")[0],
        projectUsers: projectUsers,
        totalTasks: 0,
        completedTasks: 0,
        totalHours: 0,
        taskName: "No tasks",
        taskDescription: "",
        taskAssignedTo: "",
        taskStartTime: "",
        taskEndTime: "",
        taskDuration: "",
      });
    } else {
      // Calculate total project hours
      for (const task of project.tasks) {
        const taskDuration = calculateTaskDuration(
          new Date(task.startTime),
          new Date(task.endTime)
        );
        totalProjectHours += taskDuration;

        csvData.push({
          projectName: project.name,
          projectDescription: project.description,
          projectStatus: project.status,
          projectCreatedAt: project.createdAt.toISOString().split("T")[0],
          projectUsers: projectUsers,
          totalTasks: project.tasks.length,
          completedTasks: completedTasks,
          totalHours: totalProjectHours.toFixed(2),
          taskName: task.name,
          taskDescription: task.description,
          taskAssignedTo: task.assignedTo?.fullName || "Unassigned",
          taskStartTime: new Date(task.startTime).toISOString().split("T")[0],
          taskEndTime: new Date(task.endTime).toISOString().split("T")[0],
          taskDuration: taskDuration.toFixed(2),
        });
      }
    }

    // Write to CSV file
    await csvWriter.writeRecords(csvData);

    // Send file as download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="project-summary-${project.name}-${timestamp}.csv"`
    );

    const fileStream = fs.createReadStream(csvFilePath);
    fileStream.pipe(res);

    // Clean up file after sending
    fileStream.on("end", () => {
      fs.unlinkSync(csvFilePath);
    });
  }
);

export { getAllProjectsSummary, getProjectSummary };


// import { Request, Response } from "express";
// import mongoose from "mongoose";
// import { ApiError } from "../utils/ApiError.js";
// import { ApiResponse } from "../utils/ApiResponse.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import { createObjectCsvWriter } from "csv-writer";
// import path from "path";
// import fs from "fs";
// import os from "os";
// import archiver from "archiver";

// import Project from "../models/project.model.js";
// import User from "../models/user.model.js";
// import Task from "../models/task.model.js";

// // Extend Request to include `user` field
// interface CustomRequest extends Request {
//   user?: {
//     _id: string;
//   };
// }

// // Helper function to calculate task duration in hours
// const calculateTaskDuration = (startTime: Date, endTime: Date): number => {
//   const durationMs = endTime.getTime() - startTime.getTime();
//   return parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2)); // Convert to hours with 2 decimal places
// };

// // Helper function to create project summary CSV
// const createProjectSummaryCSV = async (
//   project: any,
//   tempDir: string,
//   timestamp: string
// ): Promise<string> => {
//   const projectId = project._id.toString();
//   const projectSummaryFile = path.join(
//     tempDir,
//     `project-summary-${projectId}.csv`
//   );

//   const projectUsers = project.users
//     .map((user: any) => user.fullName)
//     .join(", ");

//   // Calculate completed tasks
//   const completedTasks = project.tasks.filter(
//     (task: any) => new Date(task.endTime) < new Date()
//   ).length;

//   let totalProjectHours = 0;
//   project.tasks.forEach((task: any) => {
//     const taskDuration = calculateTaskDuration(
//       new Date(task.startTime),
//       new Date(task.endTime)
//     );
//     totalProjectHours += taskDuration;
//   });

//   // Create CSV writer for project summary
//   const summaryWriter = createObjectCsvWriter({
//     path: projectSummaryFile,
//     header: [
//       { id: "projectName", title: "Project Name" },
//       { id: "projectDescription", title: "Project Description" },
//       { id: "projectStatus", title: "Project Status" },
//       { id: "projectCreatedAt", title: "Project Created At" },
//       { id: "projectUsers", title: "Project Users" },
//       { id: "totalTasks", title: "Total Tasks" },
//       { id: "completedTasks", title: "Completed Tasks" },
//       { id: "totalHours", title: "Total Hours" },
//     ],
//   });

//   // Write project summary
//   await summaryWriter.writeRecords([
//     {
//       projectName: project.name,
//       projectDescription: project.description,
//       projectStatus: project.status,
//       projectCreatedAt: project.createdAt.toISOString().split("T")[0],
//       projectUsers: projectUsers,
//       totalTasks: project.tasks.length,
//       completedTasks: completedTasks,
//       totalHours: totalProjectHours.toFixed(2),
//     },
//   ]);

//   return projectSummaryFile;
// };

// // Helper function to create task details CSV
// const createTaskDetailsCSV = async (
//   project: any,
//   tempDir: string,
//   timestamp: string
// ): Promise<string> => {
//   const projectId = project._id.toString();
//   const taskDetailsFile = path.join(tempDir, `task-details-${projectId}.csv`);

//   // Create CSV writer for task details
//   const taskWriter = createObjectCsvWriter({
//     path: taskDetailsFile,
//     header: [
//       { id: "taskName", title: "Task Name" },
//       { id: "taskDescription", title: "Task Description" },
//       { id: "taskAssignedTo", title: "Task Assigned To" },
//       { id: "taskStartTime", title: "Task Start Time" },
//       { id: "taskEndTime", title: "Task End Time" },
//       { id: "taskDuration", title: "Task Duration (hours)" },
//     ],
//   });

//   // Prepare task data
//   const taskData = project.tasks.map((task: any) => {
//     const taskDuration = calculateTaskDuration(
//       new Date(task.startTime),
//       new Date(task.endTime)
//     );

//     return {
//       taskName: task.name,
//       taskDescription: task.description,
//       taskAssignedTo: task.assignedTo?.fullName || "Unassigned",
//       taskStartTime: new Date(task.startTime).toISOString().split("T")[0],
//       taskEndTime: new Date(task.endTime).toISOString().split("T")[0],
//       taskDuration: taskDuration.toFixed(2),
//     };
//   });

//   // Write task details
//   await taskWriter.writeRecords(taskData);

//   return taskDetailsFile;
// };

// // Get summary of all projects
// const getAllProjectsSummary = asyncHandler(
//   async (req: CustomRequest, res: Response) => {
//     // Find the user
//     const user = await User.findById(req.user?._id);
//     if (!user) {
//       throw new ApiError(404, "User not found");
//     }

//     // Get all projects that the user is a part of
//     const projects = await Project.find({ users: user._id })
//       .populate({
//         path: "users",
//         select: "fullName username email",
//       })
//       .populate({
//         path: "tasks",
//         populate: {
//           path: "assignedTo",
//           select: "fullName username",
//         },
//       });

//     if (!projects.length) {
//       throw new ApiError(404, "No projects found");
//     }

//     // Create a temporary directory for the files
//     const tempDir = os.tmpdir();
//     const timestamp = new Date().toISOString().replace(/:/g, "-");

//     // Create main summary file for all projects
//     const mainSummaryFile = path.join(
//       tempDir,
//       `all-projects-summary-${timestamp}.csv`
//     );

//     // Create CSV writer for the main summary
//     const mainCsvWriter = createObjectCsvWriter({
//       path: mainSummaryFile,
//       header: [
//         { id: "projectName", title: "Project Name" },
//         { id: "projectDescription", title: "Project Description" },
//         { id: "projectStatus", title: "Project Status" },
//         { id: "projectCreatedAt", title: "Project Created At" },
//         { id: "projectUsers", title: "Project Users" },
//         { id: "totalTasks", title: "Total Tasks" },
//         { id: "completedTasks", title: "Completed Tasks" },
//         { id: "totalHours", title: "Total Hours" },
//       ],
//     });

//     // Prepare main summary data
//     const mainSummaryData = projects.map((project) => {
//       const projectUsers = project.users
//         .map((user: any) => user.fullName)
//         .join(", ");

//       // Calculate completed tasks
//       const completedTasks = project.tasks.filter(
//         (task: any) => new Date(task.endTime) < new Date()
//       ).length;

//       // Calculate total project hours
//       let totalProjectHours = 0;
//       project.tasks.forEach((task: any) => {
//         const taskDuration = calculateTaskDuration(
//           new Date(task.startTime),
//           new Date(task.endTime)
//         );
//         totalProjectHours += taskDuration;
//       });

//       return {
//         projectName: project.name,
//         projectDescription: project.description,
//         projectStatus: project.status,
//         projectCreatedAt: project.createdAt.toISOString().split("T")[0],
//         projectUsers: projectUsers,
//         totalTasks: project.tasks.length,
//         completedTasks: completedTasks,
//         totalHours: totalProjectHours.toFixed(2),
//       };
//     });

//     // Write main summary
//     await mainCsvWriter.writeRecords(mainSummaryData);

//     // Prepare archive
//     const zipFilePath = path.join(
//       tempDir,
//       `project-summaries-${timestamp}.zip`
//     );
//     const output = fs.createWriteStream(zipFilePath);
//     const archive = archiver("zip", {
//       zlib: { level: 9 }, // Compression level
//     });

//     // Pipe archive to output file
//     archive.pipe(output);

//     // Add main summary to archive
//     archive.file(mainSummaryFile, { name: "all-projects-summary.csv" });

//     // Create individual project files
//     const projectFiles: string[] = [];
//     const taskFiles: string[] = [];

//     for (const project of projects) {
//       // Create project summary file
//       const projectSummaryFile = await createProjectSummaryCSV(
//         project,
//         tempDir,
//         timestamp
//       );
//       projectFiles.push(projectSummaryFile);

//       // Add to archive
//       archive.file(projectSummaryFile, {
//         name: `project-${project._id}/project-summary.csv`,
//       });

//       // If project has multiple tasks, create a separate task details file
//       if (project.tasks.length > 1) {
//         const taskDetailsFile = await createTaskDetailsCSV(
//           project,
//           tempDir,
//           timestamp
//         );
//         taskFiles.push(taskDetailsFile);

//         // Add to archive
//         archive.file(taskDetailsFile, {
//           name: `project-${project._id}/task-details.csv`,
//         });
//       }
//       // If project has only one task, we'll include it in the project summary
//       else if (project.tasks.length === 1) {
//         const taskDetailsFile = await createTaskDetailsCSV(
//           project,
//           tempDir,
//           timestamp
//         );
//         taskFiles.push(taskDetailsFile);

//         // Add to archive
//         archive.file(taskDetailsFile, {
//           name: `project-${project._id}/task-details.csv`,
//         });
//       }
//     }

//     // Finalize archive
//     await archive.finalize();

//     // Wait for the archive to complete
//     await new Promise<void>((resolve, reject) => {
//       output.on("close", () => {
//         resolve();
//       });
//       output.on("error", (err) => {
//         reject(err);
//       });
//     });

//     // Send file as download
//     res.setHeader("Content-Type", "application/zip");
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename="project-summaries-${timestamp}.zip"`
//     );

//     const fileStream = fs.createReadStream(zipFilePath);
//     fileStream.pipe(res);

//     // Clean up files after sending
//     fileStream.on("end", () => {
//       // Remove all generated files
//       fs.unlinkSync(mainSummaryFile);
//       fs.unlinkSync(zipFilePath);

//       projectFiles.forEach((file) => {
//         if (fs.existsSync(file)) {
//           fs.unlinkSync(file);
//         }
//       });

//       taskFiles.forEach((file) => {
//         if (fs.existsSync(file)) {
//           fs.unlinkSync(file);
//         }
//       });
//     });
//   }
// );

// // Get summary of a specific project
// const getProjectSummary = asyncHandler(
//   async (req: CustomRequest, res: Response) => {
//     const { projectId } = req.params;

//     // Validate projectId
//     if (!projectId) {
//       throw new ApiError(400, "Project ID is required");
//     }

//     // Find the project
//     const project = await Project.findById(projectId)
//       .populate({
//         path: "users",
//         select: "fullName username email",
//       })
//       .populate({
//         path: "tasks",
//         populate: {
//           path: "assignedTo",
//           select: "fullName username",
//         },
//       });

//     if (!project) {
//       throw new ApiError(404, "Project not found");
//     }

//     // Convert req.user?._id from string to ObjectId
//     const userId = new mongoose.Types.ObjectId(req.user?._id);

//     // Check if the user is part of the project
//     if (
//       !project.users.some((id: any) => id._id.toString() === userId.toString())
//     ) {
//       throw new ApiError(
//         403,
//         "You don't have permission to access this project's summary"
//       );
//     }

//     // Create a temporary directory for the files
//     const tempDir = os.tmpdir();
//     const timestamp = new Date().toISOString().replace(/:/g, "-");

//     // Determine if we need separate files
//     const needsTaskFile = project.tasks.length > 1;

//     if (needsTaskFile) {
//       // Create ZIP file with multiple CSVs
//       const zipFilePath = path.join(
//         tempDir,
//         `project-${project.name}-summary-${timestamp}.zip`
//       );
//       const output = fs.createWriteStream(zipFilePath);
//       const archive = archiver("zip", {
//         zlib: { level: 9 }, // Compression level
//       });

//       // Pipe archive to output file
//       archive.pipe(output);

//       // Create and add project summary
//       const projectSummaryFile = await createProjectSummaryCSV(
//         project,
//         tempDir,
//         timestamp
//       );
//       archive.file(projectSummaryFile, { name: "project-summary.csv" });

//       // Create and add task details
//       const taskDetailsFile = await createTaskDetailsCSV(
//         project,
//         tempDir,
//         timestamp
//       );
//       archive.file(taskDetailsFile, { name: "task-details.csv" });

//       // Finalize archive
//       await archive.finalize();

//       // Wait for the archive to complete
//       await new Promise<void>((resolve, reject) => {
//         output.on("close", () => {
//           resolve();
//         });
//         output.on("error", (err) => {
//           reject(err);
//         });
//       });

//       // Send file as download
//       res.setHeader("Content-Type", "application/zip");
//       res.setHeader(
//         "Content-Disposition",
//         `attachment; filename="project-${project.name}-summary-${timestamp}.zip"`
//       );

//       const fileStream = fs.createReadStream(zipFilePath);
//       fileStream.pipe(res);

//       // Clean up files after sending
//       fileStream.on("end", () => {
//         fs.unlinkSync(projectSummaryFile);
//         fs.unlinkSync(taskDetailsFile);
//         fs.unlinkSync(zipFilePath);
//       });
//     } else {
//       // Just create a single CSV file for projects with 0-1 tasks
//       const csvFilePath = path.join(
//         tempDir,
//         `project-${project.name}-summary-${timestamp}.csv`
//       );

//       // Create CSV writer
//       const csvWriter = createObjectCsvWriter({
//         path: csvFilePath,
//         header: [
//           { id: "projectName", title: "Project Name" },
//           { id: "projectDescription", title: "Project Description" },
//           { id: "projectStatus", title: "Project Status" },
//           { id: "projectCreatedAt", title: "Project Created At" },
//           { id: "projectUsers", title: "Project Users" },
//           { id: "totalTasks", title: "Total Tasks" },
//           { id: "completedTasks", title: "Completed Tasks" },
//           { id: "totalHours", title: "Total Hours" },
//           { id: "taskName", title: "Task Name" },
//           { id: "taskDescription", title: "Task Description" },
//           { id: "taskAssignedTo", title: "Task Assigned To" },
//           { id: "taskStartTime", title: "Task Start Time" },
//           { id: "taskEndTime", title: "Task End Time" },
//           { id: "taskDuration", title: "Task Duration (hours)" },
//         ],
//       });

//       // Prepare data for CSV
//       const csvData: any[] = [];
//       let totalProjectHours = 0;
//       const projectUsers = project.users
//         .map((user: any) => user.fullName)
//         .join(", ");

//       // Calculate completed tasks
//       const completedTasks = project.tasks.filter(
//         (task: any) => new Date(task.endTime) < new Date()
//       ).length;

//       if (project.tasks.length === 0) {
//         // If project has no tasks, add a single row with project info
//         csvData.push({
//           projectName: project.name,
//           projectDescription: project.description,
//           projectStatus: project.status,
//           projectCreatedAt: project.createdAt.toISOString().split("T")[0],
//           projectUsers: projectUsers,
//           totalTasks: 0,
//           completedTasks: 0,
//           totalHours: 0,
//           taskName: "No tasks",
//           taskDescription: "",
//           taskAssignedTo: "",
//           taskStartTime: "",
//           taskEndTime: "",
//           taskDuration: "",
//         });
//       } else if (project.tasks.length === 1) {
//         // If project has one task, include it in the same file
//         const task = project.tasks[0];
//         const taskDuration = calculateTaskDuration(
//           new Date(task.startTime),
//           new Date(task.endTime)
//         );
//         totalProjectHours = taskDuration;

//         csvData.push({
//           projectName: project.name,
//           projectDescription: project.description,
//           projectStatus: project.status,
//           projectCreatedAt: project.createdAt.toISOString().split("T")[0],
//           projectUsers: projectUsers,
//           totalTasks: 1,
//           completedTasks: completedTasks,
//           totalHours: totalProjectHours.toFixed(2),
//           taskName: task.name,
//           taskDescription: task.description,
//           taskAssignedTo: task.assignedTo?.fullName || "Unassigned",
//           taskStartTime: new Date(task.startTime).toISOString().split("T")[0],
//           taskEndTime: new Date(task.endTime).toISOString().split("T")[0],
//           taskDuration: taskDuration.toFixed(2),
//         });
//       }

//       // Write to CSV file
//       await csvWriter.writeRecords(csvData);

//       // Send file as download
//       res.setHeader("Content-Type", "text/csv");
//       res.setHeader(
//         "Content-Disposition",
//         `attachment; filename="project-${project.name}-summary-${timestamp}.csv"`
//       );

//       const fileStream = fs.createReadStream(csvFilePath);
//       fileStream.pipe(res);

//       // Clean up file after sending
//       fileStream.on("end", () => {
//         fs.unlinkSync(csvFilePath);
//       });
//     }
//   }
// );

// export { getAllProjectsSummary, getProjectSummary };