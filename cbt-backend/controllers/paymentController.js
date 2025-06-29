// cbt-backend/controllers/paymentController.js (FULL, COMPLETE & CORRECTED CODE)

const Payment = require('../models/Payment');
const User = require('../models/User'); // Assuming you have a User model for student search
const Branch = require('../models/Branch'); // Assuming you have a Branch model

// Define allowed letters for subClassLevel validation (e.g., A, B, C for SS2A, SS2B)
const VALID_SUBCLASS_LEVEL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

// @desc Get all payments, optionally filtered by classLevel and section
// @route GET /api/payments?classLevel=X&section=Y
// @access Private (Admin, Branch Admin)
exports.getAllPayments = async (req, res) => {
    try {
        const { classLevel, section } = req.query; // 'section' here is the query parameter from frontend

        let query = {};
        if (classLevel) {
            query.classLevel = classLevel;
        }
        if (section) {
            // Map the 'section' query parameter to 'subClassLevel' field in the model
            // Also, ensure it's uppercased to match how it's stored in the database
            query.subClassLevel = section.toUpperCase(); 

            // Optional: You can add validation here for the section query parameter
            if (!VALID_SUBCLASS_LEVEL_LETTERS.includes(section.toUpperCase())) {
                return res.status(400).json({ message: 'Invalid Section filter provided. Must be a letter from A-I.' });
            }
        }

        // Authorization for branch_admin:
        // If a branch_admin is making the request, filter payments by their assigned branch
        if (req.user.role === 'branch_admin' && req.user.branchId) {
            query.branch = req.user.branchId;
        }

        // Fetch payments based on the constructed query
        const payments = await Payment.find(query)
                                      .populate('student', 'fullName studentId classLevel email section') // Populate student details
                                      .populate('branch', 'name') // Populate branch details
                                      .sort({ createdAt: -1 }); // Order by most recent first

        res.status(200).json(payments);
    } catch (error) {
        console.error('DEBUG (Payment Controller): Error in getAllPayments:', error);
        res.status(500).json({ message: 'Server error: Could not fetch payments.', error: error.message });
    }
};

// @desc Initiate a new pending payment
// @route POST /api/payments/initiate
// @access Private (Student)
exports.initiatePayment = async (req, res) => {
    try {
        // Frontend sends: amount, description, subClassLevel, classLevel, student, branch, paymentMethod
        const { amount, description, subClassLevel, classLevel, student, branch, paymentMethod } = req.body; 

        // Ensure user is authenticated and is a student
        if (!req.user || req.user.role !== 'student') {
            console.error('DEBUG (Payment Controller): User not authorized or not a student.');
            return res.status(401).json({ message: 'Not authorized, student user required' });
        }

        // --- UPDATED VALIDATION ---
        // Check for all required fields explicitly
        if (!amount || !description || !subClassLevel || !classLevel || !student || !branch || !paymentMethod) {
            console.error('DEBUG (Payment Controller): Missing one or more required payment details:', { amount, description, subClassLevel, classLevel, student, branch, paymentMethod });
            return res.status(400).json({ message: 'Missing required payment details. Please provide amount, description, subClassLevel, classLevel, student ID, branch ID, and payment method.' });
        }
        // --- END UPDATED VALIDATION ---

        if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            console.error('DEBUG (Payment Controller): Amount is not a positive number.');
            return res.status(400).json({ message: 'Amount must be a positive number.' });
        }
        // Validate subClassLevel against predefined list using the corrected constant name
        if (!VALID_SUBCLASS_LEVEL_LETTERS.includes(subClassLevel.toUpperCase())) { 
            console.error(`DEBUG (Payment Controller): Invalid subClassLevel provided: ${subClassLevel}. Expected A-I.`);
            return res.status(400).json({ message: 'Invalid Sub-Class Level. Must be a letter from A-I.' });
        }
        
        // Ensure that the 'student' and 'branch' IDs sent match the authenticated user's details
        if (student !== req.user.id.toString()) {
            console.error('DEBUG (Payment Controller): Attempt to create payment for a different student ID.');
            return res.status(403).json({ message: 'Not authorized to create payments for other students.' });
        }
        if (branch !== req.user.branchId.toString()) {
            console.error('DEBUG (Payment Controller): Attempt to create payment for a different branch ID.');
            return res.status(403).json({ message: 'Not authorized to create payments for other branches.' });
        }

        // Generate transactionRef based on authenticated student's details
        const sanitizedStudentIdRef = req.user.studentId.replace(/\//g, '-').replace(/\s/g, ''); 
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        const transactionRef = `PAY_${sanitizedStudentIdRef}-${timestamp}-${randomSuffix}`;
        console.log(`DEBUG (Payment Controller): Generated unique transactionRef: ${transactionRef}`);

        const newPayment = new Payment({
            student: student,
            amount: parseFloat(amount),
            description: description,
            classLevel: classLevel,
            subClassLevel: subClassLevel.toUpperCase(),
            transactionRef: transactionRef,
            status: 'pending',
            paymentDate: new Date(),
            paymentMethod: paymentMethod,
            branch: branch
        });

        const savedPayment = await newPayment.save();
        console.log('DEBUG (Payment Controller): New pending payment saved to DB:', savedPayment._id);

        // Populate student and branch fields for the response
        const populatedPayment = await Payment.findById(savedPayment._id)
            .populate('student', 'fullName studentId classLevel email section')
            .populate('branch', 'name');

        if (!populatedPayment) {
            console.error('DEBUG (Payment Controller): Populated payment not found after save.');
            return res.status(500).json({ message: 'Error retrieving populated payment details.' });
        }

        res.status(201).json({
            message: 'Payment initiation recorded successfully. Please proceed with bank transfer.',
            payment: populatedPayment,
            generatedTransactionRef: populatedPayment.transactionRef
        });

    } catch (error) {
        console.error('DEBUG (Payment Controller): Error initiating payment:', error);
        // More specific error logging for Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            console.error('DEBUG (Payment Controller): Mongoose Validation Error:', messages);
            return res.status(400).json({ message: 'Payment validation failed.', error: messages.join(', ') });
        }
        if (error.code === 11000 && error.keyPattern && error.keyPattern.transactionRef) {
            console.error('DEBUG (Payment Controller): Duplicate key error for transactionRef:', error.errmsg);
            return res.status(409).json({ message: 'A payment with this unique code already exists.' });
        }
        res.status(500).json({ message: 'Server error during payment initiation.', error: error.message });
    }
};

