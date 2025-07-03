import api from './apiClient';

// Delete a question by ID
export const deleteQuestion = async (questionId) => {
  try {
    const response = await api.delete(`/questions/${questionId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to delete question';
  }
};

// Update a question by ID
export const updateQuestion = async (questionId, updatedData) => {
  try {
    const response = await api.put(`/questions/${questionId}`, updatedData);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to update question';
  }
};
