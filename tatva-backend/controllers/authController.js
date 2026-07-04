const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, profileUrl, role } = req.body;

    // Prevent self-promotion to admin via API
    const assignedRole = role === "admin" ? "user" : role || "user";

    const userExists = await User.findOne({ $or: [{ email }] });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User with this email or roll number already exists",
      });
    }

    const user = await User.create({
      name,
      email,
      profileUrl,
      role: assignedRole,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profileUrl: user.profileUrl,
        role: user.role,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const adminEmail = process.env.ADMIN_EMAIL || "admin@tatva.com";
    if (email.toLowerCase() !== adminEmail.toLowerCase()) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied: Unauthorized email" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Admin user not found" });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    res.json({
      success: true,
      message: "Login successful",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        year: user.year,
        rollNumber: user.rollNumber,
        profileUrl: user.profileUrl,
        role: user.role,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create admin user (only existing admins can do this)
// @route   POST /api/auth/create-admin
// @access  Private/Admin
const createAdmin = async (req, res) => {
  try {
    const { name, email, profileUrl } = req.body;

    const userExists = await User.findOne({ $or: [{ email }] });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }
    
    const admin = await User.create({
      name,
      email,
      profileUrl,
      role: "admin",
    });
    

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        profileUrl: admin.profileUrl,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get logged-in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "registeredEvents",
      "event sport startDate endDate schedule tagline"
    );
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send OTP to Admin email for password reset
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const adminEmail = process.env.ADMIN_EMAIL || "admin@tatva.com";
    if (email.toLowerCase() !== adminEmail.toLowerCase()) {
      return res.status(400).json({ success: false, message: "Access denied: Unauthorized email" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: "Admin user not found" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
    await user.save();

    console.log(`\n===========================================`);
    console.log(`[PASSWORD RESET OTP] For ${email}: ${otp}`);
    console.log(`===========================================\n`);

    // Setup nodemailer transport
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    let emailSent = false;
    let mailError = "";

    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort == 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: `"Tatva Portal Support" <${smtpUser}>`,
          to: email,
          subject: "Tatva Admin Portal - Password Reset OTP",
          html: `
            <div style="font-family: sans-serif; padding: 20px; max-width: 600px; border: 1px solid #ddd; border-radius: 5px;">
              <h2 style="color: #6366f1;">Tatva Admin Portal</h2>
              <p>You requested an OTP to change your administrator password. Use the code below to complete the reset. This code will expire in 10 minutes.</p>
              <div style="background: #f3f4f6; padding: 15px; font-size: 1.8rem; font-weight: 800; text-align: center; letter-spacing: 5px; color: #4f46e5; border-radius: 5px; margin: 20px 0;">
                ${otp}
              </div>
              <p style="font-size: 0.85rem; color: #6b7280;">If you did not request this, you can safely ignore this email.</p>
            </div>
          `,
        });
        emailSent = true;
      } catch (err) {
        console.error("Nodemailer SMTP failed:", err.message);
        mailError = err.message;
      }
    }

    res.json({
      success: true,
      message: emailSent
        ? "OTP email sent successfully."
        : `OTP generated (logged to server console). SMTP notification skipped: ${mailError || "Credentials not set"}.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify OTP and reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "Email, OTP, and newPassword are required" });
    }

    const adminEmail = process.env.ADMIN_EMAIL || "admin@tatva.com";
    if (email.toLowerCase() !== adminEmail.toLowerCase()) {
      return res.status(400).json({ success: false, message: "Access denied: Unauthorized email" });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      otp,
      otpExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // Set new password
    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    res.json({ success: true, message: "Password updated successfully. You can now log in." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { register, login, createAdmin, getMe, forgotPassword, resetPassword };
