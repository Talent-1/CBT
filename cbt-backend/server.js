// cbt-backend/server.js
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
// const path = require('path'); // REMOVE this import as it's not needed for static serving
// const fs = require('fs');     // REMOVE this import

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
const paymentRoutes = require('./routes/paymentRoutes');

const errorHandler = require('./middleware/errorHandler');

const app = express();

connectDB();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(express.json());

const allowedOrigins = [
    'http://localhost:5173',
    'https://www.cityschoolsexams.com',
    'https://cityschoolsexams.com',
    'https://city-app-y6im.onrender.com', // Your frontend deployed on Render
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
// Keep this, as your backend's root URL won't be serving the frontend's index.html
app.get('/', (req, res) => {
    res.send('CBT Backend API is running...');
});

// --- IMPORTANT: MOUNT YOUR API ROUTES ONLY ---
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/subjects', subjectRoutes);
app.use('/api/admin/questions', questionRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/users', userRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/payments', paymentRoutes);

// Error handling middleware (should be the last middleware for API routes)
app.use(errorHandler);

// --- REMOVE THE FOLLOWING BLOCK FOR SEPARATE DEPLOYMENTS ---
// const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
// if (fs.existsSync(frontendPath)) {
//     console.log(`Serving static files from: ${frontendPath}`);
//     app.use(express.static(frontendPath));
//     app.get('*', (req, res) => {
//         console.log(`Backend: Catch-all route hit for: ${req.originalUrl}. Serving index.html`);
//         res.sendFile(path.resolve(frontendPath, 'index.html'));
//     });
// } else {
//     console.warn(`Frontend build directory not found at ${frontendPath}. Static files will not be served.`);
//     console.warn('Ensure you run `npm run build` in your frontend project before deploying the backend.');
// }
// --- END REMOVAL BLOCK ---

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); // Capture server instance

process.on('unhandledRejection', (err, promise) => {
    console.error(`Error: ${err.message}`);
    server.close(() => process.exit(1)); // Use server.close()
});