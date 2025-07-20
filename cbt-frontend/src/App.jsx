// cbt-frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ExamPage from './pages/ExamPage'; // Renamed ExamPage to TakeExamPage for clarity
import ResultsPage from './pages/ResultsPage';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';
import PaymentPage from './pages/PaymentPage';
import InvoicePage from './pages/InvoicePage';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import Header from './components/Header';
import Footer from './components/Footer';
import { useAuth } from './hooks/useAuth';
import ExamInstructions from './pages/ExamInstructions';

import './App.css';

// PrivateRoute component to handle authentication and role-based access
const PrivateRoute = ({ allowedRoles }) => {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) {
        return <p>Loading user session...</p>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        if (user.role === 'admin' || user.role === 'branch_admin') {
            return <Navigate to="/admin" replace />;
        } else if (user.role === 'student' || user.role === 'teacher') {
            return <Navigate to="/dashboard" replace />;
        }
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return <p>Loading application...</p>;
    }

    return (
        <Router>
            <div className="app-container">
                <Header />
                <main className="main-content">
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route
                            path="/"
                            element={user ? (
                                (user.role === 'admin' || user.role === 'branch_admin') ? (
                                    <Navigate to="/admin" replace />
                                ) : (
                                    <Navigate to="/dashboard" replace />
                                )
                            ) : (
                                <Navigate to="/login" replace />
                            )}
                        />

                        {/* Protected Routes for Student/Teacher */}
                        <Route element={<PrivateRoute />}>
                            <Route path="/dashboard" element={<DashboardPage />} />
                            <Route path="/exam-instructions/:examId" element={<ExamInstructions />} />
                            <Route path="/exam/:examId" element={<ExamPage />} />
                            <Route path="/results" element={<ResultsPage />} />
                            <Route path="/payment" element={<PaymentPage />} />
                            <Route path="/invoice" element={<InvoicePage />} />
                        </Route>

                        {/* Protected Route for Admin and Branch Admin Dashboard */}
                        <Route element={<PrivateRoute allowedRoles={['admin', 'branch_admin']} />}>
                            <Route path="/admin" element={<AdminDashboard />} />
                        </Route>

                        {/* Public Routes */}
                        <Route path="/about" element={<AboutUs />} />
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