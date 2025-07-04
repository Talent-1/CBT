// cbt-backend/routes/questionRoutes.js (MODIFIED)
const express = require('express');
const router = express.Router();
const Question = require('../models/Question'); // Your updated Question model
const Subject = require('../models/Subject');   // To validate subject IDs
const { protect, authorizeRoles } = require('../middleware/auth'); // <-- CORRECTED IMPORT
const questionController = require('../controllers/questionController');

// @route   POST /api/questions
// @desc    Add a new question to the question bank
// @access  Private (Admin/Teacher only)
// CRITICAL FIX HERE: Use 'protect' and 'authorizeRoles'
router.post('/', protect, authorizeRoles('admin'), questionController.addQuestion);

// @route   GET /api/questions
// @desc    Get all questions from the bank (for admin view)
// @access  Private (Admin/Teacher only)
// CRITICAL FIX HERE: Use 'protect' and 'authorizeRoles'
router.get('/', protect, authorizeRoles('admin', 'teacher'), questionController.getAllQuestions);

// @route   GET /api/questions/:id
// @desc    Get a single question by ID
// @access  Private (Admin/Teacher only)
// CRITICAL FIX HERE: Use 'protect' and 'authorizeRoles'
router.get('/:id', protect, authorizeRoles('admin', 'teacher'), questionController.getQuestionById ? questionController.getQuestionById : async (req, res) => {
    // fallback to previous inline logic if not implemented
    try {
        const question = await Question.findById(req.params.id)
                                         .populate('subject', 'name');
        if (!question) {
            return res.status(404).json({ message: 'Question not found.' });
        }
        const questionObj = question.toObject();
        const optionsMap = {};
        question.options.forEach((option, index) => {
            const optionKeyChar = String.fromCharCode(65 + index);
            optionsMap[`option_${optionKeyChar.toLowerCase()}`] = option.text;
        });
        res.json({
            ...questionObj,
            ...optionsMap,
            subjectName: question.subject ? question.subject.name : 'N/A',
            correctOptionLetter: String.fromCharCode(65 + question.correctOptionIndex)
        });
    } catch (err) {
        console.error('Error fetching single question:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid Question ID.' });
        }
        res.status(500).json({ message: 'Server error fetching question.' });
    }
});

// @route   PUT /api/questions/:id
// @desc    Update a question in the bank
// @access  Private (Admin/Teacher only)
// CRITICAL FIX HERE: Use 'protect' and 'authorizeRoles'
router.put('/:id', protect, authorizeRoles('admin', 'teacher'), questionController.updateQuestion);

// @route   DELETE /api/questions/:id
// @desc    Delete a question from the bank
// @access  Private (Admin/Teacher only)
// CRITICAL FIX HERE: Use 'protect' and 'authorizeRoles'
router.delete('/:id', protect, authorizeRoles('admin', 'teacher'), questionController.deleteQuestion);

module.exports = router;