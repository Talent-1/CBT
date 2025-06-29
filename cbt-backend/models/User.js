// cbt-backend/models/user.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import the new Counter model (you need to create models/Counter.js)
const Counter = require('./Counter');
// Import the Branch model to fetch the campus 'code' (make sure models/Branch.js exists)
const Branch = require('./Branch');

const userSchema = mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            unique: true,
            sparse: true,
            match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
            select: false,
        },
        gender: {
            type: String,
            required: true,
            enum: ['Male', 'Female'],
        },
        role: {
            type: String,
            required: true,
            enum: ['student', 'teacher', 'admin', 'branch_admin'], // Ensure 'branch_admin' is listed here
            default: 'student',
        },
        // --- Added isSuperAdmin field ---
        isSuperAdmin: {
            type: Boolean,
            default: false, // Default to false, explicitly set to true for the Super Admin
        },
        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Branch',
            required: function() {
                // branchId is required if the role is NOT 'admin'
                return this.role !== 'admin';
            },
        },
        studentId: {
            type: String,
            unique: true,
            sparse: true,
        },
        section: {
            type: String,
            enum: ['Junior', 'Senior'],
            required: function() { return this.role === 'student'; },
        },
        classLevel: {
            type: String,
            enum: ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'],
            required: function() { return this.role === 'student'; },
        },
        areaOfSpecialization: {
            type: String,
            required: function() { return this.role === 'teacher'; },
        },
        profilePictureUrl: {
            type: String,
            default: '/path/to/default/avatar.png',
        },
    },
    {
        timestamps: true,
    }
);

// Pre-save hook to hash password and generate studentId
userSchema.pre('save', async function (next) {
    // Only hash password if it's new or has been modified
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }

    // --- NEW STUDENT ID GENERATION LOGIC ---
    // Only generate if it's a new document, the role is 'student', and studentId is not already set
    if (this.isNew && this.role === 'student' && !this.studentId) {
        try {
            console.log(`[User Model Pre-Save] Attempting to generate structured studentId for new student.`);

            const currentYear = new Date().getFullYear().toString().slice(-2);

            const branch = await Branch.findById(this.branchId);
            if (!branch) {
                console.error(`[User Model Pre-Save] ERROR: Branch with ID ${this.branchId} not found.`);
                return next(new Error('Selected branch not found for student ID generation.'));
            }

            const campusCode = branch.code;

            if (!campusCode) {
                console.error(`[User Model Pre-Save] ERROR: 'code' field is missing or empty for branch ID ${this.branchId}.`);
                return next(new Error('Campus code (field named "code") is missing for the selected branch.'));
            }

            const counterName = `studentId_${campusCode}_${currentYear}`;

            // Make sure you have models/Counter.js for this to work
            const nextSeq = await Counter.getNextSequence(counterName, this.branchId, parseInt(currentYear));

            const studentIndex = String(nextSeq).padStart(3, '0');

            this.studentId = `CGS/${campusCode}/${currentYear}/${studentIndex}`;
            console.log(`[User Model Pre-Save] Successfully generated and assigned studentId: ${this.studentId}`);

        } catch (error) {
            console.error('[User Model Pre-Save] FATAL ERROR during student ID generation:', error);
            return next(new Error(`Failed to generate student ID: ${error.message}`));
        }
    }
    // --- END NEW STUDENT ID GENERATION LOGIC ---

    next(); // Continue with save operation
});

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// If the 'User' model has already been compiled, use it; otherwise, compile it.
module.exports = mongoose.models.User || mongoose.model('User', userSchema);