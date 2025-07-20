// cbt-backend/models/Exam.js
const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
    // ... other fields ...

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
            min: 1, // <--- CHANGE THIS FROM 0 TO 1
            // REMOVE default: 0, as required: true and min: 1 mean it must be provided and > 0
        },
    }],
    // ... rest of your schema ...
});

// ... pre-save hook and module.exports