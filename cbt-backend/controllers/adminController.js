// cbt-backend/controllers/adminController.js
const Exam = require('../models/Exam');         // Import the Exam model
const Question = require('../models/Question'); // Import the Question model
const User = require('../models/User');         // Example: if you need to fetch users
const Result = require('../models/Result');     // Example: if you need to manage results
const Branch = require('../models/Branch');     // Example: if you need to manage branches
const mongoose = require('mongoose');           // For Mongoose utility functions like isValidObjectId

// @desc    Add a new exam
// @route   POST /api/admin/exams
// @access  Private (Admin Only)
exports.addExam = async (req, res) => {
  try {
    const { title, subject, classLevel, duration, createdBy } = req.body;

    // --- Backend Validation ---
    if (!title || !subject || !classLevel || !duration || !createdBy) {
      console.error('Backend Validation Error: Missing required fields for new exam.');
      return res.status(400).json({ message: 'Please provide all required fields: title, subject, classLevel, duration, and createdBy.' });
    }

    if (isNaN(duration) || parseInt(duration) <= 0) {
      console.error('Backend Validation Error: Invalid duration:', duration);
      return res.status(400).json({ message: 'Duration must be a positive number.' });
    }

    if (!mongoose.Types.ObjectId.isValid(createdBy)) {
        console.error('Backend Validation Error: createdBy is not a valid ObjectId:', createdBy);
        return res.status(400).json({ message: 'Invalid creator ID format.' });
    }
    // --- End Backend Validation ---

    const newExam = new Exam({
      title,
      subject,
      classLevel,
      duration: parseInt(duration),
      questions: [], // New exams start with no questions
      createdBy,
    });

    await newExam.save();
    console.log('Backend: Successfully added new exam to DB:', newExam);
    res.status(201).json({ message: 'Exam added successfully!', exam: newExam });

  } catch (error) {
    console.error('Backend: Error in addExam controller:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: `Validation failed: ${messages.join(', ')}` });
    } else if (error.code === 11000) { // MongoDB duplicate key error (if you have unique indexes)
        return res.status(409).json({ message: 'An exam with similar details already exists.' });
    }
    res.status(500).json({ message: 'Server error while adding exam.' });
  }
};


// @desc    Add a new question to an exam
// @route   POST /api/admin/questions
// @access  Private (Admin Only)
exports.addQuestion = async (req, res) => { // <-- Ensure 'exports.' is here!
  try {
    const { examId, questionText, optionA, optionB, optionC, optionD, correctOption } = req.body;

    // --- Backend Validation ---
    if (!examId || !questionText || !optionA || !optionB || !optionC || !optionD || !correctOption) {
      console.error('Backend Validation Error: Missing required fields for new question.');
      return res.status(400).json({ message: 'Please provide all required fields for the question.' });
    }

    if (!mongoose.Types.ObjectId.isValid(examId)) {
        console.error('Backend Validation Error: Invalid examId provided:', examId);
        return res.status(400).json({ message: 'Invalid Exam ID format.' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      console.error('Backend Validation Error: Exam not found for examId:', examId);
      return res.status(404).json({ message: 'Exam not found.' });
    }

    // Convert 'A', 'B', 'C', 'D' to 0, 1, 2, 3 for correctOptionIndex
    let correctOptionIndex;
    const validOptionsMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
    if (validOptionsMap.hasOwnProperty(correctOption.toUpperCase())) {
      correctOptionIndex = validOptionsMap[correctOption.toUpperCase()];
    } else {
      console.error('Backend Validation Error: Invalid correctOption value:', correctOption);
      return res.status(400).json({ message: 'Correct option must be A, B, C, or D.' });
    }
    // --- End Backend Validation ---

    // CORRECTED: Construct the options array to match the schema
    // Each option is an object with a 'text' property
    const optionsArray = [
      { text: optionA },
      { text: optionB },
      { text: optionC },
      { text: optionD },
    ];

    const newQuestion = new Question({
      examId,
      questionText, // Your model uses 'questionText', so directly use the frontend value
      options: optionsArray, // <-- Use the newly constructed array of objects
      correctOptionIndex, // <-- Use the calculated index
      // If your Question model has a 'createdBy' field and your auth middleware attaches user info to req.user:
      // createdBy: req.user._id,
    });

    await newQuestion.save();

    // Now, associate this new question's ID with the respective exam
    // Make sure your Exam model has a 'questions' array field:
    // questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }]
    exam.questions.push(newQuestion._id);
    await exam.save(); // Save the exam to update its questions array

    console.log('Backend: Successfully added new question to DB and linked to exam:', newQuestion);
    res.status(201).json({ message: 'Question added successfully!', question: newQuestion });

  } catch (error) {
    console.error('Backend: Error in addQuestion controller:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      console.error('Full Mongoose Validation Error Object:', JSON.stringify(error, null, 2));
      return res.status(400).json({ message: `Validation failed: ${messages.join(', ')}` });
    }
    res.status(500).json({ message: 'Server error while adding question.' });
  }
};

// You can add other admin-specific controller functions here as needed.
// For example, if you move existing route logic into controllers:
// exports.getAllUsers = async (req, res) => { /* ... */ };
// exports.getAllResults = async (req, res) => { /* ... */ };
// exports.getAllExams = async (req, res) => { /* ... */ };
// exports.getAllQuestions = async (req, res) => { /* ... */ };