// cbt-frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage'; // This is your STUDENT dashboard
import ExamPage from './pages/ExamPage';
import ResultsPage from './pages/ResultsPage';
import AdminDashboard from './pages/AdminDashboard'; // This is your ADMIN/BRANCH_ADMIN dashboard
import NotFound from './pages/NotFound';
import PaymentPage from './pages/PaymentPage';
import InvoicePage from './pages/InvoicePage';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';

import Header from './components/Header';
import Footer from './components/Footer';
import { useAuth } from './hooks/useAuth';

import './App.css';

// PrivateRoute component to handle authentication and role-based access
const PrivateRoute = ({ allowedRoles }) => {
    const { isAuthenticated, user, loading } = useAuth();

    // --- IMPORTANT DEBUG LOGS ---
    console.log('PrivateRoute - Loading:', loading);
    console.log('PrivateRoute - isAuthenticated:', isAuthenticated);
    console.log('PrivateRoute - User in PrivateRoute:', user);
    console.log('PrivateRoute - Allowed Roles:', allowedRoles);
    if (user && allowedRoles) {
        console.log(`PrivateRoute - User Role: ${user.role}, Is in allowedRoles: ${allowedRoles.includes(user.role)}`);
    }
    // --- END DEBUG LOGS ---

    if (loading) {
        return <p>Loading user session...</p>; // Show a loading indicator while auth state is resolving
    }

    if (!isAuthenticated) {
        console.log('PrivateRoute - Not authenticated, navigating to /login');
        return <Navigate to="/login" replace />;
    }

    // If allowedRoles are specified, check if the user's role is permitted
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // If user is authenticated but not authorized for this specific route,
        // redirect them to their default dashboard based on their actual role.
        console.log(`PrivateRoute - Unauthorized role (${user.role}), navigating to default dashboard.`);
        if (user.role === 'admin' || user.role === 'branch_admin') {
            return <Navigate to="/admin" replace />;
        } else if (user.role === 'student' || user.role === 'teacher') {
            return <Navigate to="/dashboard" replace />;
        }
        // Fallback for any other unauthorized roles
        return <Navigate to="/login" replace />;
    }

    return <Outlet />; // Render child routes if authorized
};


function App() {
    const { user, loading } = useAuth(); // Get user state and loading from auth hook

    // --- IMPORTANT DEBUG LOGS ---
    console.log('App.jsx Render - User from useAuth:', user);
    console.log('App.jsx Render - Auth Loading state:', loading);
    // --- END DEBUG LOGS ---

    // Show a loading state for the entire app until auth is resolved
    if (loading) {
        return <p>Loading application...</p>; // Or a proper full-page loading spinner
    }


    
    return (
        <Router>
            <div className="app-container">
                <Header />
                <main className="main-content">
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />

                        {/* Root Route: This is the most crucial part for initial redirection */}
                        {/* It checks if a user is authenticated and, if so, directs them to the correct dashboard */}
                        <Route
                            path="/"
                            element={user ? ( // If user data is available (logged in)
                                (user.role === 'admin' || user.role === 'branch_admin') ? (
                                    // Admins and Branch Admins go to the AdminDashboard path
                                    <Navigate to="/admin" replace />
                                ) : (
                                    // Students and Teachers (or other roles) go to the general DashboardPage path
                                    <Navigate to="/dashboard" replace />
                                )
                            ) : (
                                // If no user data (not logged in), redirect to login
                                <Navigate to="/login" replace />
                            )}
                        />

                        {/* Protected Routes for Student/Teacher (General Dashboard) */}
                        {/* This PrivateRoute allows any authenticated user. Specific checks are done inside DashboardPage if needed */}
                        <Route element={<PrivateRoute />}>
                            <Route path="/dashboard" element={<DashboardPage />} />
                            <Route path="/exam/:examId" element={<ExamPage />} />
                            <Route path="/results" element={<ResultsPage />} />
                            <Route path="/payment" element={<PaymentPage />} />
                            <Route path="/invoice" element={<InvoicePage />} />
                        </Route>

                        {/* Protected Route for Admin and Branch Admin Dashboard */}
                        {/* THIS IS THE CRITICAL FIX: Ensure 'branch_admin' is included here */}
                        <Route element={<PrivateRoute allowedRoles={['admin', 'branch_admin']} />}>
                            <Route path="/admin" element={<AdminDashboard />} />
                        </Route>

                        {/* Public About Us Page */}
                        <Route path="/about" element={<AboutUs />} />

                        {/* Public Contact Us Page */}
                        <Route path="/contact" element={<ContactUs />} />

                        {/* Catch-all route for 404 Not Found */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </main>
                <Footer />
            </div>
        </Router>
    );
}

export default App;