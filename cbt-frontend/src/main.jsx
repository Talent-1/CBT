// src/index.js or src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './hooks/useAuth'; // Make sure AuthProvider wraps App
import './index.css'; // Your global styles
import '@fortawesome/fontawesome-free/css/all.min.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* AuthProvider must wrap App so useAuth is available everywhere */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);