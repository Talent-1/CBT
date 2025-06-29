// cbt-frontend/src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../api/auth';
import { useAuth } from '../hooks/useAuth';

function LoginPage() {
  const [identifier, setIdentifier] = useState(''); // Can be email or studentId
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth(); // Destructure login function from useAuth

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors on new submission attempt

    try {
      // Pass identifier (email or studentId) and password
      const data = await loginUser(identifier, password);
      console.log('Login successful:', data);

      // Store token and user data in AuthContext (and local storage via useAuth)
      login(data.token, data.user);

      // --- THIS IS THE ONE AND ONLY NAVIGATION LINE NEEDED HERE AFTER SUCCESSFUL LOGIN ---
      // It navigates to the root path (/), which then triggers App.jsx's role-based redirection logic.
      navigate('/'); 

      // DO NOT put any other navigate() calls or if/else blocks for redirection here.
      // That logic belongs entirely in App.jsx's root route.

    } catch (err) {
      console.error("Login error caught in component:", err); // Log the full error for debugging

      let errorMessage = "An unknown error occurred during login. Please try again.";

      // Check if the error response has a specific message from the backend
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        // Fallback to the generic error message from the Error object (e.g., network error)
        errorMessage = err.message;
      }

      setError(errorMessage); // Set the state with the extracted string message
    }
  };

  return (
    <div>
      <h1>Student/Admin Login</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="identifier">Email or Student ID:</label>
          <input
            type="text"
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="error-message" style={{ color: 'red', marginTop: '10px' }}>Error: {error}</p>}
        <button type="submit">Login</button>
      </form>
      <p>Don't have an account? <Link to="/register">Register here</Link></p>
    </div>
  );
}

export default LoginPage;