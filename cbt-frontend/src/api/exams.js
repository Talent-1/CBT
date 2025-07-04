// cbt-frontend/src/api/exams.js
import apiClient from './apiClient';

// Get all available exams for the current user's branch/role
export const getExams = async () => {
  try {
    const response = await apiClient.get('/exams');
    return response.data; // Expecting an array of exam objects
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch exams';
  }
};

// Get questions for a specific exam
export const getExamQuestions = async (examId) => {
  try {
    const response = await apiClient.get(`/exams/${examId}/questions`);
    return response.data; // Expecting { exam: {...}, questions: [...] }
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch exam questions';
  }
};

// NEW: Get exams specific to a student's class level, branch, and department (for senior secondary)
export const getStudentExams = async (classLevel, branchId, department) => {
  try {
    // Send department param only if provided (for senior classes)
    const params = { classLevel, branchId };
    if (department) params.department = department;
    const response = await apiClient.get('/exams/student-exams', { params });
    return response.data; // Expecting an array of exam objects relevant to the student
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch student-specific exams';
  }
};

// Submit exam answers
export const submitExam = async (examId, answers) => {
  try {
    // answers should be an array like: [{ questionId: '...', selectedOption: 'A' }, ...]
    const response = await apiClient.post(`/exams/${examId}/submit`, { answers });
    return response.data; // Expecting { score: N, totalQuestions: M, resultId: '...' }
  } catch (error) {
    throw error.response?.data?.message || 'Failed to submit exam';
  }
};

// Delete an exam by ID
export const deleteExam = async (examId) => {
  try {
    const response = await apiClient.delete(`/exams/${examId}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw 'Exam not found or already deleted.';
    }
    throw error.response?.data?.message || 'Failed to delete exam';
  }
};

// Update an exam by ID
export const updateExam = async (examId, updatedData) => {
  try {
    const response = await apiClient.put(`/exams/${examId}`, updatedData);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to update exam';
  }
};