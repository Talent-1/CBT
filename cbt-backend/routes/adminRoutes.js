// cbt-backend/routes/adminRoutes.js (MODIFIED)
const express = require('express');
const router = express.Router();

// --- Import Controller Functions ---
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController');
const questionController = require('../controllers/questionController');
const examController = require('../controllers/examController');

const {
    getAllBranches,
    getBranchesForUser,
    createBranch,
    updateBranch,
    deleteBranch
} = require('../controllers/branchController');

// --- Import Middleware ---
// CRITICAL FIX HERE: Change import to destructure named exports from authMiddleware.js
const { protect, authorizeRoles } = require('../middleware/auth'); // <--- CORRECTED IMPORT
// Assuming '../middleware/authorize' is a separate file exporting a function named 'authorize'
// If authorizeRoles IS your authorize middleware, you can remove this next line.
// Otherwise, ensure this path and export matches your specific setup for 'authorize'
// If authorize is a *different* middleware, keep this, but if it's the same as authorizeRoles, use authorizeRoles.
// For now, I will assume authorize is separate and imported correctly.
const authorize = require('../middleware/authorize'); // Assuming this is distinct from authorizeRoles if it exists.


const { restrictToOwnBranch } = require('../middleware/branchRestriction');

// --- Import Models (for restrictToOwnBranch middleware) ---
const User = require('../models/User'); // Required if restrictToOwnBranch is used on User resources

// --- Define Routes ---

// Apply authentication to all admin routes below this point
// CRITICAL FIX HERE: Use the 'protect' function directly
router.use(protect); // <--- CORRECTED USAGE: Use 'protect' which is the actual middleware function

// @route   GET /api/admin/results
// @desc    Get all results for admin dashboard
// @access  Private (Admin or Branch Admin)
router.get('/results', authorizeRoles('admin', 'branch_admin'), async (req, res) => { // Use authorizeRoles
    const Result = require('../models/Result');
    // ... (rest of your /results route logic remains the same) ...
    try {
        let query = {};
        if (req.user.role === 'branch_admin') {
            console.warn("WARNING: For branch_admin, results fetching for all results needs specific controller logic to filter by branchId.");
        }

        const results = await Result.find(query)
                                   .populate('user', 'fullName studentId email branchId')
                                   .populate('exam', 'title subjectsIncluded classLevel branchId');

        let filteredResults = results;
        if (req.user.role === 'branch_admin') {
            filteredResults = results.filter(result =>
                (result.user && result.user.branchId && result.user.branchId.toString() === req.user.branchId.toString()) ||
                (result.exam && result.exam.branchId && result.exam.branchId.toString() === req.user.branchId.toString())
            );
        }

        res.json(filteredResults);
    } catch (err) {
        console.error("Backend Error fetching all results for admin:", err.message);
        res.status(500).send('Server Error');
    }
});


// @route   GET /api/admin/users
// @desc    Get all users for admin dashboard
// @access  Private (Admin or Branch Admin)
router.get('/users', authorizeRoles('admin', 'branch_admin'), userController.getAllUsers); // Use authorizeRoles


// @route   GET /api/admin/exams
// @desc    Get all exams for admin dashboard
// @access  Private (Admin, Branch Admin, or Teacher) - Teachers/Branch Admins can view exams
router.get('/exams', authorizeRoles('admin', 'branch_admin', 'teacher'), examController.getAllExams); // Use authorizeRoles


// @route   POST /api/admin/exams
// @desc    Add a new exam
// @access  Private (Super Admin Only)
router.post('/exams', authorizeRoles('admin'), examController.addExam); // Corrected: use authorizeRoles with array or single string


// @route   GET /api/admin/questions/all
// @desc    Get all questions for admin dashboard
// @access  Private (Admin, Branch Admin, or Teacher) - Teachers/Branch Admins can view questions
router.get('/questions/all', authorizeRoles('admin', 'branch_admin', 'teacher'), questionController.getAllQuestions); // Use authorizeRoles


// @route   POST /api/admin/questions
// @desc    Add a new question
// @access  Private (Super Admin Only)
router.post('/questions', authorizeRoles('admin'), questionController.addQuestion); // Corrected: use authorizeRoles with array or single string


// --- BRANCH MANAGEMENT ROUTES ---

// @route   GET /api/admin/branches
// @desc    Get all branches (for management and frontend dropdowns)
// @access  Private (Admin or Branch Admin)
router.get('/branches', authorizeRoles('admin', 'branch_admin'), getAllBranches);

// @route   POST /api/admin/branches
// @desc    Create a new branch
// @access  Private (Super Admin Only)
router.post('/branches', authorizeRoles('admin'), createBranch);

// @route   PUT /api/admin/branches/:id
// @desc    Update an existing branch
// @access  Private (Super Admin Only)
router.put('/branches/:id', authorizeRoles('admin'), updateBranch);

// @route   DELETE /api/admin/branches/:id
// @desc    Delete a branch
// @access  Private (Super Admin Only)
router.delete('/branches/:id', authorizeRoles('admin'), deleteBranch);

// --- END BRANCH MANAGEMENT ROUTES ---


// --- USER MANAGEMENT ROUTES (Students & Teachers) ---

// @route   POST /api/admin/students (and /teachers)
// @desc    Create a new student/teacher (Branch admin can create for their branch)
// @access  Private (Admin or Branch Admin)
router.post('/students', authorizeRoles('admin', 'branch_admin'), userController.createStudent);
router.post('/teachers', authorizeRoles('admin', 'branch_admin'), userController.createTeacher);

// @route   PUT /api/admin/students/:id (and /teachers/:id)
// @desc    Update an existing student/teacher
// @access  Private (Admin or Branch Admin - restricted to own branch for branch_admin)
router.put('/students/:id', authorizeRoles('admin', 'branch_admin'), restrictToOwnBranch('User'), userController.updateStudent);
router.put('/teachers/:id', authorizeRoles('admin', 'branch_admin'), restrictToOwnBranch('User'), userController.updateTeacher);

// @route   DELETE /api/admin/students/:id (and /teachers/:id)
// @desc    Delete a student/teacher
// @access  Private (Admin or Branch Admin - restricted to own branch for branch_admin)
router.delete('/students/:id', authorizeRoles('admin', 'branch_admin'), restrictToOwnBranch('User'), userController.deleteStudent);
router.delete('/teachers/:id', authorizeRoles('admin', 'branch_admin'), restrictToOwnBranch('User'), userController.deleteTeacher);

// --- END USER MANAGEMENT ROUTES ---


// @route   GET /api/admin/my-campus-data
// @desc    Get data specific to the logged-in user's campus/branch
// @access  Private (Authenticated - any role)
// This route is generic, specific data will be returned based on req.user.branchId/role in controller
router.get('/my-campus-data', protect, userController.getMyCampusData); // Corrected: use 'protect'

module.exports = router;