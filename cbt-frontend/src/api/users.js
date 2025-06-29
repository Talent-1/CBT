// cbt-frontend/src/api/users.js
import api from './api'; // Assuming you have an axios instance set up in api.js

export const uploadProfilePicture = async (userId, formData) => {
    try {
        // Example endpoint: /api/users/:userId/upload-profile-picture
        // The backend will expect a multipart/form-data request
        const response = await api.put(`/users/${userId}/profile-picture`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data', // Important for file uploads
            },
        });
        return response.data; // Should return the updated user object or just the new URL
    } catch (error) {
        console.error('Error uploading profile picture:', error.response?.data || error.message);
        throw error;
    }
};

// You might also add other user-related API calls here, e.g., fetching user by ID
// export const getUserById = async (userId) => { /* ... */ };