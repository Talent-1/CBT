// src/components/Header.jsx (or similar file)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Assuming you're using react-router-dom for navigation
import '../App.css'; // Make sure you import your CSS

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false); // Example state for login status
    const [userName, setUserName] = useState(''); // Example state for user name

    // Example: Simulate login status from props or context
    useEffect(() => {
        // In a real app, you'd get this from authentication context or Redux store
        const userToken = localStorage.getItem('userToken'); // Check if a token exists
        const storedUserName = localStorage.getItem('userName'); // Get stored username
        if (userToken && storedUserName) {
            setIsLoggedIn(true);
            setUserName(storedUserName);
        } else {
            setIsLoggedIn(false);
            setUserName('');
        }
    }, []); // Run once on component mount

    const toggleMenu = () => {
        setIsMenuOpen(prevState => !prevState); // Toggles the state
    };

    const handleLogout = () => {
        // Implement your logout logic here (e.g., clear token, redirect)
        console.log("Logging out...");
        localStorage.removeItem('userToken'); // Clear token
        localStorage.removeItem('userName'); // Clear username
        setIsLoggedIn(false); // Update state
        setUserName(''); // Clear user name
        setIsMenuOpen(false); // Close menu on logout
        // Optionally redirect: navigate('/login');
    };

    // Close the menu when a link is clicked (optional, but good UX for mobile)
    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    return (
        <header className="app-header">
            <div className="header-content">
                <Link to="/" className="logo-link" onClick={closeMenu}>
                    <img src="/path/to/your/school_logo.png" alt="School Logo" className="school-logo" /> {/* IMPORTANT: Update path to your actual logo */}
                    <h1>CITY GROUP OF SCHOOLS, OGIDI/UMUOJI</h1> 
                </Link>

                {/* Hamburger Menu Icon - Visible on small screens */}
                <div className="hamburger-menu-icon-container">
                    <button className={`hamburger-button ${isMenuOpen ? 'open' : ''}`} onClick={toggleMenu}>
                        <span className="hamburger-line"></span>
                        <span className="hamburger-line"></span>
                        <span className="hamburger-line"></span>
                    </button>
                </div>

                {/* Main Navigation - Hidden on small screens by default, shown by JS */}
                <nav className={`main-nav ${isMenuOpen ? 'mobile-menu-open' : ''}`}>
                    <ul>
                        {isLoggedIn ? (
                            <>
                                <li className="welcome-message">Welcome, {userName || 'User'}</li>
                                <li><Link to="/dashboard" onClick={closeMenu}>Dashboard</Link></li>
                                <li><Link to="/settings" onClick={closeMenu}>Settings</Link></li>
                                <li><button onClick={handleLogout} className="logout-button">Logout</button></li>
                            </>
                        ) : (
                            <>
                                <li><Link to="/login" className="login-button" onClick={closeMenu}>Login</Link></li>
                                <li><Link to="/register" className="register-button" onClick={closeMenu}>Register</Link></li>
                            </>
                        )}
                    </ul>
                </nav>
            </div>
        </header>
    );
};

export default Header;