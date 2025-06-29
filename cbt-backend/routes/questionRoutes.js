// cbt-backend/routes/questionRoutes.js (MODIFIED)
const express = require('express');
const router = express.Router();
const Question = require('../models/Question'); // Your updated Question model
const Subject = require('../models/Subject');   // To validate subject IDs

// CRITICAL FIX HERE: Change import to destructure named exports from authMiddleware.js
const { protect, authorizeRoles } = require('../middleware/auth'); // <-- CORRECTED IMPORT
// You had 'const auth = require('../middleware/auth');'
// Ensure this path points to 'authMiddleware.js' if you renamed your file.

// @route   POST /api/questions
// @desc    Add a new question to the question bank
// @access  Private (Admin/Teacher only)
// CRITICAL FIX HERE: Use 'protect' and 'authorizeRoles'
router.post('/', protect, authorizeRoles('admin', 'teacher'), async (req, res) => {
    console.log('Backend: POST /api/questions received req.body:', req.body);
    try {
        const { questionText, options, correctOptionIndex, subject, classLevel, category, difficulty, imageUrl } = req.body;

        // Basic validation
        if (!questionText || !options || options.length === 0 || correctOptionIndex === undefined || correctOptionIndex === null || !subject || !classLevel) {
            return res.status(400).json({ message: 'Please provide questionText, options, correctOptionIndex, subject, and classLevel.' });
        }

        // Validate correctOptionIndex against provided options
        if (correctOptionIndex < 0 || correctOptionIndex >= options.length) {
            return res.status(400).json({ message: 'Correct option index is out of bounds for the provided options.' });
        }

        // Validate if subject exists (optional but good practice)
        const existingSubject = await Subject.findById(subject);
        if (!existingSubject) {
            return res.status(400).json({ message: 'Invalid subject ID provided.' });
        }

        const newQuestion = new Question({
            questionText,
            options,
            correctOptionIndex,
            subject,    // Storing subject ObjectId
            classLevel, // Storing classLevel string
            category,
            difficulty,
            imageUrl,
            // createdBy: req.user.id, // Uncomment if you want to track question creator
        });

        const savedQuestion = await newQuestion.save();

        // Populate subject name for the response
        const populatedQuestion = await Question.findById(savedQuestion._id)
                                                 .populate('subject', 'name');

        res.status(201).json({ message: 'Question added to bank successfully', question: populatedQuestion });

    } catch (err) {
        console.error('Error adding question to bank:', err.message);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Error: ${messages.join(', ')}` });
        }
        res.status(500).json({ message: 'Server error while adding question.' });
    }
});

// @route   GET /api/questions
// @desc    Get all questions from the bank (for admin view)
// @access  Private (Admin/Teacher only)
// CRITICAL FIX HERE: Use 'protect' and 'authorizeRoles'
router.get('/', protect, authorizeRoles('admin', 'teacher'), async (req, res) => {
    try {
        // Allow filtering by subject and classLevel for easier management
        const { subjectId, classLevel } = req.query;
        let query = {};
        if (subjectId) {
            query.subject = subjectId;
        }
        if (classLevel) {
            query.classLevel = classLevel;
        }

        const questions = await Question.find(query)
                                        .populate('subject', 'name') // Populate subject name for display
                                        .sort({ createdAt: -1 }); // Latest first

        // Transform questions to include 'option_a', 'option_b' format if needed for frontend display
        const transformedQuestions = questions.map(q => {
            const questionObj = q.toObject(); // Convert Mongoose document to plain JS object
            const optionsMap = {};
            q.options.forEach((option, index) => {
                const optionKeyChar = String.fromCharCode(65 + index); // Gets 'A', 'B', 'C', 'D'
                optionsMap[`option_${optionKeyChar.toLowerCase()}`] = option.text;
            });
            return {
                ...questionObj,
                ...optionsMap,
                subjectName: q.subject ? q.subject.name : 'N/A', // Flatten subject name
                correctOptionLetter: String.fromCharCode(65 + q.correctOptionIndex) // A, B, C etc.
            };
        });

        res.json(transformedQuestions);
    } catch (err) {
        console.error('Error fetching questions from bank:', err.message);
        res.status(500).json({ message: 'Server error fetching questions.' });
    }
});

// @route   GET /api/questions/:id
// @desc    Get a single question by ID
// @access  Private (Admin/Teacher only)
// CRITICAL FIX HERE: Use 'protect' and 'authorizeRoles'
router.get('/:id', protect, authorizeRoles('admin', 'teacher'), async (req, res) => {
    try {
        const question = await Question.findById(req.params.id)
                                         .populate('subject', 'name'); // Populate subject for detailed view

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
router.put('/:id', protect, authorizeRoles('admin', 'teacher'), async (req, res) => {
    try {
        const { questionText, options, correctOptionIndex, subject, classLevel, category, difficulty, imageUrl } = req.body;

        // Basic validation for required fields on update
        if (!questionText || !options || options.length === 0 || correctOptionIndex === undefined || correctOptionIndex === null || !subject || !classLevel) {
            return res.status(400).json({ message: 'All fields (questionText, options, correctOptionIndex, subject, classLevel) are required for update.' });
        }
        if (correctOptionIndex < 0 || correctOptionIndex >= options.length) {
            return res.status(400).json({ message: 'Correct option index is out of bounds for the provided options.' });
        }

        const updatedQuestion = await Question.findByIdAndUpdate(
            req.params.id,
            { questionText, options, correctOptionIndex, subject, classLevel, category, difficulty, imageUrl },
            { new: true, runValidators: true } // `new: true` returns the updated document, `runValidators: true` runs schema validators
        ).populate('subject', 'name'); // Populate subject for the response

        if (!updatedQuestion) {
            return res.status(404).json({ message: 'Question not found.' });
        }

        res.json({ message: 'Question updated successfully', question: updatedQuestion });

    } catch (err) {
        console.error('Error updating question:', err.message);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Error: ${messages.join(', ')}` });
        }
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid Question ID.' });
        }
        res.status(500).json({ message: 'Server error while updating question.' });
    }
});

// @route   DELETE /api/questions/:id
// @desc    Delete a question from the bank
// @access  Private (Admin/Teacher only)
// CRITICAL FIX HERE: Use 'protect' and 'authorizeRoles'
router.delete('/:id', protect, authorizeRoles('admin', 'teacher'), async (req, res) => {
    try {
        const deletedQuestion = await Question.findByIdAndDelete(req.params.id);

        if (!deletedQuestion) {
            return res.status(404).json({ message: 'Question not found.' });
        }

        // IMPORTANT: If you delete a question from the bank, and it's referenced by existing Exams,
        // those exams will have an invalid ObjectId in their 'questions' array.
        // You might want to consider:
        // 1. Preventing deletion if the question is part of an active exam.
        // 2. Removing the question's ObjectId from all exams that reference it (more complex).
        // For simplicity now, we'll just delete. This is an edge case to be aware of.

        res.json({ message: 'Question deleted successfully', questionId: req.params.id });

    } catch (err) {
        console.error('Error deleting question:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid Question ID.' });
        }
        res.status(500).json({ message: 'Server error while deleting question.' });
    }
});

module.exports = router;