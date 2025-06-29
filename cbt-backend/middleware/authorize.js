// cbt-backend/middleware/authorize.js
// This middleware is designed to be highly flexible for role-based authorization.

const authorize = (roles = [], isSuperAdminRequired = false) => {
    // Ensure roles is always an array
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        // req.user is expected to be populated by the authentication middleware (e.g., auth.js)
        if (!req.user) {
            // This case should ideally be caught by the preceding 'auth' middleware
            return res.status(401).json({ message: 'Unauthorized: No user found in request (authentication failed).' });
        }

        // 1. Check if the user's role is included in the allowedRoles list.
        // If roles array is empty, it means any authenticated user is allowed (handled by the 'auth' middleware)
        if (roles.length > 0 && !roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Forbidden: Your role (${req.user.role}) is not authorized to access this resource.` });
        }

        // 2. If 'isSuperAdminRequired' is true, additionally check if the user is a 'super_admin'.
        // A user is considered a 'super_admin' if their role is 'admin' AND their 'isSuperAdmin' flag is true.
        if (isSuperAdminRequired) {
            if (!(req.user.role === 'admin' && req.user.isSuperAdmin === true)) {
                return res.status(403).json({ message: 'Forbidden: Only Super Administrators can perform this action.' });
            }
        }

        // If all checks pass, proceed to the next middleware/route handler
        next();
    };
};

module.exports = authorize;