import dotenv from "dotenv";
dotenv.config(); // ✅ load .env before using process.env

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

export let isMongoDBAvailable = false;

export async function connectDB() {
  try {
    if (!MONGODB_URI) {
      throw new Error("❌ MONGODB_URI not found in .env file");
    }

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });

    isMongoDBAvailable = true;
    console.log("✅ MongoDB connected successfully");
    console.log(`📍 Database: ${mongoose.connection.name}`);
  } catch (error) {
    isMongoDBAvailable = false;
    console.error("❌ MongoDB connection failed:", error);
    console.log("💡 Check if .env file exists at project root and has a valid MONGODB_URI");
  }
}

mongoose.connection.on("disconnected", () => {
  if (isMongoDBAvailable) {
    console.log("⚠️ MongoDB disconnected");
  }
});

mongoose.connection.on("error", (error) => {
  console.error("❌ MongoDB error:", error);
});