// @desc Update payment status (e.g., from pending to successful)
// @route PUT /api/payments/:id/status
// @access Private (Admin or Branch Admin)
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;

        const allowedStatuses = ['successful', 'failed', 'refunded', 'cancelled'];
        if (!allowedStatuses.includes(status)) {
            console.error('DEBUG (Payment Controller): Invalid status provided for update:', status);
            return res.status(400).json({ message: 'Invalid status provided.' });
        }

        const payment = await Payment.findById(id);

        if (!payment) {
            console.error('DEBUG (Payment Controller): Payment record not found for ID:', id);
            return res.status(404).json({ message: 'Payment record not found.' });
        }

        // Authorization check for branch admin
        if (req.user.role === 'branch_admin' && payment.branch.toString() !== req.user.branchId.toString()) {
            console.warn('DEBUG (Payment Controller): Branch admin unauthorized to update payment from different branch.');
            return res.status(403).json({ message: 'Not authorized to update payments for other branches.' });
        }

        // Prevent status changes from final states
        if (['successful', 'refunded', 'cancelled'].includes(payment.status)) {
            return res.status(400).json({ message: `Payment status cannot be changed from '${payment.status}'.` });
        }

        payment.status = status;
        payment.verifiedBy = req.user.id;
        payment.verificationDate = new Date();
        if (adminNotes) {
            payment.adminNotes = adminNotes;
        }

        await payment.save();

        // Re-find and populate the payment after saving
        const updatedAndPopulatedPayment = await Payment.findById(payment._id)
            .populate('student', 'fullName studentId classLevel email section')
            .populate('branch', 'name');

        console.log('DEBUG (Payment Controller): Payment status updated to:', status, 'for ID:', id);
        res.status(200).json({
            message: `Payment ${id} status updated to ${status} successfully.`,
            payment: updatedAndPopulatedPayment
        });

    } catch (error) {
        console.error('DEBUG (Payment Controller): Error updating payment status:', error);
        res.status(500).json({ message: 'Server error updating payment status.', error: error.message });
    }
};

// @desc Get single payment by ID
// @route GET /api/payments/:id
// @access Private (student can get their own, admin/branch_admin can get any)
exports.getPaymentById = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate('student', 'fullName studentId classLevel email section')
            .populate('branch', 'name');

        if (!payment) {
            console.error('DEBUG (Payment Controller): Payment not found for ID:', req.params.id);
            return res.status(404).json({ message: 'Payment record not found.' });
        }

        // Authorization checks
        if (req.user.role === 'student' && payment.student._id.toString() !== req.user.id.toString()) {
            console.warn('DEBUG (Payment Controller): Student user unauthorized to view another student\'s payment.');
            return res.status(403).json({ message: 'Not authorized to view this payment.' });
        }

        if (req.user.role === 'branch_admin' && payment.branch && payment.branch._id.toString() !== req.user.branchId.toString()) {
             console.warn('DEBUG (Payment Controller): Branch admin unauthorized to view payment from different branch.');
             return res.status(403).json({ message: 'Not authorized to view payments from other branches.' });
        }

        res.status(200).json({ payment });

    } catch (error) {
        console.error('DEBUG (Payment Controller): Error fetching payment by ID:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid payment ID format' });
        }
        res.status(500).json({ message: 'Server error fetching payment details.', error: error.message });
    }
};

// @desc Search for a payment by studentId or transactionRef
// @route GET /api/payments/search?term=<searchTerm>
// @access Private (Admin, Branch Admin)
exports.searchPayment = async (req, res) => {
    const { term } = req.query;

    if (!term) {
        return res.status(400).json({ message: 'Search term is required.' });
    }

    try {
        let payment;
        // First, try to find by transactionRef
        payment = await Payment.findOne({ transactionRef: term })
                               .populate('student', 'fullName studentId classLevel email section')
                               .populate('branch', 'name');

        if (!payment) {
            // If not found by transactionRef, try to find by studentId
            const student = await User.findOne({ studentId: term });

            if (student) {
                // If student found, find their latest pending payment
                payment = await Payment.findOne({ student: student._id, status: 'pending' })
                                       .sort({ createdAt: -1 })
                                       .populate('student', 'fullName studentId classLevel email section')
                                       .populate('branch', 'name');
            }
        }

        if (!payment) {
            return res.status(404).json({ message: 'No payment found for the provided ID or student. Ensure the ID is correct and there is an outstanding pending payment for this student.' });
        }

        // Authorization check for branch admin
        if (req.user.role === 'branch_admin' && payment.branch && payment.branch._id.toString() !== req.user.branchId.toString()) {
            console.warn('DEBUG (Payment Controller): Branch admin unauthorized to view payment from different branch during search.');
            return res.status(403).json({ message: 'Not authorized to view payments from other branches.' });
        }

        res.status(200).json({ payment });

    } catch (error) {
        console.error('DEBUG (Payment Controller): Error searching payment:', error);
        res.status(500).json({ message: 'Server error during payment search.', error: error.message });
    }
};