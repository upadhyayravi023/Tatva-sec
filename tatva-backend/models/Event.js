const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    isActive: {
      type: Boolean,
      default: true,
    },
    type: {
      type: String,
      enum: ["Cultural Event", "Sports Event"],
      required: [true, "Event type is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    club: {
      type: String,
      trim: true,
    },
    clubTagline: {
      type: String,
      trim: true,
    },
    clubPosterUrl: {
      type: String,
      trim: true,
      default: null,
    },
    category: {
      type: String,
      trim: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    event: {
      type: String,
      trim: true,
    },
    sport: {
      type: String,
      trim: true,
    },
    tagline: {
      type: String,
      trim: true,
    },
    format: [{
      type: String,
      trim: true,
    }],
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    startDate: {
      type: String,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: String,
      required: [true, "End date is required"],
    },
    venue: {
      type: String,
      trim: true,
    },
    teamSize: {
      min: { type: Number, default: 1 },
      max: { type: Number, default: 1 },
    },
    posterUrl: {
      type: String,
      trim: true,
      default: null,
    },
    rulebookUrl: {
      type: String,
      trim: true,
      default: null,
    },
    registrationUrl: {
      type: String,
      trim: true,
      default: null,
    },
    registrationOpen: {
      type: Boolean,
      default: false,
    },
    coordinator: [{
      type: String,
      trim: true,
    }],
    coCoordinator: [{
      type: String,
      trim: true,
    }],
    contactMain: [{
      type: String,
      trim: true,
    }],
    contactSub: [{
      type: String,
      trim: true,
    }],
    schedule: {
      time: { type: String, trim: true },
    },
    pdfLinks: [
      {
        url: { type: String, required: true },      // Cloudinary URL
        publicId: { type: String, required: true }, // For deletion
        name: { type: String },                     // Display name
      },
    ],
    imagePosters: [
      {
        url: { type: String, required: true },      // Cloudinary URL
        publicId: { type: String, required: true }, // For deletion
      },
    ],
    registered: [
      {
        json: { type: String, required: true },     // Registration info as JSON string
        userid: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      default: "pending",
    },
  },
  { timestamps: true }
);

// Indexes for fast list queries
eventSchema.index({ type: 1, isActive: 1, createdAt: -1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ "registered.userid": 1 }, { sparse: true });

module.exports = mongoose.model("Event", eventSchema);
