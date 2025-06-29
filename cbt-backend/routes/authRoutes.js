// cbt-backend/routes/authRoutes.js (MODIFIED)
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
    const { fullName, email, password, gender, role, branchId, section, classLevel, areaOfSpecialization } = req.body;

    console.log('Register attempt payload received:', {
        fullName, email, gender, role, branchId, section, classLevel, areaOfSpecialization
    });

    try {
        let user = null;

        if (email) {
            user = await User.findOne({ email });
        }

        if (user) {
            console.error('*** CONFLICT DETECTED ***');
            console.error('Attempted registration for:', { email: email, studentId: req.body.studentId });
            console.error('Conflicting existing user details:', {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                studentId: user.studentId,
                role: user.role,
                createdAt: user.createdAt
            });
            console.error('*** END CONFLICT INFO ***');
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        user = new User({
            fullName,
            ...(email && { email }),
            password,
            gender,
            role: role || 'student',
            branchId,
            ...(role === 'student' && { section, classLevel }),
            ...(role === 'teacher' && { areaOfSpecialization }),
        });

        console.log('Attempting to save new user (before pre-save hooks):', {
            fullName: user.fullName,
            role: user.role,
            email: user.email,
            studentId: user.studentId
        });

        await user.save();

        console.log('User saved successfully (after pre-save hooks):', {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            studentId: user.studentId,
            role: user.role
        });

        const payload = {
            user: {
                id: user.id, // Mongoose virtual 'id' for _id
                email: user.email, // <-- ADDED EMAIL HERE
                fullName: user.fullName, // <-- ADDED FULLNAME HERE (optional but good for req.user)
                studentId: user.studentId, // <-- ADDED STUDENTID HERE (optional but good for req.user)
                role: user.role,
                branchId: user.branchId,
                classLevel: user.classLevel,
                section: user.section
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) {
                    console.error('JWT Token Generation Error:', err);
                    return res.status(500).json({ message: 'Failed to generate authentication token.' });
                }
                res.status(201).json({
                    message: 'User registered successfully',
                    token,
                    user: {
                        _id: user._id,
                        fullName: user.fullName,
                        email: user.email,
                        role: user.role,
                        branchId: user.branchId,
                        studentId: user.studentId,
                        section: user.section,
                        classLevel: user.classLevel,
                    }
                });
            }
        );

    } catch (err) {
        console.error('Backend registration error (catch block):', err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Error: ${messages.join(', ')}` });
        }
        if (err.code === 11000) {
            let field = Object.keys(err.keyValue)[0];
            let value = err.keyValue[field];
            if (field === 'email') {
                return res.status(400).json({ message: `User with email '${value}' already exists.` });
            } else if (field === 'studentId') {
                return res.status(400).json({ message: `User with Student ID '${value}' already exists.` });
            }
            return res.status(400).json({ message: `Duplicate value for ${field}: ${value}` });
        }
        res.status(500).send('Server Error');
    }
});


// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { identifier, password } = req.body;

    console.log('Login attempt received for identifier:', identifier);

    try {
        let user;

        if (identifier && identifier.includes('@')) {
            user = await User.findOne({ email: identifier }).select('+password');
        } else {
            user = await User.findOne({ studentId: identifier }).select('+password');
        }

        if (!user) {
            console.warn(`Login failed: User not found for identifier '${identifier}'`);
            return res.status(400).json({ message: 'Invalid Credentials: User not found.' });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            console.warn(`Login failed: Invalid password for user '${identifier}'`);
            return res.status(400).json({ message: 'Invalid Credentials: Password incorrect.' });
        }

        const payload = {
            user: {
                id: user.id, // Mongoose virtual 'id' for _id
                email: user.email, // <-- ADDED EMAIL HERE
                fullName: user.fullName, // <-- ADDED FULLNAME HERE (optional but good for req.user)
                studentId: user.studentId, // <-- ADDED STUDENTID HERE (optional but good for req.user)
                role: user.role,
                branchId: user.branchId,
                classLevel: user.classLevel,
                section: user.section
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) {
                    console.error('JWT Token Generation Error during login:', err);
                    return res.status(500).json({ message: 'Failed to generate authentication token during login.' });
                }
                res.json({
                    message: 'Login successful',
                    token,
                    user: {
                        _id: user._id,
                        fullName: user.fullName,
                        email: user.email,
                        studentId: user.studentId,
                        role: user.role,
                        branchId: user.branchId,
                        section: user.section,
                        classLevel: user.classLevel,
                        profilePictureUrl: user.profilePictureUrl,
                    }
                });
            }
        );

    } catch (err) {
        console.error('Backend login error (catch block):', err.message);
        res.status(500).send('Server Error during login');
    }
});

module.exports = router;