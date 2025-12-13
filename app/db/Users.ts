import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, default: "Student" },
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student",
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
