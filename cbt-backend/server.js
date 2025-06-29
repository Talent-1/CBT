// cbt-backend/server.js
const dotenv = require('dotenv');
// Load environment variables from .env file FIRST
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');

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

// --- NEW LINE: IMPORT PAYMENT ROUTES ---
const paymentRoutes = require('./routes/paymentRoutes');
// --- END NEW LINE ---

const errorHandler = require('./middleware/errorHandler');

const app = express();

connectDB();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/', (req, res) => {
    res.send('CBT Backend API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/subjects', subjectRoutes);
app.use('/api/admin/questions', questionRoutes);
app.use('/api/exams', examRoutes); // This is where exam routes are mounted
app.use('/api/results', resultRoutes);
app.use('/api/users', userRoutes);
app.use('/api/public', publicRoutes);

// --- NEW LINE: USE PAYMENT ROUTES ---
app.use('/api/payments', paymentRoutes);
// --- END NEW LINE ---

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on('unhandledRejection', (err, promise) => {
    console.error(`Error: ${err.message}`);
    if (app._isListening) {
        app.close(() => process.exit(1));
    } else {
        process.exit(1);
    }
});
