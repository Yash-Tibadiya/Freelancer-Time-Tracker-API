// import jwt from "jsonwebtoken";
// import { ApiError } from "../utils/ApiError.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import User from "../models/user.model.js";
// import { Request } from "express";
// interface AuthenticatedRequest extends Request {
//   user?: any;
// }

// export const verifyJWT = asyncHandler(
//   async (req: AuthenticatedRequest, _, next) => {
//     try {
//       const token =
//         req.cookies?.accessToken ||
//         req.header("Authorization")?.replace("Bearer ", "");

//       if (!token) {
//         throw new ApiError(401, "Unauthorized request");
//       }

//       if (!process.env.ACCESS_TOKEN_SECRET) {
//         throw new ApiError(500, "Internal server error");
//       }
//       const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

//       if (typeof decodedToken !== "object" || !("_id" in decodedToken)) {
//         throw new ApiError(401, "Invalid access token");
//       }

//       const user = await User.findById(decodedToken._id).select(
//         "-password -refreshToken"
//       );

//       if (!user) {
//         throw new ApiError(401, "Invalid access token");
//       }

//       req.user = user;

//       next();
//     } catch (error) {
//       throw new ApiError(
//         401,
//         (error as Error)?.message || "Invalid access token"
//       );
//     }
//   }
// );


import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import { Request } from "express";

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const verifyJWT = asyncHandler(
  async (req: AuthenticatedRequest, _, next) => {
    try {
      const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");

      if (!token) {
        throw new ApiError(401, "Unauthorized request: No token provided");
      }

      if (!process.env.ACCESS_TOKEN_SECRET) {
        throw new ApiError(500, "Internal server error: Secret key not set");
      }

      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      if (typeof decodedToken !== "object" || !("_id" in decodedToken)) {
        throw new ApiError(401, "Unauthorized request: Invalid token format");
      }

      const user = await User.findById(decodedToken._id).select(
        "-password -refreshToken"
      );

      if (!user) {
        throw new ApiError(401, "Unauthorized request: User not found");
      }

      req.user = user;

      next();
    } catch (error) {
      if ((error as jwt.JsonWebTokenError).name === "TokenExpiredError") {
        throw new ApiError(401, "Unauthorized request: JWT token has expired");
      }
      throw new ApiError(
        401,
        (error as Error)?.message || "Invalid access token"
      );
    }
  }
);
