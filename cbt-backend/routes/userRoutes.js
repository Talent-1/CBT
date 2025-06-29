// cbt-backend/routes/userRoutes.js (MODIFIED)
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2; // Make sure Cloudinary is configured
const User = require('../models/User'); // Your User Mongoose model

// CRITICAL FIX HERE: Change import to destructure named exports from authMiddleware.js
const { protect, authorizeRoles } = require('../middleware/auth'); // <-- CORRECTED IMPORT
// You had 'const auth = require('../middleware/auth');'
// Ensure this path points to 'authMiddleware.js' if you renamed your file.

const router = express.Router();

// Configure Multer for in-memory storage (Cloudinary will take care of permanent storage)
const storage = multer.memoryStorage(); // File kept in memory
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(file.originalname.toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed!'));
    }
}).single('profilePicture'); // 'profilePicture' must match the formData.append name from frontend

// PUT /api/users/:userId/profile-picture (Authenticated Route)
// CRITICAL FIX HERE: Use the 'protect' middleware directly
router.put('/:userId/profile-picture', protect, (req, res) => { // <-- Use 'protect' here
    // 1. Ensure the authenticated user matches the userId in the URL or is an admin
    if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to update this profile.' });
    }

    // 2. Process the file upload with Multer
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            return res.status(400).json({ message: err.message });
        } else if (err) {
            // An unknown error occurred when uploading.
            console.error('Multer upload error:', err);
            return res.status(500).json({ message: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        try {
            // 3. Upload file to Cloudinary
            const result = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, {
                folder: `cbt_app/profile_pictures/${req.user.id}`, // Organize uploads by user ID
                public_id: `profile_${Date.now()}` // Unique public ID for the image
            });

            // 4. Update user's profilePictureUrl in the database
            const user = await User.findById(req.params.userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            user.profilePictureUrl = result.secure_url; // Cloudinary's secure URL
            await user.save();

            // 5. Send back the new URL to the frontend
            res.json({ message: 'Profile picture uploaded successfully', profilePictureUrl: user.profilePictureUrl });

        } catch (cloudinaryErr) {
            console.error('Cloudinary upload or DB update error:', cloudinaryErr);
            res.status(500).json({ message: 'Server error during photo upload.' });
        }
    });
});

module.exports = router;