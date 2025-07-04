// cbt-backend/controllers/questionController.js (MODIFIED - Populating Subject in getAllQuestions)
const Question = require('../models/Question');
const mongoose = require('mongoose');

// Example: Get all questions (controller might filter by branchId for branch_admin)
exports.getAllQuestions = async (req, res) => {
    try {
        let query = {};
        // If you want branch_admins to only see questions for their branch,
        // you would add filtering logic here, similar to what we discussed for users.
        // For now, assuming questions are global unless explicitly tied to a branch.
        if (req.user && req.user.role === 'branch_admin' && req.user.branchId) {
            console.warn("Filtering questions by branch for branch_admin is complex if questions don't have direct branchId.");
        }

        // --- FIX HERE: Add .populate('subject', 'name') ---
        // This tells Mongoose to replace the 'subject' ObjectId with the actual
        // Subject document, but only include the 'name' field from it.
        const questions = await Question.find(query).populate('subject', 'name');
        // --- END FIX ---

        console.log('DEBUG (getAllQuestions): Fetched questions, checking population...');
        if (questions.length > 0) {
            console.log('DEBUG (getAllQuestions): First question subject data:', questions[0].subject);
            // Expected output here would be: { _id: ObjectId, name: 'Subject Name' } or null/undefined if not found
        }

        res.status(200).json(questions);
    } catch (error) {
        console.error("Error in getAllQuestions:", error);
        res.status(500).json({ message: 'Server Error fetching questions.' });
    }
};

// Example: Add a new question (Super Admin Only)
exports.addQuestion = async (req, res) => {
    console.log('DEBUG (addQuestion): Received request body:', JSON.stringify(req.body, null, 2));

    const { questionText, options, correctOptionIndex, subject, classLevel } = req.body;

    try {
        if (!questionText || !options || !Array.isArray(options) || options.length === 0 ||
            correctOptionIndex === undefined || correctOptionIndex === null ||
            !subject || !classLevel) {
            console.error('DEBUG (addQuestion): Validation Error: Missing or invalid required fields in request body.');
            return res.status(400).json({ message: 'Please provide all required fields for the question: question text, options, correct option index, subject, and class level.' });
        }

        if (!mongoose.Types.ObjectId.isValid(subject)) {
            console.error(`DEBUG (addQuestion): Validation Error: Invalid Subject ID format: ${subject}`);
            return res.status(400).json({ message: `Invalid Subject ID format provided for ${subject}.` });
        }

        if (correctOptionIndex < 0 || correctOptionIndex >= options.length) {
            console.error('DEBUG (addQuestion): Validation Error: Correct option index out of bounds.');
            return res.status(400).json({ message: 'Correct option index is out of bounds for the provided options.' });
        }

        const newQuestion = new Question({
            questionText: questionText,
            options: options,
            correctOptionIndex: correctOptionIndex,
            subject: subject,
            classLevel: classLevel,
        });
        console.log('DEBUG (addQuestion): New Question instance created:', newQuestion);

        const savedQuestion = await newQuestion.save();
        console.log('DEBUG (addQuestion): Question saved successfully. ID:', savedQuestion._id);

        res.status(201).json(savedQuestion);

    } catch (error) {
        console.error("DEBUG (addQuestion): Error caught in addQuestion:", error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            console.error('DEBUG (addQuestion): Mongoose Validation Error details:', messages);
            return res.status(400).json({ message: `Validation Error: ${messages.join(', ')}` });
        }
        res.status(500).json({ message: 'Server Error adding question.', error: error.message });
    }
};

// @route   DELETE /api/questions/:questionId
// @desc    Delete a question
// @access  Private (Admin only)
exports.deleteQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(questionId)) {
            return res.status(400).json({ message: 'Invalid Question ID.' });
        }
        const deletedQuestion = await Question.findByIdAndDelete(questionId);
        if (!deletedQuestion) {
            return res.status(404).json({ message: 'Question not found.' });
        }
        res.status(200).json({ message: 'Question deleted successfully.' });
    } catch (err) {
        console.error('Error deleting question:', err);
        res.status(500).json({ message: 'Server error deleting question.' });
    }
};

// @route   PUT /api/questions/:questionId
// @desc    Update a question
// @access  Private (Admin only)
exports.updateQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(questionId)) {
            return res.status(400).json({ message: 'Invalid Question ID.' });
        }
        const updateData = req.body;
        const updatedQuestion = await Question.findByIdAndUpdate(questionId, updateData, { new: true })
            .populate('subject', 'name');
        if (!updatedQuestion) {
            return res.status(404).json({ message: 'Question not found.' });
        }
        res.status(200).json({ message: 'Question updated successfully.', question: updatedQuestion });
    } catch (err) {
        console.error('Error updating question:', err);
        res.status(500).json({ message: 'Server error updating question.' });
    }
};
