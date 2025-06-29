// cbt-backend/models/Subject.js
const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
    name: { // e.g., "Mathematics"
        type: String,
        required: true,
        trim: true,
    },
    classLevel: { // This subject document is SPECIFIC to this class level
        type: String,
        required: true, // Make this required
        enum: ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'],
    },
    // Adding a unique compound index to ensure 'Mathematics SS2' is unique
    // but allows 'Mathematics JSS1' to also exist.
    // This replaces the simple `unique: true` on `name`.
    description: {
        type: String,
        trim: true,
        default: '',
    },
}, {
    timestamps: true,
});

// Define a compound unique index to ensure that a subject name is unique
// for a given class level. This means you can have 'Mathematics' for 'JSS1'
// and 'Mathematics' for 'SS2' as separate documents.
SubjectSchema.index({ name: 1, classLevel: 1 }, { unique: true });

module.exports = mongoose.model('Subject', SubjectSchema);