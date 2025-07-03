// cbt-backend/server.js
const dotenv = require('dotenv');
// Load environment variables from .env file FIRST
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/db');

// Import your route files
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const examRoutes = require('./routes/examRoutes');
const resultRoutes = require('./routes/resultRoutes');
const userRoutes = require('./routes/userRoutes');
const publicRoutes = require('./routes/publicRoute');
const subjectRoutes = require('./routes/subjectRoutes');
const questionRoutes = require('./routes/questionRoutes');

// Import payment routes
const paymentRoutes = require('./routes/paymentRoutes');

const errorHandler = require('./middleware/errorHandler');

const app = express();

// Connect to MongoDB
connectDB();

// Configure Cloudinary for image uploads
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Middleware to parse JSON request bodies
app.use(express.json());

// CORS Configuration
// Define the list of allowed origins (frontend URLs)
const allowedOrigins = [
    'http://localhost:5173',               // For local frontend development
    'https://www.cityschoolsexams.com',    // Your deployed frontend with www
    'https://cityschoolsexams.com',        // Your deployed frontend without www
    'https://city-app-y6im.onrender.com',  // Your frontend deployed on Render (if different from custom domain)
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g., Postman, curl, same-origin requests in some cases)
        // OR if the origin is found in the allowedOrigins list
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true); // Allow the request
        } else {
            // Block the request and send a CORS error
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    credentials: true, // Allow sending cookies/authorization headers with the request
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed request headers
}));

// Serve static files from the frontend build directory
const frontendBuildPath = path.join(__dirname, '..', 'cbt-frontend', 'dist'); // Adjust if your build folder is different
app.use(express.static(frontendBuildPath));

console.log('Frontend build path:', frontendBuildPath);
console.log('Index.html exists:', fs.existsSync(path.join(frontendBuildPath, 'index.html')));

// Basic route for root URL to confirm API is running
app.get('/', (req, res) => {
    res.send('CBT Backend API is running...');
});

// Mount your API routes with their respective base paths
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/subjects', subjectRoutes);
app.use('/api/admin/questions', questionRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/users', userRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/payments', paymentRoutes); // Mount payment routes

// Catch-all route: serve index.html for any non-API, non-static asset route (for React Router)
app.get('*', (req, res) => {
    // If the request starts with /api, let the API routes handle it
    if (req.path.startsWith('/api')) return res.status(404).json({ message: 'API route not found' });
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// Error handling middleware (should be the last middleware)
app.use(errorHandler);

// Define the port for the server to listen on
const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Handle unhandled promise rejections to prevent process from crashing
process.on('unhandledRejection', (err, promise) => {
    console.error(`Error: ${err.message}`);
    // Close the server and exit the process if it's still listening
    if (app._isListening) {
        app.close(() => process.exit(1));
    } else {
        process.exit(1);
    }
});