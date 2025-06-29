const Subject = require('../models/Subject'); // Import your Subject model

// @desc    Get all subjects (including their associated class levels)
// @route   GET /api/subjects
// @access  Public (or Private if only admins can see all subjects)
exports.getAllSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find({}); // Find all subjects
        res.status(200).json({
            success: true,
            count: subjects.length,
            data: subjects
        });
    } catch (error) {
        console.error("Error fetching subjects:", error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching subjects.'
        });
    }
};

// @desc    Get subjects by class level (optional, but useful)
// @route   GET /api/subjects/class/:classLevel
// @access  Public
exports.getSubjectsByClassLevel = async (req, res) => {
    try {
        const { classLevel } = req.params;
        const subjects = await Subject.find({ classLevel: classLevel });

        if (subjects.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No subjects found for class level: ${classLevel}`
            });
        }

        res.status(200).json({
            success: true,
            count: subjects.length,
            data: subjects
        });
    } catch (error) {
        console.error("Error fetching subjects by class level:", error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching subjects by class level.'
        });
    }
};

// @desc    Add a new subject (only for admin)
// @route   POST /api/subjects
// @access  Private (Admin only)
exports.addSubject = async (req, res) => {
    try {
        const { name, classLevel, description } = req.body;

        // Basic validation
        if (!name || !classLevel) {
            return res.status(400).json({
                success: false,
                message: 'Please provide subject name and class level.'
            });
        }

        // Check if subject with this name and classLevel already exists (handled by unique index too, but good to give a custom message)
        const existingSubject = await Subject.findOne({ name, classLevel });
        if (existingSubject) {
            return res.status(409).json({ // 409 Conflict
                success: false,
                message: `Subject '${name}' for class level '${classLevel}' already exists.`
            });
        }

        const newSubject = await Subject.create({ name, classLevel, description });

        res.status(201).json({
            success: true,
            message: 'Subject added successfully!',
            data: newSubject
        });

    } catch (error) {
        console.error("Error adding subject:", error);
        // Handle Mongoose validation errors specifically
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed.',
                errors: errors
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error while adding subject.'
        });
    }
};

// You might also want updateSubject, deleteSubject later