import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

// dotenv.config();
dotenv.config({
  path: "./.env",
});

app.on("error", (error) => {
  console.log("ERROR: ", error);
  throw error;
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on port ${process.env.PORT || 8000}`);
    });
  })
  .catch((error) => console.log("MongoDB connection Failed: ", error));
