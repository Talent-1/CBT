import api from './apiClient';

// Delete a question by ID (now uses /admin/questions/:id)
export const deleteQuestion = async (questionId) => {
  try {
    const response = await api.delete(`/admin/questions/${questionId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to delete question';
  }
};

// Update a question by ID (now uses /admin/questions/:id)
export const updateQuestion = async (questionId, updatedData) => {
  try {
    const response = await api.put(`/admin/questions/${questionId}`, updatedData);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to update question';
  }
};
