// cbt-frontend/src/api/results.js
import apiClient from './apiClient';

// Get all results for the logged-in user
export const getUserResults = async () => {
  try {
    // CHANGE THIS LINE: from '/results/my' to '/results/user'
    const response = await apiClient.get('/results/user'); 
    return response.data; // Expecting an array of result objects
  } catch (error) {
    // It's good practice to log the full error for debugging
    console.error("API Error in getUserResults:", error.response?.data || error.message);
    throw error.response?.data?.message || 'Failed to fetch user results';
  }
};

// Optionally, get a specific result
export const getSingleResult = async (resultId) => {
    try {
        const response = await apiClient.get(`/results/${resultId}`);
        return response.data;
    } catch (error) {
        console.error("API Error in getSingleResult:", error.response?.data || error.message);
        throw error.response?.data?.message || 'Failed to fetch single result';
    }
};