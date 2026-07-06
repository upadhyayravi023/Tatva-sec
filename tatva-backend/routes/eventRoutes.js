const express = require("express");
const router = express.Router();
const {
  createEvent,
  getAllEvents,
  getSportsEvents,
  getCulturalEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  deleteEventImage,
  deleteEventPdf,
  registerForEvent,
  unregisterFromEvent,
  getEventRegistrations,
  uploadRulebookHandler,
} = require("../controllers/eventController");

const { protect, adminOnly } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");

// Multi-file upload: field "images" for posters, field "pdfs" for PDFs, "rulebookPdf" for rulebook PDF, "icon" for icon image
const multiUpload = upload.fields([
  { name: "images", maxCount: 10 },
  { name: "pdfs", maxCount: 5 },
  { name: "rulebookPdf", maxCount: 1 },
  { name: "icon", maxCount: 1 },
]);

// Public routes
router.get("/sports", getSportsEvents);
router.get("/cultural", getCulturalEvents);
router.get("/:id", getEventById);

// User routes (logged in)
router.post("/:id/register", protect, registerForEvent);
router.delete("/:id/register", protect, unregisterFromEvent);

// Admin routes
router.post("/", protect, adminOnly, multiUpload, createEvent);
router.put("/:id", protect, adminOnly, multiUpload, updateEvent);
router.delete("/:id", protect, adminOnly, deleteEvent);
router.delete("/:id/images/:publicId", protect, adminOnly, deleteEventImage);
router.delete("/:id/pdfs/:publicId", protect, adminOnly, deleteEventPdf);
router.get("/:id/registrations", protect, adminOnly, getEventRegistrations);
router.post("/:id/rulebook", protect, adminOnly, uploadRulebookHandler);

module.exports = router;
