// cbt-backend/config/db.js
const { MongoClient, ServerApiVersion } = require('mongodb');
const mongoose = require('mongoose'); // Keep Mongoose if you are using it for schemas/models

// Load environment variables locally (Render handles them directly in production)
// require('dotenv').config(); // Uncomment this line if you need it for local development

let client; // Declare client outside to make it accessible for shutdown

const connectDB = async () => {
  try {
    // Ensure MONGO_URI is defined
    if (!process.env.MONGO_URI) {
      console.error("Error: MONGO_URI environment variable is not defined.");
      process.exit(1); // Exit if the crucial URI is missing
    }

    // Your MongoDB Atlas connection string from Render's environment variable
    // IMPORTANT: Ensure this URI in Render's env variable includes '/test'
    // e.g., mongodb+srv://CityAppUsers:benchycity1977@cityappusers.rvg3af6.mongodb.net/test?retryWrites=true&w=majority&appName=CityAppUsers
    const uri = process.env.MONGO_URI;

    // Create a MongoClient instance
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });

    // Connect the client to the MongoDB server
    await client.connect();

    // Send a ping to confirm a successful connection
    // This connects to the database specified in the URI (e.g., 'test') or defaults.
    // We explicitly get the database from the client for clarity.
    const db = client.db(client.options.dbName || 'test'); // Use dbName from URI or fallback to 'test'

    await db.command({ ping: 1 });
    console.log(`MongoDB Connected: ${client.options.srvHost}, Database: ${db.databaseName}`);

    // If you are using Mongoose, you can connect Mongoose to this existing client
    // or let Mongoose manage its own connection using the same URI.
    // For simplicity, it's often easiest to let Mongoose handle its connection
    // but ensure it uses the same MONGO_URI and targets the correct database.
    await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        // Remove useCreateIndex and useFindAndModify as they are deprecated
        // dbName: 'test', // Mongoose should also explicitly target 'test' if not in URI
    });
    console.log('Mongoose connected successfully!');

    // You might want to export the Mongoose connection object or specific DB client here
    // return client; // If you want to use the native MongoClient directly elsewhere
    // return mongoose.connection; // If you primarily use Mongoose
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

// Graceful shutdown: Close the MongoDB connection when the application exits
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed due to app termination');
  }
  process.exit(0);
});

module.exports = connectDB;
