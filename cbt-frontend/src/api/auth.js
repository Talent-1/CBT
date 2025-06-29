// cbt-frontend/src/api/auth.js
import api from './apiClient';

export const registerUser = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'An unknown error occurred during registration.';
    throw new Error(errorMessage);
  }
};

// Now accepts a generic 'identifier'
export const loginUser = async (identifier, password) => {
  try {
    const response = await api.post('/auth/login', { identifier, password });

    // --- IMPORTANT ADDITION HERE ---
    // Assuming your backend sends a response like { token: '...', user: { _id: '...', role: 'admin', ... } }
    const { token, user } = response.data;

    if (token && user) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user)); // Store the user object as a JSON string
      console.log("Login successful! Token and user stored:", user); // For debugging
    } else {
      console.warn("Login response did not contain expected 'token' or 'user' data.", response.data);
      throw new Error('Login response incomplete. Please try again.');
    }
    // --- END IMPORTANT ADDITION ---

    return response.data; // Return the full response data if needed by the component
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'An unknown error occurred during login.';
    throw new Error(errorMessage);
  }
};

export const logoutUser = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // You might want to clear cookies if using HttpOnly cookies
  console.log("Logged out. Token and user removed from localStorage."); // For debugging
};