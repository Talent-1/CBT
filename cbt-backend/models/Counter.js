// cbt-backend/models/Counter.js
const mongoose = require('mongoose');

const counterSchema = mongoose.Schema({
    _id: { // This will be a compound key: e.g., "studentId_AB_25"
        type: String,
        required: true,
        // REMOVE unique: true, as _id is inherently unique
    },
    seq: { // The next sequence number
        type: Number,
        default: 0
    },
    branchId: { // To easily query counters for a specific branch (though _id already implies it)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        required: true
    },
    year: { // To easily query counters for a specific year (though _id already implies it)
        type: Number,
        required: true
    }
});

// Static method to atomically increment the sequence for a given counter name
counterSchema.statics.getNextSequence = async function(name, branchId, year) {
    const counter = await this.findOneAndUpdate(
        { _id: name, branchId: branchId, year: year }, // Query for the specific counter
        { $inc: { seq: 1 } }, // Increment the sequence by 1
        { new: true, upsert: true, setDefaultsOnInsert: true } // Return the updated document, create if it doesn't exist, set defaults on insert
    );
    return counter.seq;
};

module.exports = mongoose.model('Counter', counterSchema);