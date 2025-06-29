// cbt-backend/models/Branch.js
const mongoose = require('mongoose');

const BranchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  code: { // Short code for the branch, used in student IDs
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 2,
    maxlength: 3
  },
});

// IMPORTANT: Define and export the Mongoose Model
// We explicitly tell Mongoose to use the collection named 'Branch' (with uppercase B)
// because you manually created it that way and db.Branch.countDocuments({}) confirms data there.
module.exports = mongoose.model('Branch', BranchSchema, 'Branch');