import mongoose, { Connection } from "mongoose";
import dotenv from "dotenv";
import { DB_NAME } from "../constants.js";

dotenv.config();

const connectDB = async (): Promise<Connection> => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_URI}/${DB_NAME}`
    );
    console.log(
      `MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`
    );
    return connectionInstance.connection;
  } catch (error) {
    console.log("MongoDB connection Failed: ", error);
    process.exit(1);
  }
};

export default connectDB;
