const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    year: {
      type: Number,
      min: 1,
      max: 5,
    },
    rollNumber: {
      type: String,
      trim: true,
    },
    profileUrl: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    password: {
      type: String,
      trim: true,
    },
    otp: {
      type: String,
      trim: true,
    },
    otpExpire: {
      type: Date,
    },
    registeredEvents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
  },
  { timestamps: true }
);

// Indexes for fast lookups
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ rollNumber: 1 }, { sparse: true });

module.exports = mongoose.model("User", userSchema);
