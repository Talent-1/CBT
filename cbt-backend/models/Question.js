// cbt-backend/models/Question.js
const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    // --- REMOVED: Direct 'examId' linkage ---
    // examId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Exam',
    //     required: true,
    // },
    // --- NEW: Subject and Class Level for question bank categorization ---
    subject: { // Which subject this question belongs to (e.g., Mathematics, Chemistry)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject', // Reference to the new Subject model
        required: true,
    },
    classLevel: { // Which class level(s) this question is suitable for
        type: String,
        required: true,
        enum: ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'] // IMPORTANT: Keep this enum updated
    },
    // --- END NEW ---

    questionText: {
        type: String,
        required: true,
        trim: true,
    },
    options: [
        {
            text: {
                type: String,
                required: true,
                trim: true,
            },
        }
    ],
    correctOptionIndex: {
        type: Number,
        required: true,
        min: 0,
        validate: {
            validator: function(v) {
                return this.options && v < this.options.length;
            },
            message: 'Correct option index out of bounds for the provided options.'
        }
    },
    category: { // e.g., 'Thermodynamics', 'Algebra'
        type: String,
        trim: true,
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        default: 'Medium',
    },
    imageUrl: {
        type: String,
    },
    // Optional: createdBy if you want to track question creators
    // createdBy: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'User',
    // },
}, {
    timestamps: true,
});

console.log('DEBUG: Question model loaded. Schema paths:', Object.keys(QuestionSchema.paths));

module.exports = mongoose.model('Question', QuestionSchema);