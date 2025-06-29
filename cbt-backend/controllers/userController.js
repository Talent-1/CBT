// cbt-backend/controllers/userController.js
const User = require('../models/User'); // Make sure the path to your User model is correct

// Example: Get all users (needs to filter by branchId for branch_admin)
exports.getAllUsers = async (req, res) => {
    try {
        let query = {};
        // If the logged-in user is a branch_admin, filter by their branchId
        if (req.user && req.user.role === 'branch_admin') {
            query.branchId = req.user.branchId;
        }
        const users = await User.find(query).select('-password').populate('branchId', 'name'); // Populate branch name
        res.status(200).json(users);
    } catch (error) {
        console.error("Error in getAllUsers:", error);
        res.status(500).json({ message: 'Server Error fetching users.' });
    }
};

// Example: Create a new student
exports.createStudent = async (req, res) => {
    const { fullName, email, password, gender, section, classLevel, branchId } = req.body;
    try {
        let assignedBranchId = branchId;
        if (req.user.role === 'branch_admin') {
            if (branchId && branchId.toString() !== req.user.branchId.toString()) {
                return res.status(403).json({ message: 'Branch administrators can only create students for their own branch.' });
            }
            assignedBranchId = req.user.branchId;
        } else if (req.user.role === 'admin') {
            if (!branchId) {
                 return res.status(400).json({ message: 'Branch ID is required for Super Admin to create a student.' });
            }
        } else {
             return res.status(403).json({ message: 'Unauthorized to create student.' });
        }

        const newStudent = new User({
            fullName, email, password, gender, role: 'student', section, classLevel, branchId: assignedBranchId
        });
        await newStudent.save();
        const studentResponse = await User.findById(newStudent._id).populate('branchId', 'name').select('-password');
        res.status(201).json(studentResponse);
    } catch (error) {
        console.error("Error creating student:", error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email or Student ID already exists.' });
        }
        res.status(500).json({ message: 'Server Error creating student.' });
    }
};

// Example: Update a student
exports.updateStudent = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        // The branchRestriction middleware will handle branch_admin access control
        const student = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password').populate('branchId', 'name');
        if (!student) {
            return res.status(404).json({ message: 'Student not found.' });
        }
        res.status(200).json(student);
    } catch (error) {
        console.error("Error updating student:", error);
        res.status(500).json({ message: 'Server Error updating student.' });
    }
};

// Example: Delete a student
exports.deleteStudent = async (req, res) => {
    const { id } = req.params;
    try {
        // The branchRestriction middleware will handle branch_admin access control
        const student = await User.findByIdAndDelete(id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found.' });
        }
        res.status(200).json({ message: 'Student deleted successfully.' });
    } catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).json({ message: 'Server Error deleting student.' });
    }
};

// Implement getAllTeachers, createTeacher, updateTeacher, deleteTeacher similarly
exports.getAllTeachers = async (req, res) => {
    try {
        let query = { role: 'teacher' };
        if (req.user && req.user.role === 'branch_admin') {
            query.branchId = req.user.branchId;
        }
        const teachers = await User.find(query).select('-password').populate('branchId', 'name');
        res.status(200).json(teachers);
    } catch (error) {
        console.error("Error in getAllTeachers:", error);
        res.status(500).json({ message: 'Server Error fetching teachers.' });
    }
};
exports.createTeacher = async (req, res) => { /* Similar to createStudent */ };
exports.updateTeacher = async (req, res) => { /* Similar to updateStudent */ };
exports.deleteTeacher = async (req, res) => { /* Similar to deleteStudent */ };

// Example: Get data specific to the logged-in user's campus/branch
exports.getMyCampusData = async (req, res) => {
    try {
        // Logic to fetch data relevant to req.user.branchId
        if (req.user.branchId) {
            const branchStudents = await User.find({ role: 'student', branchId: req.user.branchId }).countDocuments();
            const branchTeachers = await User.find({ role: 'teacher', branchId: req.user.branchId }).countDocuments();
            // You can add more branch-specific data here
            res.json({
                branchId: req.user.branchId,
                totalStudents: branchStudents,
                totalTeachers: branchTeachers,
                // Add other branch-specific data here
            });
        } else {
            // For Super Admin or users without a branchId (e.g., student not yet assigned)
            res.json({ message: "No specific campus data for this user role or branch not assigned." });
        }
    } catch (error) {
        console.error("Error in getMyCampusData:", error);
        res.status(500).json({ message: 'Server Error fetching campus data.' });
    }
};