// cbt-backend/routes/examRoutes.js (MODIFIED - Correct Auth Middleware Import)
const express = require('express');
const router = express.Router();

// --- CORRECTED PATH TO AUTH MIDDLEWARE ---
const { protect, authorizeRoles } = require('../middleware/auth'); // Changed from authMiddleware to auth
// --- END CORRECTED PATH ---

// --- IMPORT EXAM CONTROLLER FUNCTIONS ---
const {
    getAllExams,
    addExam,
    getStudentExams,
    getExamQuestions,
    submitExam
} = require('../controllers/examController'); // Adjust path as needed

// @route   GET /api/exams
// @desc    Get all exams (for admin dashboard, etc.)
// @access  Private (e.g., only authenticated users or admins)
router.get('/', protect, getAllExams);

// @route   POST /api/exams
// @desc    Create a new Unit Exam (combining subjects)
// @access  Private (Admin only)
router.post('/', protect, authorizeRoles('admin'), addExam);

// @route   GET /api/exams/student-exams
// @desc    Get exams for a specific student's class level and branch, with payment eligibility
// @access  Private (Student-specific)
router.get('/student-exams', protect, getStudentExams);

// @route   GET /api/exams/:examId/questions
// @desc    Get questions for a specific exam (WITH PAYMENT ELIGIBILITY CHECK)
// @access  Private (Students taking the exam)
router.get('/:examId/questions', protect, getExamQuestions);

// @route   POST /api/exams/:examId/submit (WITH PAYMENT ELIGIBILITY CHECK)
// @desc    Submit an exam
// @access  Private (Student)
router.post('/:examId/submit', protect, submitExam);

module.exports = router;
