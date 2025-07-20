// cbt-backend/models/Exam.js
const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    // --- NEW: subjectsIncluded array for Unit Exams ---
    subjectsIncluded: [{ 
        subjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject', 
            required: true,
        },
        subjectName: { 
            type: String,
            required: true,
            trim: true,
        },
        numberOfQuestions: { 
            type: Number,
            required: true,
            min: 1,
            
        },
    }],
   

    classLevel: { // e.g., JSS1, SS2, Primary 5 (Overall class level for the unit exam)
        type: String,
        required: true,
        enum: ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'] // IMPORTANT: Keep this enum updated
    },
    duration: { // in minutes - This is now the COMMON duration for the ENTIRE unit exam
        type: Number,
        required: true,
        min: 1
    },
    // 'questions' array will still link to the actual question documents selected for this exam instance
    questions: [{ // Array of ObjectIds, each referencing a Question document selected for THIS exam
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
    }],
    totalQuestionsCount: { // NEW: To store the total number of questions actually in this exam
        type: Number,
        default: 0,
        min: 0,
    },
    // totalMarks: { // This will now typically be `totalQuestionsCount` if each question is 1 mark
    //     type: Number,
    //     default: 0 // Will be calculated after questions are linked
    // },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        required: true
    },
    areaOfSpecialization: { // Department for senior secondary
        type: String,
        enum: ['Sciences', 'Arts', 'Commercial', 'N/A'],
        default: 'N/A',
    }
}, {
    timestamps: true, // This replaces your manual createdAt field and adds updatedAt too
});

// IMPORTANT: This pre-save hook needs to be updated.
// It should now calculate totalQuestionsCount based on questions in the exam.
// The `totalMarks` will likely just be `totalQuestionsCount` if each question is 1 mark.
examSchema.pre('save', function(next) {
    if (this.isModified('questions') || this.isNew) {
        this.totalQuestionsCount = this.questions.length; // Count the number of actual linked questions
        // If you need totalMarks, and it's simply a count of questions:
        // this.totalMarks = this.questions.length;
    }
    next();
});

module.exports = mongoose.model('Exam', examSchema);