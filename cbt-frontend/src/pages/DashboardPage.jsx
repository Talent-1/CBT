// cbt-frontend/src/pages/DashboardPage.jsx (CORRECTED)
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getStudentExams } from '../api/exams';
import { uploadProfilePicture } from '../api/users';

function DashboardPage() {
    const { user, loading, logout, setUser } = useAuth();
    const navigate = useNavigate();
    const [upcomingExams, setUpcomingExams] = useState([]);
    const [error, setError] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploadMessage, setUploadMessage] = useState('');
    const [examsLoading, setExamsLoading] = useState(true);
    const [overallPaymentStatusMessage, setOverallPaymentStatusMessage] = useState('');

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
        if (user && user.profilePictureUrl) {
            setImagePreview(user.profilePictureUrl);
        }
    }, [user, loading, navigate]);

    const fetchUpcomingExams = useCallback(async () => {
        if (!user || user.role !== 'student' || !user.classLevel || !user.branchId) {
            setUpcomingExams([]);
            setExamsLoading(false);
            setOverallPaymentStatusMessage('Your profile is incomplete. Please contact administration to update your class level or branch information.');
            return;
        }

        setExamsLoading(true);
        setError('');
        setOverallPaymentStatusMessage('');
        try {
            let department = undefined;
            // Ensure this logic matches the backend for what constitutes a "senior" class
            if (["SS1", "SS2", "SS3"].includes(user.classLevel)) {
                department = user.department; // Use user.department as per backend fix (areaOfSpecialization)
            }
            const fetchedExams = await getStudentExams(user.classLevel, user.branchId, department);
            setUpcomingExams(fetchedExams);

            // This now checks both payment eligibility and active status for the overall message
            const requiresPayment = fetchedExams.some(exam => !exam.isPaymentEligibleForExam);
            const hasInactiveExams = fetchedExams.some(exam => !exam.isActive); // Check if any exam is inactive

            if (requiresPayment) {
                setOverallPaymentStatusMessage('Payment Required: You need to settle your outstanding fees to access all exams.');
            } else if (hasInactiveExams) {
                 setOverallPaymentStatusMessage('Some exams are currently inactive. Please check with your administrator.');
            } else if (fetchedExams.length > 0) {
                setOverallPaymentStatusMessage('Cleared for Exams: All your payments are up-to-date and exams are active.');
            } else {
                setOverallPaymentStatusMessage('No exams found for your current eligibility.');
            }

        } catch (err) {
            console.error('Failed to fetch upcoming exams:', err);
            setError('Failed to load upcoming exams. Please try again later.');
            setUpcomingExams([]);
            setOverallPaymentStatusMessage('Could not retrieve payment eligibility/exam status. Please check your connection or contact support.');
        } finally {
            setExamsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchUpcomingExams();
        }
    }, [user, fetchUpcomingExams]);

    // Handles navigating to the Exam Instructions page
    const handleStartExam = (examId, isPaymentEligibleForExam, isActive) => { // ⭐ ADD isActive PARAMETER
        if (!isActive) { // ⭐ NEW CHECK
            setError('This exam is currently inactive and cannot be started. Please contact administration.');
            setUploadMessage('');
            return;
        }
        if (!isPaymentEligibleForExam) {
            setError('You must have a successful payment status to take this exam. Please make a payment or contact administration.');
            setUploadMessage('');
            return;
        }
        // Navigate to the ExamInstructions page first
        navigate(`/exam-instructions/${examId}`);
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            setUploadMessage('');
            setError('');
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setSelectedFile(null);
            setImagePreview(user?.profilePictureUrl || null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !user?._id) {
            setUploadMessage('Please select a file first or user not found.');
            setError('');
            return;
        }

        setUploadMessage('Uploading...');
        setError('');
        try {
            const formData = new FormData();
            formData.append('profilePicture', selectedFile);

            const response = await uploadProfilePicture(user._id, formData);

            setUser(prevUser => ({ ...prevUser, profilePictureUrl: response.profilePictureUrl }));
            setUploadMessage('Photo uploaded successfully!');
            setSelectedFile(null);
        } catch (err) {
            console.error('Photo upload failed:', err);
            const errorMessage = err.response && err.response.data && err.response.data.message
                                 ? err.response.data.message
                                 : 'Failed to upload photo. Please try again.';
            setError(errorMessage);
            setUploadMessage('');
            setImagePreview(user?.profilePictureUrl || null);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (loading) {
        return <p className="text-gray-400">Loading dashboard...</p>;
    }

    if (!user) {
        return <p className="text-red-400">Redirecting to login...</p>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-6 flex flex-col items-center justify-center font-inter">
            <style>
                {`
                .font-inter {
                    font-family: 'Inter', sans-serif;
                }
                .dashboard-container {
                    @apply w-full max-w-4xl bg-gray-800 rounded-xl shadow-lg p-8;
                }
                .dashboard-title {
                    @apply text-3xl font-bold text-center text-blue-400 mb-8;
                }
                .user-info {
                    @apply bg-gray-700 p-6 rounded-lg mb-8 shadow-md;
                }
                .user-info p {
                    @apply text-lg mb-2;
                }
                .user-info strong {
                    @apply text-blue-300;
                }
                .profile-picture-section {
                    @apply flex flex-col items-center mb-6;
                }
                .profile-picture-section h3 {
                    @apply text-2xl font-semibold mb-4 text-blue-300;
                }
                .profile-picture-preview {
                    @apply w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-md mb-4;
                }
                .profile-picture-placeholder {
                    @apply w-32 h-32 rounded-full bg-gray-600 flex items-center justify-center text-gray-400 text-lg mb-4;
                }
                .upload-label {
                    @apply cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300 ease-in-out mt-2;
                }
                .dashboard-button {
                    @apply bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg w-full transition duration-300 ease-in-out shadow-md mt-4;
                }
                .logout-button {
                    @apply bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg w-full transition duration-300 ease-in-out shadow-md mt-8;
                }
                .upload-message {
                    @apply text-green-400 text-sm mt-2 text-center;
                }
                .error-message {
                    @apply text-red-500 text-center font-medium mt-4;
                }
                .dashboard-section h2 {
                    @apply text-2xl font-semibold text-blue-300 mb-4 text-center;
                }
                .exam-card {
                    @apply bg-gray-700 p-4 rounded-lg mb-4 shadow-md;
                }
                .exam-card h3 {
                    @apply text-xl font-bold text-blue-200 mb-2;
                }
                .exam-card p {
                    @apply text-lg text-gray-300;
                }
                .start-exam-button {
                    @apply bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300 ease-in-out mt-4;
                }
                .start-exam-button:disabled {
                    @apply bg-gray-500 cursor-not-allowed;
                }
                /* ⭐ NEW: Style for inactive exam button */
                .start-exam-button.inactive {
                    @apply bg-red-700 hover:bg-red-800;
                }
                .payment-status-message {
                    @apply text-lg font-semibold text-center mt-4 mb-4 p-3 rounded-lg;
                }
                .payment-status-cleared {
                    @apply bg-green-800 text-green-200;
                }
                .payment-status-required {
                    @apply bg-red-800 text-red-200;
                }
                `}
            </style>

            <div className="dashboard-container">
                <h1 className="dashboard-title">Welcome, {user.fullName}!</h1>
                <div className="user-info">
                    <div className="profile-picture-section">
                        <h3>Profile Picture</h3>
                        {imagePreview ? (
                            <img src={imagePreview} alt="Profile Preview" className="profile-picture-preview" />
                        ) : (
                            <div className="profile-picture-placeholder">No Photo</div>
                        )}
                        <input
                            type="file"
                            id="profilePictureInput"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <label htmlFor="profilePictureInput" className="upload-label">
                            {selectedFile ? 'Change Selected File' : 'Select Photo'}
                        </label>
                        {selectedFile && (
                            <p className="mt-2 text-sm text-gray-400">Selected: {selectedFile.name}</p>
                        )}
                        <button onClick={handleUpload} disabled={!selectedFile} className="dashboard-button">
                            Upload Photo
                        </button>
                        {uploadMessage && <p className="upload-message">{uploadMessage}</p>}
                    </div>

                    <p><strong>Role:</strong> {user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
                    {user.role === 'student' && (
                        <>
                            <p><strong>Student ID:</strong> {user.studentId}</p>
                            <p><strong>Section:</strong> {user.section}</p>
                            <p><strong>Class Level:</strong> {user.classLevel}</p>
                            {user.email && <p><strong>Email:</strong> {user.email}</p>}
                        </>
                    )}
                    {user.role === 'teacher' && (
                        <>
                            <p><strong>Email:</strong> {user.email}</p>
                            <p><strong>Specialization:</strong> {user.areaOfSpecialization}</p>
                        </>
                    )}
                    {user.role === 'admin' && (
                        <p><strong>Email:</strong> {user.email}</p>
                    )}
                </div>

                {user.role === 'student' && (
                    <div className="dashboard-section mt-8">
                        <h2>Your Upcoming Exams</h2>

                        {overallPaymentStatusMessage && (
                            <p className={`payment-status-message ${overallPaymentStatusMessage.includes('Payment Required') || overallPaymentStatusMessage.includes('inactive') ? 'payment-status-required' : 'payment-status-cleared'}`}>
                                {overallPaymentStatusMessage}
                            </p>
                        )}

                        {examsLoading ? (
                            <p className="text-blue-400 text-center">Loading exams...</p>
                        ) : upcomingExams.length === 0 ? (
                            <p className="text-gray-400 text-center">No upcoming exams available for your class level/branch at the moment.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                                {upcomingExams.map(exam => (
                                    <div key={exam._id} className="exam-card">
                                        <h3>{exam.title}</h3>
                                        <p><strong>Subject:</strong> {exam.subject}</p>
                                        <p><strong>Class:</strong> {exam.classLevel}</p>
                                        <p><strong>Duration:</strong> {exam.duration} minutes</p>
                                        <p><strong>Total Questions:</strong> {exam.totalQuestions}</p>
                                        <p><strong>Status:</strong> <span className={exam.isActive ? 'text-green-400' : 'text-red-400'}>{exam.isActive ? 'Active' : 'Inactive'}</span></p> {/* Display exam status */}
                                        <button
                                            onClick={() => handleStartExam(exam._id, exam.isPaymentEligibleForExam, )} // ⭐ PASS isActive HERE
                                            className={`start-exam-button ${!exam.isPaymentEligibleForExam || !exam.isActive ? 'inactive' : ''}`} // ⭐ ADD INACTIVE CLASS
                                            disabled={!exam.isPaymentEligibleForExam } // ⭐ ADD !exam.isActive TO DISABLED
                                        >
                                            {exam.isActive ? ( // ⭐ CONDITIONAL BUTTON TEXT
                                                exam.isPaymentEligibleForExam ? 'Start Exam' : 'Payment Required'
                                            ) : (
                                                'Exam Inactive'
                                            )}
                                        </button>
                                        {!exam.isPaymentEligibleForExam && (
                                            <p className="text-red-400 text-sm mt-2">Settle fees to access this exam.</p>
                                        )}
                                       
                                    </div>
                                ))}
                            </div>
                        )}
                        <button onClick={() => navigate('/results')} className="dashboard-button">View My Results</button>
                        <button onClick={() => navigate('/payment')} className="dashboard-button">Make a Payment</button>
                    </div>
                )}

                {(user.role === 'teacher' || user.role === 'admin') && (
                    <div className="dashboard-section mt-8">
                        <h2>Admin/Teacher Tools</h2>
                        <button onClick={() => navigate('/admin')} className="dashboard-button">Go to Admin Dashboard</button>
                    </div>
                )}

                {error && <p className="error-message">{error}</p>}

                <button onClick={handleLogout} className="logout-button">Logout</button>
            </div>
        </div>
    );
}

export default DashboardPage;