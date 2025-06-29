// Example: models/Payment.js (Mongoose Schema)
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming your student users are in the 'User' collection
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'NGN' // Default currency for your system
    },
    paymentDate: { // Date/time the payment was initiated (invoice generated)
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['successful', 'pending', 'failed', 'refunded', 'cancelled'],
        default: 'pending' // Payments initiated via invoice start as 'pending'
    },
    description: { // Reason for payment (e.g., "School Fees", "JSS1 Exam Fee")
        type: String,
        trim: true,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'bank_transfer', 'online_card', 'pos_on_site', 'other'], // Add 'bank_transfer'
        default: 'bank_transfer' // Default for this flow
    },
    transactionRef: { // Your unique payment code from paymentUtils.js
        type: String,
        unique: true,
        required: true // Must be unique and present
    },
    branch: { // Branch associated with the student/payment
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch', // Assuming you have a Branch model
        required: true
    },
    classLevel: { // Student's class level at time of payment
        type: String,
        required: true
    },
    subClassLevel: { // Student's subclass level at time of payment
        type: String,
        uppercase: true, 
        required: true 
    },
    // Fields for admin verification (optional but highly recommended for audit trail)
    verifiedBy: { // User ID of the admin who marked it successful
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verificationDate: { // Date/time of verification
        type: Date
    },
    adminNotes: { // Any notes from the admin during verification
        type: String
    }
}, { timestamps: true }); // Mongoose automatically adds createdAt and updatedAt

module.exports = mongoose.model('Payment', PaymentSchema);