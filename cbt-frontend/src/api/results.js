// cbt-frontend/src/api/results.js
import apiClient from './apiClient';

export const getUserResults = async () => {
  try {
    const response = await apiClient.get('/results/my');
    return response.data;
  } catch (error) {
    console.error("API Error in getUserResults:", error.response?.data || error.message);
    throw error.response?.data?.message || 'Failed to fetch user results';
  }
};

export const getSingleResult = async (resultId) => {
    try {
        const response = await apiClient.get(`/results/${resultId}`);
        return response.data;
    } catch (error) {
        console.error("API Error in getSingleResult:", error.response?.data || error.message);
        throw error.response?.data?.message || 'Failed to fetch single result';
    }
};