const mongoose = require("mongoose");

const sportSchema = new mongoose.Schema(
  {
    event_name: {
      type: String,
      required: [true, "Event name is required"],
      trim: true,
    },
    campus: {
      type: String,
      enum: ["Patna", "Bihta", "both"],
      required: [true, "Campus is required"],
    },
    is_live: {
      type: Boolean,
      default: false,
    },
    winner: {
      type: String,
      trim: true,
      default: null,
    },
    team_names: {
      type: [String],
      required: [true, "Team names are required"],
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 2,
        message: "Provide at least 2 team names",
      },
    },
    score: {
      type: [Number],
      required: [true, "Score is required"],
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 2,
        message: "Provide score for each team",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sport", sportSchema);
