// cbt-backend/config/db.js
const mongoose = require('mongoose');
// If you are using dotenv for local development, make sure it's required here
// require('dotenv').config(); 

const connectDB = async () => {
  try {
    // Ensure process.env.MONGO_URI is defined. Remove the hardcoded fallback.
    if (!process.env.MONGO_URI) {
      console.error("Error: MONGO_URI environment variable is not defined.");
      process.exit(1); // Exit if the crucial URI is missing
    }

    const conn = await mongoose.connect(process.env.MONGO_URI); // Connect using only the environment variable

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;