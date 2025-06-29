// cbt-frontend/src/components/Header.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // We'll create this custom hook for auth context

function Header() {
  const { user, logout } = useAuth(); // Get user and logout from our auth hook
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); 
    navigate('/login');
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <Link to={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/'} className="logo-link">
          <img src="/school-logos.jpg" alt="School Logo" className="school-logo" />
          <h1>CITY GROUP OF SCHOOLS, OGIDI/UMUOJI</h1>
        </Link>
        <nav className="main-nav">
          {user ? (
            <>
              <span className="welcome-message">Welcome, {user.fullName || user.username}!</span>
              {user.role === 'student' && (
                <>
                  <Link to="/dashboard">Dashboard</Link>
                  <Link to="/results">My Results</Link>
                </>
              )}
              {user.role === 'teacher' && (
                <>
                   <Link to="/dashboard">Dashboard</Link> {/* Teachers might have a simpler dashboard initially */}
                   <Link to="/admin">Admin Tools</Link> {/* If teachers use admin section too */}
                </>
              )}
              {user.role === 'admin' && (
                <Link to="/admin">Admin Dashboard</Link>
              )}
              <button onClick={handleLogout} className="logout-button">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;