// cbt-backend/controllers/branchController.js
const Branch = require('../models/Branch'); // Your Mongoose Branch model

// @desc    Get all branches from the database
// @route   (Internal to controllers) Used by both public and admin routes
// @access  Public/Private depending on route it's mounted to
exports.getAllBranches = async (req, res, next) => {
    try {
        const branches = await Branch.find({}).sort({ name: 1 }); // Fetches ALL branches, sorted by name
        res.status(200).json(branches);
    } catch (error) {
        console.error('Error in getAllBranches controller:', error.message);
        // Pass error to Express's global error handler
        next(error);
    }
};

// @desc    Get branches/data specific to the logged-in user's campus/branch
// @route   GET /api/admin/my-campus-data (or similar)
// @access  Private (Authenticated)
// NOTE: This assumes req.user is populated by your auth middleware with req.user.branchId
exports.getBranchesForUser = async (req, res, next) => {
    try {
        // If the 'auth' middleware populates req.user.branchId
        const userBranchId = req.user.branchId;

        if (!userBranchId) {
            return res.status(400).json({ message: 'Branch ID not found for authenticated user.' });
        }

        // Example: Fetch data specifically for this branch
        const branch = await Branch.findById(userBranchId);
        if (!branch) {
            return res.status(404).json({ message: 'Branch not found for user.' });
        }

        // You can fetch other data related to this branch here too
        // E.g., users in this branch, exams for this branch, etc.
        // const usersInBranch = await User.find({ branchId: userBranchId });
        // const examsForBranch = await Exam.find({ branchId: userBranchId });

        res.status(200).json({
            branch: branch,
            // users: usersInBranch,
            // exams: examsForBranch,
            message: `Data for your campus (${branch.name})`
        });

    } catch (error) {
        console.error('Error in getBranchesForUser controller:', error.message);
        next(error);
    }
};

// --- NEW BRANCH CONTROLLER FUNCTIONS ---

// @desc    Create a new branch
// @route   POST /api/admin/branches (or similar, depending on adminRoutes structure)
// @access  Private (Admin only)
exports.createBranch = async (req, res, next) => {
    try {
        const { name, address } = req.body;

        if (!name || !address) {
            return res.status(400).json({ message: 'Branch name and address are required.' });
        }

        // Check if a branch with this name already exists
        const existingBranch = await Branch.findOne({ name });
        if (existingBranch) {
            return res.status(409).json({ message: 'A branch with this name already exists.' });
        }

        const newBranch = new Branch({ name, address });
        const savedBranch = await newBranch.save();

        res.status(201).json({ message: 'Branch created successfully', branch: savedBranch });
    } catch (error) {
        console.error('Error in createBranch controller:', error.message);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Error: ${messages.join(', ')}` });
        }
        next(error);
    }
};

// @desc    Update an existing branch
// @route   PUT /api/admin/branches/:id (or similar)
// @access  Private (Admin only)
exports.updateBranch = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, address } = req.body;

        if (!name && !address) { // Allow partial updates if only one field is provided
            return res.status(400).json({ message: 'At least one field (name or address) is required for update.' });
        }

        const updatedBranch = await Branch.findByIdAndUpdate(
            id,
            { $set: { name, address } }, // Use $set to only update provided fields
            { new: true, runValidators: true } // Return the updated document and run schema validators
        );

        if (!updatedBranch) {
            return res.status(404).json({ message: 'Branch not found.' });
        }

        res.status(200).json({ message: 'Branch updated successfully', branch: updatedBranch });
    } catch (error) {
        console.error('Error in updateBranch controller:', error.message);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Error: ${messages.join(', ')}` });
        }
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid Branch ID format.' });
        }
        next(error);
    }
};

// @desc    Delete a branch
// @route   DELETE /api/admin/branches/:id (or similar)
// @access  Private (Admin only)
exports.deleteBranch = async (req, res, next) => {
    try {
        const { id } = req.params;

        const deletedBranch = await Branch.findByIdAndDelete(id);

        if (!deletedBranch) {
            return res.status(404).json({ message: 'Branch not found.' });
        }

        // IMPORTANT CONSIDERATION:
        // If you delete a branch, any users or exams associated with this branchId
        // will have an invalid reference. You might want to:
        // 1. Prevent deletion if there are associated users/exams.
        // 2. Set the branchId field to null/default on associated documents.
        // 3. Delete cascade (more complex and risky).
        // For now, we'll just delete the branch. Implement cascading logic carefully if needed.

        res.status(200).json({ message: 'Branch deleted successfully', branchId: id });
    } catch (error) {
        console.error('Error in deleteBranch controller:', error.message);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid Branch ID format.' });
        }
        next(error);
    }
};

