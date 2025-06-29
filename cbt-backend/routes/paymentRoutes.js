// cbt-backend/routes/paymentRoutes.js (FIXED VERSION)
const express = require('express');
const router = express.Router();

const { protect, authorizeRoles } = require('../middleware/auth');
const {
    initiatePayment,
    updatePaymentStatus,
    getPaymentById,
    searchPayment,
    // --- START OF REQUIRED ADDITIONS ---
    getAllPayments // <--- YOU MUST IMPORT THIS FUNCTION
    // --- END OF REQUIRED ADDITIONS ---
} = require('../controllers/paymentController');

// === ROUTES DEFINITION ===

// --- START OF REQUIRED ADDITIONS ---
// Route to get all payments or payments filtered by classLevel/section
// This handles GET /api/payments and GET /api/payments?classLevel=SS2&section=A
router.get('/', protect, authorizeRoles('admin', 'branch_admin'), getAllPayments);
// --- END OF REQUIRED ADDITIONS ---

// Route to initiate a payment (create pending record from student side)
router.post('/initiate', protect, initiatePayment);

// Route to search for a payment by studentId or transactionRef
router.get('/search', protect, authorizeRoles('admin', 'branch_admin'), searchPayment);

// Route to get a single payment by its ID
router.get('/:id', protect, getPaymentById);

// Route to update a payment's status
router.put('/:id/status', protect, authorizeRoles('admin', 'branch_admin'), updatePaymentStatus);

// === EXPORT THE ROUTER ===
module.exports = router;