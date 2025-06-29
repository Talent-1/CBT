// cbt-backend/routes/resultRoutes.js (MODIFIED - Controller Integration)
const express = require('express');
const router = express.Router();

// Import authentication middleware functions
const { protect, authorizeRoles } = require('../middleware/auth');

// Import controller functions for results
const { getAllResults, getUserResults } = require('../controllers/resultController');

// @route   GET /api/results
// @desc    Get all exam results (for Admin/Branch Admin Dashboard with filters)
// @access  Private (Admin, Branch Admin)
// This route will handle requests like /api/results?classLevel=JSS1&section=A
router.get('/', protect, authorizeRoles('admin', 'branch_admin'), getAllResults);

// @route   GET /api/results/my
// @desc    Get exam results for the authenticated student
// @access  Private (Student)
// This route is for the student's personal results page.
router.get('/my', protect, getUserResults); // Changed from '/user' to '/my' to match frontend usage

// NOTE: The route GET /api/results/:id for a single result
// is generally handled by the backend's getPaymentById for specific payment lookup.
// If you need a *result-specific* :id route for other purposes (e.g., viewing detailed result breakdown),
// you would add a new function in resultController.js and map it here.
// For now, based on your previous contexts, the primary single-record lookup is via payment details.

module.exports = router;
