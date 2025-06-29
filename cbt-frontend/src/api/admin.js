// cbt-frontend/src/api/admin.js (MODIFIED - Fixed addExam Endpoint)
import api from './apiClient'; // Assuming apiClient is your Axios instance

// This function is used by RegisterPage to get ALL branches for selection.
// It now calls the new public endpoint.
export const getBranches = async () => {
    try {
        // Point to the new public endpoint
        const response = await api.get('/public/branches');
        return response.data;
    } catch (error) {
        console.error('Error fetching public branches for registration:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load branches for registration.';
        throw new Error(errorMessage);
    }
};

// Example of a new function for a logged-in user to get their campus-specific data
export const getMyCampusData = async () => {
    try {
        // This calls the protected endpoint on the backend
        const response = await api.get('/admin/my-campus-data');
        return response.data;
    } catch (error) {
        console.error('Error fetching user campus data:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load your campus data.';
        throw new Error(errorMessage);
    }
};

// --- NEW FUNCTIONS TO ADD/EXPORT ---

// @desc Add a new exam (for admin)
// @route POST /api/exams (Corrected backend endpoint)
export const addExam = async (examData) => {
    try {
        // --- FIX HERE: Changed '/admin/exams' to '/exams' ---
        const response = await api.post('/exams', examData);
        return response.data;
    } catch (error) {
        console.error('Error adding exam:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to add exam.';
        throw new Error(errorMessage);
    }
};

// @desc Add a new question (for admin)
// @route POST /api/admin/questions (Assumed backend endpoint)
export const addQuestion = async (questionData) => {
    try {
        const response = await api.post('admin/questions', questionData); // Use the correct admin endpoint for questions
        return response.data;
    } catch (error) {
        console.error('Error adding question:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to add question.';
        throw new Error(errorMessage);
    }
};

// @desc Get all results (for admin)
// @route GET /api/admin/results (Already existing)
export const getAllResults = async () => {
    try {
        const response = await api.get('/admin/results');
        return response.data;
    } catch (error) {
        console.error('Error fetching all results:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch results.';
        throw new Error(errorMessage);
    }
};

// @desc Get all users (for admin)
// @route GET /api/admin/users (Assumed backend endpoint)
export const getAllUsers = async () => {
    try {
        const response = await api.get('/admin/users'); // Assuming you have this backend route
        return response.data;
    } catch (error) {
        console.error('Error fetching all users:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch users.';
        throw new Error(errorMessage);
    }
};

// @desc Get all questions (for admin)
// @route GET /api/admin/questions/all (Assumed backend endpoint)
export const getAllQuestions = async () => {
    try {
        const response = await api.get('/admin/questions/all'); // Assuming you have this backend route
        return response.data;
    } catch (error) {
        console.error('Error fetching all questions:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch questions.';
        throw new Error(errorMessage);
    }
};

// --- NEW FUNCTION: Get all subjects (name-classLevel combinations) ---
// @desc Get all subjects (for admin/teacher to select for questions/exams)
// @route GET /api/admin/subjects (Backend endpoint we set up)
export const getAllSubjects = async () => {
    try {
        const response = await api.get('/admin/subjects');
        // Assuming the backend sends back an object like { success: true, data: [...] }
        return response.data.data; // Return the 'data' array from the response
    } catch (error) {
        console.error('Error fetching subjects:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch subjects.';
        throw new Error(errorMessage);
    }
};


// You can keep your other admin-related functions here (e.g., createBranch, deleteBranch etc.)
// Make sure they use the correct protected admin endpoints.
