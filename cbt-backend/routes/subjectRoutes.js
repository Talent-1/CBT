// cbt-backend/routes/subjectRoutes.js (MODIFIED)
const express = require('express');
const router = express.Router();

// CRITICAL FIX HERE: Change import to destructure named exports from authMiddleware.js
const { protect, authorizeRoles } = require('../middleware/auth'); // <-- CORRECTED IMPORT
// You had 'const auth = require('../middleware/auth');'
// Ensure this path points to 'authMiddleware.js' if you renamed your file.

// Import the controller functions
const subjectController = require('../controllers/subjectController');

// @route   GET /api/subjects
// @desc    Get all subjects (each represents a name-classLevel combination)
// @access  Public (or Private, depending on your app's needs)
// This endpoint will return all Subject documents like { _id, name: "Mathematics", classLevel: "JSS1" }
router.get('/', protect, subjectController.getAllSubjects); // <-- Use 'protect' here

// @route   GET /api/subjects/class/:classLevel
// @desc    Get subjects filtered by a specific class level
// @access  Public
router.get('/class/:classLevel', protect, subjectController.getSubjectsByClassLevel); // <-- Use 'protect' here

// @route   POST /api/subjects
// @desc    Add a new subject (e.g., Mathematics for SS2)
// @access  Private (Admin only)
// This endpoint expects { name: "Mathematics", classLevel: "SS2", description: "..." }
// Assuming you want 'admin' role to be able to add subjects.
router.post('/', protect, authorizeRoles('admin'), subjectController.addSubject); // <-- Use 'protect' and 'authorizeRoles' here

// You would add PUT/DELETE routes here as well if needed.

module.exports = router;