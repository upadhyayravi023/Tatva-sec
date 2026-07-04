const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Auto-initialize admin user if not present
    const adminEmail = process.env.ADMIN_EMAIL || "admin@tatva.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    let admin = await User.findOne({ email: adminEmail.toLowerCase() });
    if (!admin) {
      console.log(`Initializing default admin user: ${adminEmail}...`);
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({
        name: "Administrator",
        email: adminEmail.toLowerCase(),
        role: "admin",
        password: hashedPassword,
      });
      console.log("Admin user initialized successfully.");
    }
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
