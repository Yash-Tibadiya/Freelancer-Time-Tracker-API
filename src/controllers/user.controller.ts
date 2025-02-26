import { Request, Response } from "express";
import jwt from "jsonwebtoken";

interface CustomRequest extends Request {
  user?: {
    _id: string;
  };
}
import User, { IUser } from "../models/user.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const generateAccessAndRefreshToken = async (userId: any) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access tokens"
    );
  }
};

// get user details from frontend
// validate user details - not empty, email is unique
// check if user already exists: username, email
// create user object - create entry in db
// remove password and refresh token fields from response
// check for user creation success
// return response
const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, password, username } = req.body;

  if (!fullName || !email || !password || !username) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existedUser) {
    throw new ApiError(409, "User with this email or username already exists");
  }

  const user: IUser = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "User creation failed");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});

// get data from req.body
// find user
// password check
// generate access and refresh token
// send Cookie for both tokens
const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, username, password } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({ $or: [{ email }, { username }] });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Password is incorrect");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req: CustomRequest, res: Response) => {
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, null, "User Logged Out Successfully"));
});

const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET as string
    );

    const user = await User.findById((decodedToken as jwt.JwtPayload)?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (user?.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const cookieOptions = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken,
          },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
      throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password changed successfully"));
  }
);

const getCurrentUser = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    return res
      .status(200)
      .json(new ApiResponse(200, req.user, "User found successfully"));
  }
);

const getUserAllProjects = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    const user = await User.findById(userId).populate({
      path: "Projects",
      select: "-users", // Exclude the users array to avoid large responses
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          user.Projects,
          "User projects fetched successfully"
        )
      );
  }
);

const updateAccountDetails = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { fullName, email } = req.body;
    if (!fullName || !email) {
      throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          fullName,
          email,
        },
      },
      {
        new: true,
      }
    ).select("-password");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Account details updated successfully"));
  }
);

const deleteUserAccount = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized request");
    }

    // Get the user to check if they exist
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Optional: Validate user password before deletion for extra security
    const { password } = req.body;
    if (password) {
      const isPasswordValid = await user.isPasswordCorrect(password);
      if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
      }
    }

    // Find all projects associated with the user
    const userProjects = await Project.find({ users: userId });

    // Handle user's tasks
    await Task.deleteMany({ assignedTo: userId });

    // For each project, remove the user from the users array
    for (const project of userProjects) {
      project.users = project.users.filter(
        (id) => id.toString() !== userId.toString()
      );
      await project.save();
    }

    // Delete user account
    await User.findByIdAndDelete(userId);

    // Clear cookies
    const cookieOptions = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .clearCookie("accessToken", cookieOptions)
      .clearCookie("refreshToken", cookieOptions)
      .json(new ApiResponse(200, null, "User account deleted successfully"));
  }
);

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  getUserAllProjects,
  updateAccountDetails,
  deleteUserAccount,
};
