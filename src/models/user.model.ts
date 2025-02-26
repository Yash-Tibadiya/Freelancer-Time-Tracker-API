import mongoose, { Schema, Document, Model, CallbackError } from "mongoose";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  username: string;
  email: string;
  fullName: string;
  Projects: Schema.Types.ObjectId[];
  password: string;
  refreshToken: string;
  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    Projects: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre<IUser>("save", async function (next: (err?: CallbackError) => void) {
  if (!this.isModified("password")) return next();

  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error as CallbackError);
  }
});

userSchema.methods.isPasswordCorrect = async function (
  password: string
): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function (): string {
  const secret: Secret = process.env.ACCESS_TOKEN_SECRET || '';
  const expiresIn: number | undefined = process.env.ACCESS_TOKEN_EXPIRY ? parseInt(process.env.ACCESS_TOKEN_EXPIRY) : undefined;
  const options: SignOptions = {
    expiresIn,
  };
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    secret,
    options
  );
};

userSchema.methods.generateRefreshToken = function (): string {
  const secret: Secret = process.env.REFRESH_TOKEN_SECRET || '';
  const expiresIn: number | undefined = process.env.REFRESH_TOKEN_EXPIRY ? parseInt(process.env.REFRESH_TOKEN_EXPIRY) : undefined;
  const options: SignOptions = {
    expiresIn,
  };
  return jwt.sign(
    {
      _id: this._id,
    },
    secret,
    options
  );
};

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
export default User;
