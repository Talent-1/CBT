// cbt-backend/middleware/auth.js (FINAL FIX - Correctly assigning and checking req.user.id)
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

// This is your 'protect' middleware
exports.protect = (req, res, next) => {
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        console.log('DEBUG (Backend Auth - PROTECT): No token provided in headers.');
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        console.log('DEBUG (Backend Auth - PROTECT): JWT_SECRET being used for verification:', process.env.JWT_SECRET);
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('DEBUG (Backend Auth - PROTECT): Decoded JWT payload:', decoded);

        // Assign the inner 'user' object directly to req.user
        req.user = decoded.user; 
        
        // --- THE KEY FIX IS HERE ---
        // Ensure req.user and its 'id' property are present
        if (!req.user || !req.user.id) { // Changed from !req.user._id to !req.user.id
            console.error('DEBUG (Backend Auth - PROTECT): req.user is missing required "id" field after token decoding. Full decoded object was:', decoded);
            return res.status(401).json({ message: 'Authentication failed: Invalid token structure or missing user ID.' });
        }

        // At this point, req.user is correctly populated with { id, email, fullName, role, branchId }
        console.log('DEBUG (Backend Auth - PROTECT): Token successfully verified and req.user set. User ID:', req.user.id, 'Email:', req.user.email);
        next();
    } catch (err) {
        console.error('DEBUG (Backend Auth - PROTECT): JWT Verification Failed! Error name:', err.name, 'Message:', err.message);
        console.error('DEBUG (Backend Auth - PROTECT): Full Error Object:', err);
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// This is your 'authorizeRoles' middleware
exports.authorizeRoles = (...roles) => {
    return (req, res, next) => {
        // req.user should now reliably have the 'role' property directly
        if (!req.user || !req.user.role) {
            console.log('DEBUG (Backend Auth - AUTHORIZE): User or User Role not found on req.user. This is critical and indicates a problem with the protect middleware or token payload.');
            return res.status(403).json({ message: 'Authorization required: User role not found or insufficient data.' });
        }
        if (!roles.includes(req.user.role)) {
            console.log(`DEBUG (Backend Auth - AUTHORIZE): User role '${req.user.role}' not in allowed roles: ${roles.join(', ')}`);
            return res.status(403).json({ message: `Role (${req.user.role}) is not authorized to access this resource.` });
        }
        console.log(`DEBUG (Backend Auth - AUTHORIZE): User role '${req.user.role}' authorized.`);
        next();
    };
};
