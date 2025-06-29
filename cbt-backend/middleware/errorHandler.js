// cbt-backend/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
    console.error(err.stack); // Log the stack trace to the console for debugging

    // Determine the status code: Use the error's statusCode if available, otherwise default to 500
    const statusCode = err.statusCode || 500; 

    // Send a JSON response with the error message
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Server Error' // Use the error's message or a generic 'Server Error'
    });
};

module.exports = errorHandler;