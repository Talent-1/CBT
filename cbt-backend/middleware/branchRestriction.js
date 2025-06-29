// cbt-backend/middleware/branchRestriction.js
const mongoose = require('mongoose');

// This middleware restricts CUD operations for 'branch_admin' to resources within their branch.
// It requires the Mongoose model name as a string (e.g., 'User').
exports.restrictToOwnBranch = (modelName) => async (req, res, next) => {
    // This middleware only applies to branch_admins
    if (req.user.role === 'branch_admin') {
        const resourceId = req.params.id; // Get the ID of the resource from the URL parameter

        // Basic validation for the ID
        if (!resourceId || !mongoose.Types.ObjectId.isValid(resourceId)) {
            return res.status(400).json({ message: 'Invalid resource ID provided.' });
        }

        try {
            // Dynamically get the Mongoose Model (e.g., User, Exam, Question, etc.)
            const Model = mongoose.model(modelName);

            // Find the resource by ID and explicitly select its branchId
            // Assuming all models you want to restrict by branch have a 'branchId' field.
            const resource = await Model.findById(resourceId).select('branchId');

            if (!resource) {
                return res.status(404).json({ message: `${modelName} not found.` });
            }

            // Compare the resource's branchId with the branch_admin's branchId
            // Ensure both are converted to string for accurate comparison of ObjectIds
            if (!resource.branchId || resource.branchId.toString() !== req.user.branchId.toString()) {
                return res.status(403).json({ message: `Forbidden: You can only modify ${modelName}s within your assigned branch.` });
            }
        } catch (error) {
            console.error(`Error in restrictToOwnBranch for ${modelName} ID ${resourceId}:`, error.message);
            // Handle potential casting errors if ID format is invalid
            if (error.name === 'CastError') {
                return res.status(400).json({ message: `Invalid ${modelName} ID format.` });
            }
            return res.status(500).json({ message: 'Server error during branch restriction check.' });
        }
    }
    // If not a branch_admin, or if the branch ID matches, proceed
    next();
};