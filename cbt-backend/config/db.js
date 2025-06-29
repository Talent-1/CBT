// cbt-backend/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/city_db', {
      // These options are often recommended for new Mongoose versions, but check Mongoose docs for your version.
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
      // useCreateIndex: true, // No longer supported in Mongoose 6+
      // useFindAndModify: false, // No longer supported in Mongoose 6+
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;