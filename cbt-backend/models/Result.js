// cbt-backend/models/Result.js
const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true,
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam', // Reference to the Exam model (you'll create this later)
    required: true,
  },
  score: {
    type: Number,
    required: true,
    min: 0,
  },
  totalQuestions: {
    type: Number,
    required: true,
    min: 1,
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  answers: [ // To store user's answers for review
    {
      question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question', // Reference to the Question model
      },
      selectedOption: {
        type: String, // Or Number, depending on your option type
      },
      isCorrect: {
        type: Boolean,
      },
    },
  ],
  dateTaken: {
    type: Date,
    default: Date.now,
  },
});

// Export the Mongoose model. Mongoose will automatically
// create a collection named 'results' (lowercase, plural) in your database.
module.exports = mongoose.model('Result', ResultSchema);