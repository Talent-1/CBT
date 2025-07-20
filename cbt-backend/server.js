// cbt-backend/server.js
const dotenv = require('dotenv');
// Load environment variables from .env file FIRST
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // Not used in this snippet, but good to keep if needed elsewhere

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
const allowedOrigins = [
    'http://localhost:5173',
    'https://www.cityschoolsexams.com',
    'https://cityschoolsexams.com',
    'https://city-app-y6im.onrender.com',
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Basic route for root URL to confirm API is running
// This should be removed if you're serving your frontend from the root '/'
// or keep it if your frontend is served from a subpath.
// For a typical SPA, this will be overwritten by the static file serving.
// app.get('/', (req, res) => {
//     res.send('CBT Backend API is running...');
// });


// --- IMPORTANT: MOUNT YOUR API ROUTES FIRST ---
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/subjects', subjectRoutes);
app.use('/api/admin/questions', questionRoutes);
app.use('/api/exams', examRoutes); // <-- Ensure this is mounted correctly
app.use('/api/results', resultRoutes);
app.use('/api/users', userRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/payments', paymentRoutes);

// Error handling middleware (should be before static file serving if it sends JSON errors)
app.use(errorHandler);

// --- IMPORTANT: SERVE FRONTEND STATIC FILES ---
// This assumes your frontend build output (e.g., from `npm run build` in React)
// is located in a 'frontend/dist' or 'frontend/build' directory relative to your backend root.
// Adjust the path as per your project structure.
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist'); // Common for monorepos or combined deploys

// Check if the frontend build directory exists
if (fs.existsSync(frontendPath)) {
    console.log(`Serving static files from: ${frontendPath}`);
    app.use(express.static(frontendPath));

    // --- IMPORTANT: CATCH-ALL ROUTE FOR SPA (MUST BE LAST) ---
    // For any other GET request that hasn't been handled by API routes or static files,
    // serve your frontend's index.html. This allows React Router to handle client-side routing.
    app.get('*', (req, res) => {
        console.log(`Backend: Catch-all route hit for: ${req.originalUrl}. Serving index.html`);
        res.sendFile(path.resolve(frontendPath, 'index.html'));
    });
} else {
    console.warn(`Frontend build directory not found at ${frontendPath}. Static files will not be served.`);
    console.warn('Ensure you run `npm run build` in your frontend project before deploying the backend.');
}


// Define the port for the server to listen on
const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Handle unhandled promise rejections to prevent process from crashing
process.on('unhandledRejection', (err, promise) => {
    console.error(`Error: ${err.message}`);
    // Close the server and exit the process if it's still listening
    // Note: app.close() might not be directly available on the app object in all Express versions/setups.
    // It's usually on the server instance returned by app.listen().
    // For simplicity and robustness, just exit the process.
    process.exit(1);
});