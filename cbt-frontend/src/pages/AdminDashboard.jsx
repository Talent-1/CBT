// cbt-frontend/src/pages/AdminDashboard.jsx (Updated Code)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
// REMOVED: import { useReactToPrint } from 'react-to-print'; // No longer needed

import {
    addQuestion,
    getBranches,
    getAllUsers,
    addExam,
    getAllQuestions,
    getAllSubjects
} from '../api/admin';
import { getExams } from '../api/exams';
import api from '../api/api'; // Your Axios instance
import { SCHOOL_BANK_DETAILS } from '../utils/paymentUtils';

import '/src/style/AdminDashboard.css'; // Make sure this CSS file is correctly linked and updated

// Added Primary levels as discussed
const CLASS_LEVELS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'];

// NEW: Departments for senior secondary class levels
const DEPARTMENTS = ['Sciences', 'Arts', 'Commercial'];

// Helper function to check if a class level is for senior secondary students
const isSeniorSecondaryClass = (classLevel) => {
    return ['SS1', 'SS2', 'SS3'].includes(classLevel);
};

const groupSubjectsByClassLevel = (subjects) => {
    return subjects.reduce((acc, subject) => {
        const { classLevel } = subject;
        if (!acc[classLevel]) {
            acc[classLevel] = [];
        }
        acc[classLevel].push(subject);
        return acc;
    }, {});
};

// Helper to get unique sections for a given class level from a list of users
const getUniqueSectionsForClassLevel = (users, classLevel) => {
    const sections = new Set();
    users.forEach(user => {
        if (user.classLevel === classLevel && user.section) {
            // Filter out 'senior' and 'N/A (Invalid Section Data)' from the sections for the dropdown
            const sectionValue = String(user.section).toLowerCase();
            if (sectionValue !== 'senior' && sectionValue !== 'n/a (invalid section data)' && sectionValue !== '') {
                sections.add(user.section);
            }
        }
    });
    return Array.from(sections).sort(); // Return sorted unique sections
};

// Helper to get unique departments (areaOfSpecialization) for a given class level from users
const getUniqueDepartmentsForClassLevel = (users, classLevel) => {
    const departments = new Set();
    users.forEach(user => {
        // Only consider students with the specified classLevel and a role of 'student'
        // and ensure it's a senior secondary class where specialization applies
        if (user.classLevel === classLevel && user.role === 'student' && user.areaOfSpecialization) {
            departments.add(user.areaOfSpecialization);
        }
    });
    return Array.from(departments).sort(); // Return sorted unique departments
};


