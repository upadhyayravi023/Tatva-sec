const express = require("express");
const router = express.Router();
const { register, login, createAdmin, getMe, forgotPassword, resetPassword } = require("../controllers/authController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/create-admin", createAdmin);
// router.post("/create-admin", protect, adminOnly, createAdmin);
router.get("/me", protect, getMe);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
