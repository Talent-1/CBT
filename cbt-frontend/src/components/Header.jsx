// cbt-frontend/src/components/Header.jsx
import React, { useState } from 'react'; // Import useState
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // We'll create this custom hook for auth context

// Assuming your logo is in the public folder, no import needed.
// If your logo is in src/assets/image_ee81aa.jpg, uncomment and use this:
// import schoolLogo from '../assets/image_ee81aa.jpg';

function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false); // State for mobile menu
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
        setIsMenuOpen(false); // Close menu on logout
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <header className="app-header">
            <div className="header-content">
                {/* School Name / Logo */}
                <Link to={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/'} className="logo-link">
                    {/* Assuming /school-logos.jpg is in your public folder */}
                    <img src="/school-logos.jpg" alt="School Logo" className="school-logo" />
                    {/* If using src/assets logo: <img src={schoolLogo} alt="School Logo" className="school-logo" /> */}
                    <h1>CITY GROUP OF SCHOOLS, OGIDI/UMUOJI</h1>
                </Link>

                {/* Hamburger Menu Button (Mobile) */}
                <div className="hamburger-menu-icon-container">
                    <button onClick={toggleMenu} className="hamburger-button">
                        <div className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></div>
                        <div className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></div>
                        <div className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></div>
                    </button>
                </div>

                {/* Navigation Links (Desktop & Mobile) */}
                {/* Conditionally apply 'mobile-menu-open' class based on isMenuOpen state */}
                <nav className={`main-nav ${isMenuOpen ? 'mobile-menu-open' : ''}`}>
                    {/* Regular Links for everyone */}
                    <Link to="/about" onClick={() => setIsMenuOpen(false)}>About</Link>
                    <Link to="/contact" onClick={() => setIsMenuOpen(false)}>Contact</Link>

                    {user ? (
                        <>
                            <span className="welcome-message">Welcome, {user.fullName || user.username}!</span>
                            {user.role === 'student' && (
                                <>
                                    <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
                                    <Link to="/results" onClick={() => setIsMenuOpen(false)}>My Results</Link>
                                    {/* Assuming Payment link is relevant for students */}
                                    <Link to="/payment" onClick={() => setIsMenuOpen(false)}>Make Payment</Link>
                                </>
                            )}
                            {(user.role === 'teacher' || user.role === 'admin' || user.role === 'branch_admin') && ( // Combine teacher and admin roles for admin tools
                                <Link to="/admin" onClick={() => setIsMenuOpen(false)}>Admin Tools</Link>
                            )}
                            <button onClick={handleLogout} className="logout-button">Logout</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="login-button" onClick={() => setIsMenuOpen(false)}>Login</Link>
                            <Link to="/register" className="register-button" onClick={() => setIsMenuOpen(false)}>Register</Link> {/* Added Register link */}
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}

export default Header;