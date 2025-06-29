// cbt-frontend/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // To indicate if initial load is complete

  // Load auth state from localStorage on initial render
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
        setLoading(false);
    }
  }, []);

  // Function to handle login (called from LoginPage)
  const login = useCallback((newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  // Function to handle logout (called from Header)
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  // Make authentication data and functions available to children
  const value = {
    user,
    token,
    isAuthenticated: !!token, // True if token exists
    loading,
    login,
    logout,
    setUser, // <--- ADD THIS LINE!
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to easily use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};