function AdminDashboard() {
    const navigate = useNavigate();
    const { user: authUser, loading: authLoading, logout } = useAuth();

    const [branches, setBranches] = useState([]);
    const [exams, setExams] = useState([]);
    const [allResults, setAllResults] = useState([]); // This state will now hold the transformed results
    const [allUsers, setAllUsers] = useState([]); // Keep all users to derive sections and departments
    const [allQuestions, setAllQuestions] = useState([]);

    const [newQuestion, setNewQuestion] = useState({
        questionText: '', optionA: '', optionB: '', optionC: '', optionD: '', correctOption: '',
        subject: '', classLevel: '',
    });

    const [newExam, setNewExam] = useState({
        title: '', classLevel: '', duration: '', branchId: '', areaOfSpecialization: '' // NEW: Add areaOfSpecialization
    });
    const [selectedSubjectsForExam, setSelectedSubjectsForExam] = useState({});
    const [availableSubjectsGrouped, setAvailableSubjectsGrouped] = useState({});

    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [error, setError] = useState('');
    const [dataLoading, setDataLoading] = useState(true);

    // --- NEWLY ADDED STATE VARIABLES FOR RESULTS FILTERING ---
    const [selectedResultsClassLevel, setSelectedResultsClassLevel] = useState('');
    const [selectedResultsSubClassLevel, setSelectedResultsSubClassLevel] = useState('');
    const [selectedResultsDepartment, setSelectedResultsDepartment] = useState('');
    const [availableResultsSubClassLevels, setAvailableResultsSubClassLevels] = useState([]); // Sections available for results filter
    const [availableResultsDepartments, setAvailableResultsDepartments] = useState([]); // Departments available for results filter
    // --- END NEWLY ADDED STATE VARIABLES ---

    // --- PAYMENT SEARCH AND STATEMENT STATES ---
    const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
    const [selectedPaymentSearchClassLevel, setSelectedPaymentSearchClassLevel] = useState('');
    const [selectedPaymentSearchSubClassLevel, setSelectedPaymentSearchSubClassLevel] = useState('');
    const [availablePaymentSearchSubClassLevels, setAvailablePaymentSearchSubClassLevels] = useState([]); // Sections available for payment search
    const [foundPayment, setFoundPayment] = useState(null); // Stores the single payment object from search (if search by ID/Ref)
    const [filteredPayments, setFilteredPayments] = useState([]); // Stores multiple payments if filtered by class/section
    const [paymentSearchLoading, setPaymentSearchLoading] = useState(false);
    const [paymentSearchError, setPaymentSearchError] = useState('');
    const [updatePaymentLoading, setUpdatePaymentLoading] = useState(false);
    const [updatePaymentError, setUpdatePaymentError] = useState('');
    const [updatePaymentFeedback, setUpdatePaymentFeedback] = useState('');

    const receiptRef = useRef(); // For single payment receipt
    const statementRef = useRef(); // For payment statement

    // NEW: Custom handle print functions using window.print()
    const handlePrintSingleReceipt = useCallback(() => {
        if (receiptRef.current) {
            // Add class to body to hide non-printable elements
            document.body.classList.add('printing-active');
            // Show the specific content to print
            receiptRef.current.classList.add('show-for-print');

            window.print();

            // Revert changes after printing (with a slight delay for print dialog)
            setTimeout(() => {
                receiptRef.current.classList.remove('show-for-print');
                document.body.classList.remove('printing-active');
                // Optionally clear foundPayment after printing to reset the view
                // setFoundPayment(null); 
            }, 500);
        }
    }, []); // No dependencies that change often, so useCallback is fine.

    const handlePrintStatement = useCallback(() => {
        if (statementRef.current) {
            // Add class to body to hide non-printable elements
            document.body.classList.add('printing-active');
            // Show the specific content to print
            statementRef.current.classList.add('show-for-print');

            window.print();

            // Revert changes after printing (with a slight delay for print dialog)
            setTimeout(() => {
                statementRef.current.classList.remove('show-for-print');
                document.body.classList.remove('printing-active');
            }, 500);
        }
    }, []); // No dependencies that change often, so useCallback is fine.


    // --- END NEW STATES ---


    // Helper function to safely render properties that might be objects with { _id, name }
    // This is crucial for handling populated fields that might come back as objects
    const renderSafeString = (value) => {
        // FIX: Use Object.prototype.hasOwnProperty.call for safer property checks
        if (typeof value === 'object' && value !== null && (Object.prototype.hasOwnProperty.call(value, '_id') || Object.prototype.hasOwnProperty.call(value, 'name'))) {
            return value.name || 'N/A'; // If it's an object with _id or name, try to render its name property.
        }
        return value || 'N/A'; // Otherwise, render as is, or fallback to 'N/A' if null/undefined/empty string
    };

    // New helper to specifically handle section display (e.g., replace 'senior' with something else)
    const renderSectionDisplay = (value) => {
        const safeValue = renderSafeString(value);
        if (typeof safeValue === 'string' && safeValue.toLowerCase() === 'senior') {
            return 'N/A (Invalid Section Data)';
        }
        return safeValue;
    };


    const fetchData = useCallback(async () => {
        setDataLoading(true);
        setError('');
        try {
            console.log('AdminDashboard: API Call: Fetching branches...');
            const fetchedBranches = await getBranches();
            setBranches(fetchedBranches);

            console.log('AdminDashboard: API Call: Fetching exams...');
            const fetchedExams = await getExams();
            setExams(fetchedExams);

            console.log('AdminDashboard: API Call: Fetching all users...');
            const fetchedUsers = await getAllUsers();
            setAllUsers(fetchedUsers); // Set all users for deriving class/section/department filters

            // Dynamically build filter query for results based on selected dropdowns
            const resultsFilterParams = new URLSearchParams();
            if (selectedResultsClassLevel) {
                resultsFilterParams.append('classLevel', selectedResultsClassLevel);
            }
            if (selectedResultsSubClassLevel) {
                resultsFilterParams.append('section', selectedResultsSubClassLevel);
            }
            // NEW: Add department filter if selected and class is senior secondary
            if (isSeniorSecondaryClass(selectedResultsClassLevel) && selectedResultsDepartment) {
                resultsFilterParams.append('areaOfSpecialization', selectedResultsDepartment);
            }

            const filterQueryString = resultsFilterParams.toString();
            const resultsEndpoint = `/results${filterQueryString ? `?${filterQueryString}` : ''}`;
            console.log(`AdminDashboard: API Call: Fetching all results with endpoint: ${resultsEndpoint}`);

            // Directly use api.get here for results
            const fetchedResults = await api.get(resultsEndpoint);
            setAllResults(fetchedResults.data); // Store the already transformed results

            console.log('AdminDashboard: API Call: Fetching all questions...');
            const fetchedQuestions = await getAllQuestions();
            setAllQuestions(fetchedQuestions);

            console.log('AdminDashboard: API Call: Fetching all subjects...');
            const fetchedSubjects = await getAllSubjects();
            setAvailableSubjectsGrouped(groupSubjectsByClassLevel(fetchedSubjects));

        } catch (err) {
            let errorMessage = 'Failed to load admin data.';
            if (err.message === 'Network Error') {
                errorMessage = 'Could not connect to the backend server. Please ensure the backend is running.';
            } else if (err.response && err.response.data && err.response.data.message) {
                errorMessage = err.response.data.message;
            } else {
                errorMessage = err.message || errorMessage;
            }
            setError(errorMessage);
            console.error("Admin dashboard data fetch error:", err);
        } finally {
            setDataLoading(false);
        }
    }, [selectedResultsClassLevel, selectedResultsSubClassLevel, selectedResultsDepartment]); // Re-fetch when filters change

    useEffect(() => {
        if (authLoading) {
            console.log('AdminDashboard: Auth still loading, waiting...');
            return;
        }

        if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'branch_admin')) {
            console.log(`AdminDashboard: Access Denied for user role: ${authUser ? authUser.role : 'null'}. Redirecting.`);
            setError('Access Denied. You must be an administrator or branch administrator to view this page.');
            setTimeout(() => navigate('/login'), 2000);
            return;
        }

        console.log('AdminDashboard: User authorized. Starting data fetch.');
        fetchData();
    }, [authUser, authLoading, navigate, fetchData]);


    // Effect to update available sub-class levels and departments when a main class level is selected for results filtering
    useEffect(() => {
        if (selectedResultsClassLevel && allUsers.length > 0) {
            const sections = getUniqueSectionsForClassLevel(allUsers, selectedResultsClassLevel);
            setAvailableResultsSubClassLevels(sections);
            setSelectedResultsSubClassLevel('');

            if (isSeniorSecondaryClass(selectedResultsClassLevel)) {
                const departments = getUniqueDepartmentsForClassLevel(allUsers, selectedResultsClassLevel);
                setAvailableResultsDepartments(departments);
                setSelectedResultsDepartment('');
            } else {
                setAvailableResultsDepartments([]);
                setSelectedResultsDepartment('');
            }
        } else {
            setAvailableResultsSubClassLevels([]);
            setSelectedResultsSubClassLevel('');
            setAvailableResultsDepartments([]);
            setSelectedResultsDepartment('');
        }
    }, [selectedResultsClassLevel, allUsers]);

    // NEW: Effect to update available sub-class levels for PAYMENT SEARCH when a main class level is selected
    useEffect(() => {
        if (selectedPaymentSearchClassLevel && allUsers.length > 0) {
            const sections = getUniqueSectionsForClassLevel(allUsers, selectedPaymentSearchClassLevel);
            setAvailablePaymentSearchSubClassLevels(sections);
            setSelectedPaymentSearchSubClassLevel(''); // Reset sub-class level when class level changes
        } else {
            setAvailablePaymentSearchSubClassLevels([]);
            setSelectedPaymentSearchSubClassLevel('');
        }
    }, [selectedPaymentSearchClassLevel, allUsers]);


    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleQuestionChange = (e) => {
        setNewQuestion({ ...newQuestion, [e.target.name]: e.target.value });
    };

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        setError('');
        setFeedbackMessage('');

        if (!authUser || authUser.role !== 'admin') {
            setError('Unauthorized: Only Super Administrators can add questions.');
            return;
        }

        if (!newQuestion.questionText || !newQuestion.correctOption ||
            !newQuestion.optionA || !newQuestion.optionB || !newQuestion.optionC || !newQuestion.optionD ||
            !newQuestion.subject || !newQuestion.classLevel) {
            setError('Please fill all required fields for the question (Text, Options, Correct Option, Subject, Class Level).');
            return;
        }

        const optionsArray = [
            { text: newQuestion.optionA }, { text: newQuestion.optionB },
            { text: newQuestion.optionC }, { text: newQuestion.optionD },
        ];

        const correctOptionMapping = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
        const correctOptionIndex = correctOptionMapping[newQuestion.correctOption.toUpperCase()];

        if (correctOptionIndex === undefined) {
            setError('Invalid correct option. Please use A, B, C, or D.');
            return;
        }

        const questionDataToSend = {
            questionText: newQuestion.questionText,
            options: optionsArray,
            correctOptionIndex: correctOptionIndex,
            subject: newQuestion.subject,
            classLevel: newQuestion.classLevel,
        };

        try {
            console.log('API Call: Adding new question to bank...', questionDataToSend);
            await addQuestion(questionDataToSend);
            setFeedbackMessage('Question added successfully!');
            setNewQuestion({
                questionText: '', optionA: '', optionB: '', optionC: '', optionD: '', correctOption: '',
                subject: '', classLevel: ''
            });
            await fetchData();
        } catch (err) {
            console.error("Add question error:", err);
            setError(err.response?.data?.message || err.message || 'Failed to add question.');
        }
    };

    const handleExamChange = (e) => {
        const { name, value } = e.target;
        setNewExam(prev => ({ ...prev, [name]: value }));

        if (name === 'classLevel') {
            setSelectedSubjectsForExam({});
            // Reset areaOfSpecialization when classLevel changes, especially if it's no longer senior
            if (!isSeniorSecondaryClass(value)) {
                setNewExam(prev => ({ ...prev, areaOfSpecialization: '' }));
            }
        }
    };

    const handleSubjectSelectionForExam = (subjectId, isChecked) => {
        setSelectedSubjectsForExam(prev => {
            const newState = { ...prev };
            if (isChecked) {
                newState[subjectId] = { isSelected: true, numQuestions: 0 };
            } else {
                delete newState[subjectId];
            }
            return newState;
        });
    };

    const handleNumQuestionsForSubject = (subjectId, value) => {
        setSelectedSubjectsForExam(prev => ({
            ...prev,
            [subjectId]: { ...prev[subjectId], numQuestions: parseInt(value, 10) || 0 }
        }));
    };

    const handleAddExam = async (e) => {
        e.preventDefault();
        setError('');
        setFeedbackMessage('');

        if (!authUser || authUser.role !== 'admin') {
            setError('Unauthorized: Only Super Administrators can add exams.');
            return;
        }

        if (!newExam.title || !newExam.classLevel || !newExam.duration || !newExam.branchId) {
            setError('Please fill all required fields for the exam (Title, Class Level, Duration, Branch).');
            return;
        }

        // NEW: If senior secondary class, ensure department is selected
        if (isSeniorSecondaryClass(newExam.classLevel) && !newExam.areaOfSpecialization) {
            setError('For Senior Secondary class levels, please select a Department for the exam.');
            return;
        }

        const selectedSubjectsArray = Object.entries(selectedSubjectsForExam)
            .filter(([, data]) => data.isSelected)
            .map(([subjectId, data]) => {
                const subject = availableSubjectsGrouped[newExam.classLevel]?.find(s => s._id === subjectId);
                return {
                    subjectId: subjectId,
                    subjectName: subject ? subject.name : 'Unknown Subject',
                    numberOfQuestions: data.numQuestions,
                };
            });

        if (selectedSubjectsArray.length === 0) {
            setError('Please select at least one subject for the exam.');
            return;
        }

        try {
            const examDataToSend = {
                title: newExam.title,
                classLevel: newExam.classLevel,
                duration: parseInt(newExam.duration),
                branchId: newExam.branchId,
                createdBy: authUser._id,
                subjectsIncluded: selectedSubjectsArray,
                // NEW: Include areaOfSpecialization if applicable
                areaOfSpecialization: isSeniorSecondaryClass(newExam.classLevel) ? newExam.areaOfSpecialization : null,
            };
            console.log('API Call: Adding new Unit Exam...', examDataToSend);
            await addExam(examDataToSend);
            setFeedbackMessage('Unit Exam added successfully!');
            setNewExam({
                title: '', classLevel: '', duration: '', branchId: '', areaOfSpecialization: '' // Reset
            });
            setSelectedSubjectsForExam({});
            await fetchData();
        } catch (err) {
            console.error("Add exam error:", err.response ? err.response.data : err.message, err);
            setError(err.response?.data?.message || err.message || 'Failed to add exam. Check console for details.');
        }
    };

    // NEW: Generic function to update payment status
    const updatePaymentStatus = async (paymentId, newStatus) => {
        setUpdatePaymentLoading(true);
        setUpdatePaymentError('');
        setUpdatePaymentFeedback('');

        try {
            const response = await api.put(`/payments/${paymentId}/status`, {
                status: newStatus,
                adminNotes: `Payment confirmed by ${authUser.role} (${authUser.fullName})` // Customize notes if needed
            });

            const updatedPayment = response.data.payment;

            // Update the single 'foundPayment' state if it was the one updated
            if (foundPayment && foundPayment._id === updatedPayment._id) {
                setFoundPayment(updatedPayment);
            }

            // Update the 'filteredPayments' list
            setFilteredPayments(prev => prev.map(p =>
                p._id === updatedPayment._id ? updatedPayment : p
            ));

            if (newStatus === 'successful') {
                setUpdatePaymentFeedback('Payment status updated to SUCCESSFUL! Preparing receipt...');
                // Set foundPayment for the receipt (temporary for printing)
                setFoundPayment(updatedPayment);
                setTimeout(() => {
                    handlePrintSingleReceipt(); // Trigger print for this updated payment 
                }, 100); // Small delay to ensure state update propagates
            } else {
                setUpdatePaymentFeedback(`Payment status updated to ${newStatus.toUpperCase()}.`);
            }
            await fetchData(); // Optional: Re-fetch all data to ensure consistency across the dashboard
        } catch (err) {
            console.error('Update payment status error:', err.response?.data || err.message);
            setUpdatePaymentError(err.response?.data?.message || `Failed to update payment status to ${newStatus}.`);
        } finally {
            setUpdatePaymentLoading(false);
        }
    };

    // NEW: handlePaymentSearch logic to support class/sub-class level filtering
    const handlePaymentSearch = async (e) => {
        e.preventDefault();
        setPaymentSearchLoading(true);
        setPaymentSearchError('');
        setFoundPayment(null); // Clear single payment view
        setFilteredPayments([]); // Clear multi-payment view
        setUpdatePaymentFeedback('');

        const isTermSearch = paymentSearchTerm.trim() !== '';
        const isFilterSearch = selectedPaymentSearchClassLevel !== '' || selectedPaymentSearchSubClassLevel !== '';

        if (!isTermSearch && !isFilterSearch) {
            setPaymentSearchError('Please enter a Student ID/Payment Code OR select a Class Level/Section to search.');
            setPaymentSearchLoading(false);
            return;
        }

        try {
            let paymentsToSet = [];
            // If a specific term is entered, prioritize term search for a single payment
            if (isTermSearch && !isFilterSearch) { 
                console.log(`Searching for single payment with term: ${paymentSearchTerm}`);
                const response = await api.get(`/payments/search?term=${paymentSearchTerm}`);
                setFoundPayment(response.data.payment); // Set the single found payment
                paymentsToSet = response.data.payment ? [response.data.payment] : []; // For filteredPayments state
                
                if (response.data.payment && response.data.payment.status !== 'pending') {
                    setUpdatePaymentFeedback(`Note: This payment is already ${response.data.payment.status}.`);
                }
            } else if (isFilterSearch) { // Handle class/section filtering for multiple payments
                const filterParams = new URLSearchParams();
                if (selectedPaymentSearchClassLevel) {
                    filterParams.append('classLevel', selectedPaymentSearchClassLevel);
                }
                if (selectedPaymentSearchSubClassLevel) {
                    filterParams.append('section', selectedPaymentSearchSubClassLevel);
                }
                const filterQueryString = filterParams.toString();
                const endpoint = `/payments${filterQueryString ? `?${filterQueryString}` : ''}`;
                console.log(`Searching for payments with filters: ${endpoint}`);
                const response = await api.get(endpoint);
                paymentsToSet = response.data; // Assuming this returns an array of payments
                setFoundPayment(null); // Ensure single payment view is cleared
            } else { 
                // This case handles when both term and filters are used,
                // or if specific logic is desired for that combination.
                // For now, we'll suggest separate searches.
                setPaymentSearchError('Please use either a specific search term (Student ID/Payment Code) or class/section filters, not both at once. Or perform two separate searches.');
                setPaymentSearchLoading(false);
                return;
            }

            setFilteredPayments(paymentsToSet);
            setPaymentSearchError('');
            if (paymentsToSet.length === 0) {
                setPaymentSearchError('No payments found for the selected criteria.');
            }

        } catch (err) {
            console.error('Payment search error:', err.response?.data || err.message);
            setPaymentSearchError(err.response?.data?.message || 'Failed to find payments. Check console for details.');
            setFoundPayment(null);
            setFilteredPayments([]);
        } finally {
            setPaymentSearchLoading(false);
        }
    };


    // OLD handleUpdatePaymentToSuccessful - now delegates to the generic one
    const handleUpdatePaymentToSuccessful = () => {
        if (!foundPayment || foundPayment.status !== 'pending') {
            setUpdatePaymentError('Only pending payments can be marked as successful (from single search view).');
            return;
        }
        updatePaymentStatus(foundPayment._id, 'successful');
    };


    // Render loading states first
    if (authLoading || dataLoading) {
        return (
            <div className="container">
                <h1 className="header">Admin Dashboard</h1>
                <p className="loadingMessage">Loading admin dashboard data... Please wait.</p>
                {error && <p className="errorMessage">{error}</p>}
            </div>
        );
    }

    if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'branch_admin')) {
        return <p className="errorMessage">Access Denied. You must be an administrator or branch administrator to view this page. <Link to="/login">Login</Link></p>;
    }

    return (
        <div className="container">
            <h1 className="header">Admin Dashboard</h1>
            <button onClick={handleLogout} className="logoutButton">Logout</button>

            {error && <p className="errorMessage">{error}</p>}
            {feedbackMessage && <p className="successMessage">{feedbackMessage}</p>}

            {authUser.role === 'admin' && (
                <>
                    <section className="section">
                        <h2 className="sectionHeader">Add New Unit Exam</h2>
                        <form onSubmit={handleAddExam} className="form">
                            <div className="formGroup">
                                <label htmlFor="examTitle" className="label">Exam Title:</label>
                                <input type="text" id="examTitle" name="title" value={newExam.title} onChange={handleExamChange} required className="input" />
                            </div>
                            <div className="formGroup">
                                <label htmlFor="examClassLevel" className="label">Target Class Level:</label>
                                <select id="examClassLevel" name="classLevel" value={newExam.classLevel} onChange={handleExamChange} required className="select">
                                    <option value="">Select Class Level</option>
                                    {CLASS_LEVELS.map(level => (<option key={level} value={level}>{level}</option>))}
                                </select>
                            </div>

                            {/* Department selection for senior secondary exams */}
                            {newExam.classLevel && isSeniorSecondaryClass(newExam.classLevel) && (
                                <div className="formGroup">
                                    <label htmlFor="examDepartment" className="label">Department:</label>
                                    <select
                                        id="examDepartment"
                                        name="areaOfSpecialization" // Match backend field name
                                        value={newExam.areaOfSpecialization}
                                        onChange={handleExamChange}
                                        required // Make required for senior secondary classes
                                        className="select"
                                    >
                                        <option value="">Select Department</option>
                                        {DEPARTMENTS.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {newExam.classLevel && availableSubjectsGrouped[newExam.classLevel] && (
                                <div className="formGroup">
                                    <h3 className="subHeader">Select Subjects for this Exam:</h3>
                                    <div className="subjectGrid">
                                        {availableSubjectsGrouped[newExam.classLevel].map(subject => (
                                            <div key={subject._id} className="subjectItem">
                                                <input type="checkbox" id={`subject-${subject._id}`} checked={!!selectedSubjectsForExam[subject._id]?.isSelected} onChange={(e) => handleSubjectSelectionForExam(subject._id, e.target.checked)} className="checkbox" />
                                                <label htmlFor={`subject-${subject._id}`} className="checkboxLabel">{subject.name}</label>
                                                {selectedSubjectsForExam[subject._id]?.isSelected && (
                                                    <input type="number" placeholder="Num Qs" value={selectedSubjectsForExam[subject._id]?.numQuestions || ''} onChange={(e) => handleNumQuestionsForSubject(subject._id, e.target.value)} min="0" className="numQuestionsInput" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="formGroup">
                                <label htmlFor="duration" className="label">Common Duration (Minutes):</label>
                                <input type="number" id="duration" name="duration" value={newExam.duration} onChange={handleExamChange} required className="input" min="1" />
                            </div>
                            <div className="formGroup">
                                <label htmlFor="examBranch" className="label">Branch:</label>
                                <select id="examBranch" name="branchId" value={newExam.branchId} onChange={handleExamChange} required className="select" disabled={branches.length === 0}>
                                    <option value="">{dataLoading ? 'Loading Branches...' : 'Select Branch'}</option>
                                    {branches.map(branch => (<option key={branch._id} value={branch._id}>{branch.name}</option>))}
                                </select>
                            </div>
                            <button type="submit" className="submitButton">Create Unit Exam</button>
                        </form>
                    </section>

                    <section className="section">
                        <h2 className="sectionHeader">Add New Question to Bank</h2>
                        <form onSubmit={handleAddQuestion} className="form">
                            <div className="formGroup">
                                <label htmlFor="questionClassLevel" className="label">Class Level:</label>
                                <select id="questionClassLevel" name="classLevel" value={newQuestion.classLevel} onChange={handleQuestionChange} required className="select">
                                    <option value="">Select Class Level</option>
                                    {CLASS_LEVELS.map(level => (<option key={level} value={level}>{level}</option>))}
                                </select>
                            </div>

                            {/* Question Details */}
                            <div className="formGroup">
                                <label htmlFor="questionSubject" className="label">Subject:</label>
                                <select id="questionSubject" name="subject" value={newQuestion.subject} onChange={handleQuestionChange} required className="select" disabled={!newQuestion.classLevel || !availableSubjectsGrouped[newQuestion.classLevel]?.length}>
                                    <option value="">{newQuestion.classLevel ? 'Select Subject' : 'Select Class Level First'}</option>
                                    {newQuestion.classLevel && availableSubjectsGrouped[newQuestion.classLevel]?.map(subject => (
                                        <option key={subject._id} value={subject._id}>{subject.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="formGroup">
                                <label htmlFor="questionText" className="label">Question Text:</label>
                                <textarea id="questionText" name="questionText" value={newQuestion.questionText} onChange={handleQuestionChange} required className="textarea"></textarea>
                            </div>
                            <div className="formGroup">
                                <label className="label">Options:</label>
                                <input type="text" name="optionA" value={newQuestion.optionA} onChange={handleQuestionChange} placeholder="Option A" required className="input" />
                                <input type="text" name="optionB" value={newQuestion.optionB} onChange={handleQuestionChange} placeholder="Option B" required className="input" />
                                <input type="text" name="optionC" value={newQuestion.optionC} onChange={handleQuestionChange} placeholder="Option C" required className="input" />
                                <input type="text" name="optionD" value={newQuestion.optionD} onChange={handleQuestionChange} placeholder="Option D" required className="input" />
                            </div>
                            <div className="formGroup">
                                <label htmlFor="correctOption" className="label">Correct Option (A, B, C, or D):</label>
                                <input type="text" id="correctOption" name="correctOption" value={newQuestion.correctOption} onChange={handleQuestionChange} maxLength="1" required className="input" />
                            </div>
                            <button type="submit" className="submitButton">Add Question</button>
                        </form>
                    </section>
                </>
            )}

            {/* Payment Search & Update Section (Accessible to Admin & Branch Admin) */}
            <section className="section">
                <h2 className="sectionHeader">Payment Management</h2>
                <p className="sectionDescription">Search by Student ID / Payment Code OR filter by Class Level and Section.</p>
                <form onSubmit={handlePaymentSearch} className="form paymentSearchForm">
                    <div className="formGroup">
                        <label htmlFor="paymentSearchTerm" className="label">Student ID or Payment Code:</label>
                        <input
                            type="text"
                            id="paymentSearchTerm"
                            value={paymentSearchTerm}
                            onChange={(e) => setPaymentSearchTerm(e.target.value)}
                            placeholder="e.g., CGS/AD/25/002 or PAY_CG..."
                            className="input"
                        />
                    </div>
                    <div className="formGroup">
                        <label htmlFor="paymentSearchClassLevel" className="label">Filter by Class Level:</label>
                        <select
                            id="paymentSearchClassLevel"
                            value={selectedPaymentSearchClassLevel}
                            onChange={(e) => setSelectedPaymentSearchClassLevel(e.target.value)}
                            className="select"
                        >
                            <option value="">All Class Levels</option>
                            {CLASS_LEVELS.map(level => (<option key={level} value={level}>{level}</option>))}
                        </select>
                    </div>
                    <div className="formGroup">
                        <label htmlFor="paymentSearchSubClassLevel" className="label">Filter by Section:</label>
                        <select
                            id="paymentSearchSubClassLevel"
                            value={selectedPaymentSearchSubClassLevel}
                            onChange={(e) => setSelectedPaymentSearchSubClassLevel(e.target.value)}
                            className="select"
                            disabled={!selectedPaymentSearchClassLevel || availablePaymentSearchSubClassLevels.length === 0}
                        >
                            <option value="">All Sections</option>
                            {availablePaymentSearchSubClassLevels.map(section => (
                                <option key={section} value={section}>{section}</option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" className="submitButton" disabled={paymentSearchLoading}>
                        {paymentSearchLoading ? 'Searching...' : 'Search Payments'}
                    </button>
                </form>

                {paymentSearchError && <p className="errorMessage">{paymentSearchError}</p>}
                {updatePaymentError && <p className="errorMessage">{updatePaymentError}</p>}
                {updatePaymentFeedback && <p className="successMessage">{updatePaymentFeedback}</p>}

                {/* Display Single Payment Result (from term search) */}
                {foundPayment && !filteredPayments.length && ( // Show single payment if found and no broader filter results
                    <div className="paymentDetailsCard">
                        <h3>Payment Details</h3>
                        <p><strong>Transaction Ref:</strong> {foundPayment.transactionRef}</p>
                        <p><strong>Status:</strong> {foundPayment.status.toUpperCase()}</p>
                        <p><strong>Amount:</strong> NGN {foundPayment.amount.toLocaleString()}</p>
                        <p><strong>Description:</strong> {foundPayment.description}</p>
                        <p><strong>Payment Date:</strong> {new Date(foundPayment.paymentDate).toLocaleDateString()}</p>
                        <p><strong>Payment Method:</strong> {foundPayment.paymentMethod.replace(/_/g, ' ').toUpperCase()}</p>
                        <p><strong>Student Name:</strong> {renderSafeString(foundPayment.student?.fullName)}</p>
                        <p><strong>Student ID:</strong> {renderSafeString(foundPayment.student?.studentId)}</p>
                        <p><strong>Class Level:</strong> {renderSafeString(foundPayment.classLevel)}</p>
                        <p><strong>Section:</strong> {renderSectionDisplay(foundPayment.student?.section || foundPayment.subClassLevel)}</p>
                        <p><strong>Branch:</strong> {renderSafeString(foundPayment.branch?.name)}</p>
                        {foundPayment.status === 'successful' && foundPayment.verifiedBy && (
                            <>
                                <p><strong>Verified By:</strong> {renderSafeString(foundPayment.verifiedBy?.fullName || foundPayment.verifiedBy)}</p>
                                <p><strong>Verification Date:</strong> {new Date(foundPayment.verificationDate).toLocaleDateString()}</p>
                                {foundPayment.adminNotes && <p><strong>Admin Notes:</strong> {foundPayment.adminNotes}</p>}
                            </>
                        )}
                        {foundPayment.status === 'pending' && (
                            <>
                                <button
                                    onClick={handleUpdatePaymentToSuccessful}
                                    className="submitButton updateStatusButton"
                                    disabled={updatePaymentLoading}
                                >
                                    {updatePaymentLoading ? 'Updating...' : 'Mark as Successful'}
                                </button>
                                <div className="bank-details-info">
                                    <h4>For Bank Transfer:</h4>
                                    <p><strong>Bank Name:</strong> {SCHOOL_BANK_DETAILS.bankName}</p>
                                    <p><strong>Account Name:</strong> {SCHOOL_BANK_DETAILS.accountName}</p>
                                    <p><strong>Account Number:</strong> {SCHOOL_BANK_DETAILS.accountNumber}</p>
                                    <p>Please use the Transaction Reference as your payment narration.</p>
                                </div>
                            </>
                        )}
                        {foundPayment.status === 'successful' && (
                            <button onClick={handlePrintSingleReceipt} className="submitButton printButton">Print Receipt</button>
                        )}
                    </div>
                )}

                {/* Filtered Payments Table (from filter search) */}
                {filteredPayments.length > 0 && (
                    <div className="filteredPaymentsSection">
                        <h3>Filtered Payments ({filteredPayments.length} Found)</h3>
                        {/* Only show 'Print Payment Statement' if there are multiple payments from a filter search */}
                        {filteredPayments.length > 0 && selectedPaymentSearchClassLevel && (
                             <button onClick={handlePrintStatement} className="submitButton printButton">
                                Print Payment Statement
                            </button>
                        )}
                       
                        <div className="tableContainer">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Student ID</th>
                                        <th>Student Name</th>
                                        <th>Class Level</th>
                                        <th>Section</th>
                                        <th>Branch</th>
                                        <th>Amount (NGN)</th>
                                        <th>Description</th> {/* Changed 'Reason' to 'Description' */}
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th>Transaction Ref</th>
                                        <th>Action</th> {/* NEW: Added Action column header */}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPayments.map((payment) => (
                                        <tr key={payment._id}>
                                            <td>{renderSafeString(payment.student?.studentId)}</td>
                                            <td>{renderSafeString(payment.student?.fullName)}</td>
                                            <td>{renderSafeString(payment.classLevel)}</td>
                                            <td>{renderSectionDisplay(payment.subClassLevel)}</td>
                                            <td>{renderSafeString(payment.branch?.name)}</td>
                                            <td>{payment.amount.toLocaleString()}</td>
                                            <td>{renderSafeString(payment.description)}</td> {/* Changed 'Reason' to 'Description' */}
                                            <td className={`payment-status ${payment.status}`}>{payment.status.toUpperCase()}</td>
                                            <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                                            <td>{renderSafeString(payment.transactionRef)}</td>
                                            <td>
                                                {payment.status === 'pending' && (
                                                    <button
                                                        className="actionButton success"
                                                        onClick={() => updatePaymentStatus(payment._id, 'successful')}
                                                        disabled={updatePaymentLoading}
                                                    >
                                                        {updatePaymentLoading ? 'Updating...' : 'Mark Successful'}
                                                    </button>
                                                )}
                                                {payment.status === 'successful' && (
                                                    <button
                                                        className="actionButton print"
                                                        onClick={() => {
                                                            setFoundPayment(payment); // Set this payment as the one to print
                                                            setTimeout(() => handlePrintSingleReceipt(), 100);
                                                        }}
                                                    >
                                                        Print Receipt
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>
            {/* End Payment Search & Update Section */}

            {/* Printable Receipt Content (Hidden by default, shown via CSS for printing) */}
            <div ref={receiptRef} className="receipt-content-printable">
                {foundPayment && ( // Only render if foundPayment is set
                    <div className="receipt-inner">
                        <h3>Official Payment Receipt</h3>
                        <p><strong>Transaction Ref:</strong> {foundPayment.transactionRef}</p>
                        <p><strong>Status:</strong> {foundPayment.status.toUpperCase()}</p>
                        <p><strong>Amount:</strong> NGN {foundPayment.amount.toLocaleString()}</p>
                        <p><strong>Description:</strong> {foundPayment.description}</p>
                        <p><strong>Payment Date:</strong> {new Date(foundPayment.paymentDate).toLocaleDateString()}</p>
                        <p><strong>Payment Method:</strong> {foundPayment.paymentMethod.replace(/_/g, ' ').toUpperCase()}</p>
                        <p><strong>Student Name:</strong> {renderSafeString(foundPayment.student?.fullName)}</p>
                        <p><strong>Student ID:</strong> {renderSafeString(foundPayment.student?.studentId)}</p>
                        <p><strong>Class Level:</strong> {renderSafeString(foundPayment.classLevel)}</p>
                        <p><strong>Section:</strong> {renderSectionDisplay(foundPayment.student?.section || foundPayment.subClassLevel)}</p>
                        <p><strong>Branch:</strong> {renderSafeString(foundPayment.branch?.name)}</p>
                        {foundPayment.status === 'successful' && foundPayment.verifiedBy && (
                            <>
                                <p><strong>Verified By:</strong> {renderSafeString(foundPayment.verifiedBy?.fullName || foundPayment.verifiedBy)}</p>
                                <p><strong>Verification Date:</strong> {new Date(foundPayment.verificationDate).toLocaleDateString()}</p>
                                {foundPayment.adminNotes && <p><strong>Admin Notes:</strong> {foundPayment.adminNotes}</p>}
                            </>
                        )}
                        {foundPayment.status === 'pending' && (
                            <div className="bank-details-info">
                                <h4>For Bank Transfer:</h4>
                                <p><strong>Bank Name:</strong> {SCHOOL_BANK_DETAILS.bankName}</p>
                                <p><strong>Account Name:</strong> {SCHOOL_BANK_DETAILS.accountName}</p>
                                <p><strong>Account Number:</strong> {SCHOOL_BANK_DETAILS.accountNumber}</p>
                                <p>Please use the Transaction Reference as your payment narration.</p>
                            </div>
                        )}
                        <p className="receipt-footer">This is an auto-generated receipt. Contact administration for details.</p>
                    </div>
                )}
            </div>

            {/* Printable Statement Content (Hidden by default, shown via CSS for printing) */}
            <div ref={statementRef} className="statement-content-printable">
                {filteredPayments.length > 0 && ( // Only render if filteredPayments has data
                    <div className="statement-inner">
                        <h3>Payment Statement for {selectedPaymentSearchClassLevel} {selectedPaymentSearchSubClassLevel ? `- ${selectedPaymentSearchSubClassLevel}` : ''}</h3>
                        <p>Generated on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                        <table>
                            <thead>
                                <tr>
                                    <th>S/N</th>
                                    <th>Student ID</th>
                                    <th>Student Name</th>
                                    <th>Class Level</th>
                                    <th>Section</th>
                                    <th>Branch</th>
                                    <th>Amount (NGN)</th>
                                    <th>Description</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Transaction Ref</th>
                                    {/* No action column in print statement */}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.map((payment, index) => (
                                    <tr key={payment._id}>
                                        <td>{index + 1}</td>
                                        <td>{renderSafeString(payment.student?.studentId)}</td>
                                        <td>{renderSafeString(payment.student?.fullName)}</td>
                                        <td>{renderSafeString(payment.classLevel)}</td>
                                        <td>{renderSectionDisplay(payment.subClassLevel)}</td>
                                        <td>{renderSafeString(payment.branch?.name)}</td>
                                        <td>{payment.amount.toLocaleString()}</td>
                                        <td>{renderSafeString(payment.description)}</td>
                                        <td>{payment.status.toUpperCase()}</td>
                                        <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                                        <td>{renderSafeString(payment.transactionRef)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Existing Sections Below (if any) */}
            <section className="section">
                <h2 className="sectionHeader">Exam Overview</h2>
                <div className="tableContainer">
                    <table>
                        <thead>
                             <tr>
                                    <th>Title</th>
                                    <th>Class Level</th>
                                    <th>Department</th>
                                    <th>Duration (mins)</th>
                                    <th>Branch</th>
                                    <th>Subjects</th>
                                    <th>Created Date</th>
                            </tr>
                        </thead> 
                        <tbody>
                            {exams.length > 0 ? (
                                exams.map(exam => (
                                    <tr key={exam._id}>
                                        <td>{exam.title}</td>
                                        <td>{exam.classLevel}</td>
                                        <td>{exam.areaOfSpecialization || 'N/A'}</td> {/* NEW */}
                                        <td>{exam.duration}</td>
                                        <td>{renderSafeString(exam.branch?.name)}</td>
                                        <td>
                                            {exam.subjectsIncluded.map(s => `${s.subjectName} (${s.numberOfQuestions})`).join(', ')}
                                        </td>
                                        <td>{new Date(exam.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7">No exams found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="section">
                <h2 className="sectionHeader">All Questions in Bank ({allQuestions.length})</h2>
                <div className="tableContainer">
                    <table>
                        <thead>
                            <tr>
                                <th>Question Text</th>
                                <th>Class Level</th>
                                <th>Subject</th>
                                <th>Options</th>
                                <th>Correct Option</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allQuestions.length > 0 ? (
                                allQuestions.map(q => (
                                    <tr key={q._id}>
                                        <td>{q.questionText}</td>
                                        <td>{q.classLevel}</td>
                                        <td>{renderSafeString(q.subject?.name)}</td>
                                        <td>
                                            {q.options.map((opt, i) => (
                                                <div key={i}>{String.fromCharCode(65 + i)}. {opt.text}</div>
                                            ))}
                                        </td>
                                        <td>{String.fromCharCode(65 + q.correctOptionIndex)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5">No questions found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Results Section */}
            <section className="section">
                <h2 className="sectionHeader">Student Results</h2>
                <div className="resultsFilter">
                    <div className="formGroup">
                        <label htmlFor="resultsClassLevel" className="label">Filter by Class Level:</label>
                        <select
                            id="resultsClassLevel"
                            value={selectedResultsClassLevel}
                            onChange={(e) => setSelectedResultsClassLevel(e.target.value)}
                            className="select"
                        >
                            <option value="">All Class Levels</option>
                            {CLASS_LEVELS.map(level => (<option key={level} value={level}>{level}</option>))}
                        </select>
                    </div>
                    <div className="formGroup">
                        <label htmlFor="resultsSubClassLevel" className="label">Filter by Section:</label>
                        <select
                            id="resultsSubClassLevel"
                            value={selectedResultsSubClassLevel}
                            onChange={(e) => setSelectedResultsSubClassLevel(e.target.value)}
                            className="select"
                            disabled={!selectedResultsClassLevel || availableResultsSubClassLevels.length === 0}
                        >
                            <option value="">All Sections</option>
                            {availableResultsSubClassLevels.map(section => (
                                <option key={section} value={section}>{section}</option>
                            ))}
                        </select>
                    </div>
                    {selectedResultsClassLevel && isSeniorSecondaryClass(selectedResultsClassLevel) && (
                        <div className="formGroup">
                            <label htmlFor="resultsDepartment" className="label">Filter by Department:</label>
                            <select
                                id="resultsDepartment"
                                value={selectedResultsDepartment}
                                onChange={(e) => setSelectedResultsDepartment(e.target.value)}
                                className="select"
                                disabled={availableResultsDepartments.length === 0}
                            >
                                <option value="">All Departments</option>
                                {availableResultsDepartments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <div className="tableContainer">
                    <table>
                        <thead>
                            <tr>
                                <th>Student ID</th>
                                <th>Name</th>
                                <th>Class</th>
                                <th>Section</th>
                                <th>Department</th>
                                <th>Exam Title</th>
                                <th>Subject</th>
                                <th>Score</th>
                                <th>Max Score</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allResults.length > 0 ? (
                                allResults.map(result => (
                                    <tr key={result._id}>
                                        <td>{result.student?.studentId || 'N/A'}</td>
                                        <td>{result.student?.fullName || 'N/A'}</td>
                                        <td>{result.exam?.classLevel || 'N/A'}</td>
                                        <td>{result.student?.section || 'N/A'}</td>
                                        <td>{result.student?.areaOfSpecialization || 'N/A'}</td>
                                        <td>{result.exam?.title || 'N/A'}</td>
                                        <td>{result.subject?.name || 'N/A'}</td>
                                        <td>{result.score}</td>
                                        <td>{result.maxScore}</td>
                                        <td>{new Date(result.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="10">No results found for the selected filters.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

export default AdminDashboard;