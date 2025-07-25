// cbt-backend/models/Result.js
// (No changes needed here for the logic, this is just for context)
const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
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
    answers: [
        {
            question: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Question',
            },
            selectedOption: {
                type: String,
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

module.exports = mongoose.model('Result', ResultSchema);