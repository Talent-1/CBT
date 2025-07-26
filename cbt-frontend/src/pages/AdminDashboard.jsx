// cbt-frontend/src/pages/AdminDashboard

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Assuming this path is correct
import '../App.css'; // Your main CSS file

// --- EXISTING IMPORTS (RESTORED) ---
import {
    addQuestion,
    getBranches,
    getAllUsers,
    addExam,
    getAllQuestions,
    getAllSubjects
} from '../api/admin'; // Your admin-specific API functions
import { getExams, deleteExam, updateExam } from '../api/exams'; // Your exam-specific API functions
import api from '../api/api'; // Your Axios instance for general API calls
import { SCHOOL_BANK_DETAILS } from '../utils/paymentUtils'; // Your payment utility constants
import { deleteQuestion, updateQuestion } from '../api/questions'; // Your question-specific API functions
// --- END EXISTING IMPORTS ---


// Constants (assuming these are already defined in your file or can be added)
const CLASS_LEVELS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];
const DEPARTMENTS = ['Sciences', 'Arts', 'Commercial'];
const SECTIONS = ['Junior', 'Senior']; // Added based on your requirements

// Helper function to render strings safely (from your existing code)
const renderSafeString = (str) => {
    return str ? String(str) : '';
};

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [activeSection, setActiveSection] = useState('dashboard'); // Default section
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    // --- EXISTING STATE VARIABLES (RESTORED) ---
    const [exams, setExams] = useState([]);
    const [newExam, setNewExam] = useState({
        title: '', classLevel: '', department: '', duration: '', branch: '', subjects: [], isActive: true
    });
    const [editingExam, setEditingExam] = useState(null);
    const [question, setQuestion] = useState({
        examId: '', questionText: '', options: ['', '', '', ''], correctAnswer: ''
    });
    const [allQuestions, setAllQuestions] = useState([]); // State to hold all questions
    const [payments, setPayments] = useState([]); // State to hold payments
    const [searchPaymentId, setSearchPaymentId] = useState('');
    const [foundPayment, setFoundPayment] = useState(null);
    const [receiptHtml, setReceiptHtml] = useState(''); // For payment receipts
    const [branches, setBranches] = useState([]); // For branches
    const [allUsers, setAllUsers] = useState([]); // For all users
    const [allSubjects, setAllSubjects] = useState([]); // For all subjects
    // --- END EXISTING STATE VARIABLES ---


    // --- NEW STATE FOR STUDENT RESULTS DASHBOARD ---
    const [studentResults, setStudentResults] = useState([]);
    const [filterClassLevel, setFilterClassLevel] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterDateTaken, setFilterDateTaken] = useState('');
    const [filterStudentId, setFilterStudentId] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const resultsPerPage = 50; // As per your requirement
    // --- END NEW STATE ---


    // --- EXISTING useEffect for Authentication and Initial Data Fetch (RESTORED and integrated) ---
    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/login'); // Redirect if not authorized
        }

        const fetchAllInitialData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch Exams
                const examsData = await getExams();
                setExams(examsData);

                // Fetch All Questions
                const questionsData = await getAllQuestions();
                setAllQuestions(questionsData);

                // Fetch Branches (if needed for exam creation or other parts)
                const branchesData = await getBranches();
                setBranches(branchesData);

                // Fetch All Users (if needed for user management)
                const usersData = await getAllUsers();
                setAllUsers(usersData);

                // Fetch All Subjects (if needed)
                const subjectsData = await getAllSubjects();
                setAllSubjects(subjectsData);

                // You might also fetch initial payments here if 'paymentManagement' is default
                // const paymentsData = await api.get('/api/payments'); // Example
                // setPayments(paymentsData.data);

            } catch (err) {
                setError(`Failed to fetch initial dashboard data: ${err.message}`);
                console.error("Error fetching initial dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAllInitialData();
    }, [user, navigate]); // Dependencies for initial data fetch


    // --- NEW: Fetch Student Results based on filters and pagination ---
    useEffect(() => {
        const fetchStudentResults = async () => {
            setLoading(true);
            setError(null);
            setStudentResults([]); // Clear previous results
            try {
                // Construct query parameters for the API
                const queryParams = new URLSearchParams({
                    page: currentPage,
                    limit: resultsPerPage,
                });

                if (filterClassLevel) queryParams.append('classLevel', filterClassLevel);
                // Apply section and department filters only for senior students
                if (filterClassLevel && ['SS1', 'SS2', 'SS3'].includes(filterClassLevel)) {
                    if (filterSection) queryParams.append('section', filterSection);
                    if (filterDepartment) queryParams.append('department', filterDepartment);
                }
                if (filterDateTaken) queryParams.append('dateTaken', filterDateTaken);
                if (filterStudentId) queryParams.append('studentId', filterStudentId);

                // Placeholder for your actual API endpoint for student results
                // Use your `api` (Axios) instance if preferred, or standard `fetch`
                const response = await api.get(`/api/admin/student-results?${queryParams.toString()}`);
                // Assuming api.get returns response.data directly, adjust if not
                const data = response.data;

                setStudentResults(data.results || []);
                setTotalPages(Math.ceil((data.totalCount || 0) / resultsPerPage));
            } catch (err) {
                setError(`Failed to fetch student results: ${err.message || "Unknown error"}`);
                console.error("Error fetching student results:", err);
            } finally {
                setLoading(false);
            }
        };

        // Only fetch when the 'studentResults' section is active
        // and when any filter or page changes
        if (activeSection === 'studentResults') {
            fetchStudentResults();
        }
    }, [activeSection, currentPage, filterClassLevel, filterSection, filterDepartment, filterDateTaken, filterStudentId]); // Dependencies


    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // --- Handlers for NEW Student Results Filters ---
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        if (name === 'classLevel') setFilterClassLevel(value);
        else if (name === 'section') setFilterSection(value);
        else if (name === 'department') setFilterDepartment(value);
        else if (name === 'dateTaken') setFilterDateTaken(value);
        else if (name === 'studentId') setFilterStudentId(value);
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handlePrintResults = () => {
        // This will print the currently displayed 50 results
        window.print();
    };

    // --- EXISTING HANDLERS (PLACEHOLDERS, ASSUMING YOUR LOGIC IS HERE) ---
    // Example: Add Exam Handler (from your document)
    const handleAddExam = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage('');
        try {
            const response = await addExam(newExam); // Using your imported API function
            setSuccessMessage(response.message || 'Exam added successfully!');
            setNewExam({ title: '', classLevel: '', department: '', duration: '', branch: '', subjects: [], isActive: true });
            // Re-fetch exams to update the list
            const updatedExams = await getExams();
            setExams(updatedExams);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add exam.');
        } finally {
            setLoading(false);
        }
    };

    const handleEditExam = (exam) => {
        setEditingExam({ ...exam, subjects: exam.subjects.join(',') }); // Convert array to comma-separated string for input
    };

    const handleSaveExam = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage('');
        try {
            const updatedExamData = {
                ...editingExam,
                subjects: editingExam.subjects.split(',').map(s => s.trim()) // Convert back to array
            };
            await updateExam(editingExam._id, updatedExamData); // Using your imported API function
            setSuccessMessage('Exam updated successfully!');
            setEditingExam(null); // Exit edit mode
            const updatedExams = await getExams(); // Re-fetch exams
            setExams(updatedExams);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update exam.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteExam = async (examId) => {
        if (window.confirm('Are you sure you want to delete this exam?')) {
            setLoading(true);
            setError(null);
            setSuccessMessage('');
            try {
                await deleteExam(examId); // Using your imported API function
                setSuccessMessage('Exam deleted successfully!');
                const updatedExams = await getExams(); // Re-fetch exams
                setExams(updatedExams);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete exam.');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleCancelEdit = () => {
        setEditingExam(null);
    };

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage('');
        try {
            await addQuestion(question); // Using your imported API function
            setSuccessMessage('Question added successfully!');
            setQuestion({ examId: '', questionText: '', options: ['', '', '', ''], correctAnswer: '' });
            const updatedQuestions = await getAllQuestions(); // Re-fetch all questions
            setAllQuestions(updatedQuestions);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add question.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearchPayment = async (e) => {
        e.preventDefault();
        setLoading(true);
        setFoundPayment(null);
        setError(null);
        try {
            // Assuming an API endpoint like /api/payments/search?paymentId=...
            const response = await api.get(`/api/payments/search?paymentId=${searchPaymentId}`);
            setFoundPayment(response.data); // Assuming API returns payment object directly
            setPayments(response.data ? [response.data] : []); // Update payments state
        } catch (err) {
            setError(err.response?.data?.message || 'Payment not found or error searching.');
            setFoundPayment(null);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePayment = async () => {
        if (!foundPayment) return;
        setLoading(true);
        setError(null);
        setSuccessMessage('');
        try {
            // Assuming an API endpoint like /api/payments/:id/status
            const updatedPayment = { ...foundPayment, status: 'successful' }; // Example: marking as successful
            await api.put(`/api/payments/${foundPayment._id}`, updatedPayment);
            setSuccessMessage('Payment status updated successfully!');
            setFoundPayment(updatedPayment); // Update local state
            // Re-fetch all payments or update the specific one in payments array if you have it
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update payment status.');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReceipt = async () => {
        if (!foundPayment) {
            alert('No payment found to generate receipt.');
            return;
        }
        // This is a placeholder. You'd typically generate this on the backend
        // or have a more robust frontend PDF generation.
        const receiptContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ccc; max-width: 600px; margin: auto;">
                <h2 style="text-align: center; color: #333;">Payment Receipt</h2>
                <p><strong>School Name:</strong> CITY GROUP OF SCHOOLS, OGID</p>
                <p><strong>Payment ID:</strong> ${foundPayment._id}</p>
                <p><strong>Student ID:</strong> ${foundPayment.studentId}</p>
                <p><strong>Amount Paid:</strong> $${foundPayment.amount}</p>
                <p><strong>Status:</strong> ${foundPayment.status}</p>
                <p><strong>Date:</strong> ${new Date(foundPayment.date).toLocaleDateString()}</p>
                <p style="text-align: center; margin-top: 30px;">Thank you for your payment!</p>
            </div>
        `;
        setReceiptHtml(receiptContent);
        // You might then trigger a print of just this receiptHtml
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>Receipt</title>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(receiptContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    };

    // --- END EXISTING HANDLERS ---

    // Dynamic section display (from your existing code, with NEW 'studentResults' case)
    const DisplaySection = ({ sectionName }) => {
        if (loading) return <div className="dashboard-section"><p>Loading section data...</p></div>;
        if (error) return <div className="dashboard-section"><p className="error-message">Error: {error}</p></div>;

        switch (sectionName) {
            case 'dashboard':
                return (
                    <div className="dashboard-section">
                        <h2>Admin Overview</h2>
                        <p>Welcome to the Admin Dashboard. Use the navigation to manage exams, questions, payments, and view student results.</p>
                        {/* Add quick stats or links here */}
                        <div className="button-group">
                             <button onClick={() => setActiveSection('addExam')}>Add Exam</button>
                             <button onClick={() => setActiveSection('studentResults')}>View Results</button>
                             <button onClick={() => setActiveSection('paymentManagement')}>Manage Payments</button>
                        </div>
                    </div>
                );
            case 'addExam':
                return (
                    <div className="dashboard-section">
                        <h3>Add New Unit Exam</h3>
                        <form onSubmit={handleAddExam}>
                            {/* Exam creation form fields */}
                            <label htmlFor="examTitle">Title:</label>
                            <input type="text" id="examTitle" name="title" value={newExam.title} onChange={(e) => setNewExam({ ...newExam, title: e.target.value })} required />

                            <label htmlFor="examClassLevel">Class Level:</label>
                            <select id="examClassLevel" name="classLevel" value={newExam.classLevel} onChange={(e) => setNewExam({ ...newExam, classLevel: e.target.value })} required>
                                <option value="">Select Class</option>
                                {CLASS_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                            </select>

                            {/* Department conditional based on Class Level */}
                            {newExam.classLevel && ['SS1', 'SS2', 'SS3'].includes(newExam.classLevel) && (
                                <>
                                    <label htmlFor="examDepartment">Department:</label>
                                    <select id="examDepartment" name="department" value={newExam.department} onChange={(e) => setNewExam({ ...newExam, department: e.target.value })} required>
                                        <option value="">Select Department</option>
                                        {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                    </select>
                                </>
                            )}
                            <label htmlFor="examDuration">Duration (mins):</label>
                            <input type="number" id="examDuration" name="duration" value={newExam.duration} onChange={(e) => setNewExam({ ...newExam, duration: e.target.value })} required />
                            <label htmlFor="examBranch">Branch:</label>
                            <input type="text" id="examBranch" name="branch" value={newExam.branch} onChange={(e) => setNewExam({ ...newExam, branch: e.target.value })} required />

                            <label>Subjects (comma separated):</label>
                            <input type="text" value={newExam.subjects.join(',')} onChange={(e) => setNewExam({ ...newExam, subjects: e.target.value.split(',').map(s => s.trim()) })} />

                            <label>
                                <input type="checkbox" checked={newExam.isActive} onChange={(e) => setNewExam({ ...newExam, isActive: e.target.checked })} />
                                Exam is Active
                            </label>
                            <button type="submit">Add Exam</button>
                        </form>
                        {successMessage && <p className="upload-message">{successMessage}</p>}
                    </div>
                );
            case 'manageExams':
                return (
                    <div className="dashboard-section">
                        <h3>Manage Existing Exams</h3>
                        {exams.length === 0 ? (
                            <p>No exams available. Add some exams first.</p>
                        ) : (
                            <div className="exam-list">
                                {exams.map(exam => (
                                    <div key={exam._id} className="exam-item">
                                        <h4>{renderSafeString(exam.title)} - {renderSafeString(exam.classLevel)}</h4>
                                        <p>Department: {renderSafeString(exam.department)}</p>
                                        <p>Duration: {renderSafeString(exam.duration)} mins</p>
                                        <p>Status: {exam.isActive ? 'Active' : 'Inactive'}</p>
                                        <button onClick={() => handleEditExam(exam)}>Edit</button>
                                        <button onClick={() => handleDeleteExam(exam._id)} className="logout-button">Delete</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {editingExam && (
                            <div className="edit-exam-form">
                                <h4>Edit Exam: {renderSafeString(editingExam.title)}</h4>
                                <form onSubmit={handleSaveExam}>
                                    <label htmlFor="editTitle">Title:</label>
                                    <input type="text" id="editTitle" name="title" value={editingExam.title} onChange={(e) => setEditingExam({ ...editingExam, title: e.target.value })} required />
                                    <label htmlFor="editClassLevel">Class Level:</label>
                                    <select id="editClassLevel" name="classLevel" value={editingExam.classLevel} onChange={(e) => setEditingExam({ ...editingExam, classLevel: e.target.value })} required>
                                        {CLASS_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                                    </select>
                                    <label htmlFor="editDepartment">Department:</label>
                                    <select id="editDepartment" name="department" value={editingExam.department} onChange={(e) => setEditingExam({ ...editingExam, department: e.target.value })} required>
                                        {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                    </select>
                                    <label htmlFor="editDuration">Duration (mins):</label>
                                    <input type="number" id="editDuration" name="duration" value={editingExam.duration} onChange={(e) => setEditingExam({ ...editingExam, duration: e.target.value })} required />
                                    <label>
                                        <input type="checkbox" checked={editingExam.isActive} onChange={(e) => setEditingExam({ ...editingExam, isActive: e.target.checked })} />
                                        Exam is Active
                                    </label>
                                    <button type="submit">Save Changes</button>
                                    <button type="button" onClick={handleCancelEdit} className="cancel-button">Cancel</button>
                                </form>
                            </div>
                        )}
                    </div>
                );
            case 'addQuestion':
                return (
                    <div className="dashboard-section">
                        <h3>Add New Question</h3>
                        <form onSubmit={handleAddQuestion}>
                            <label htmlFor="questionExamId">Select Exam:</label>
                            <select id="questionExamId" value={question.examId} onChange={(e) => setQuestion({ ...question, examId: e.target.value })} required>
                                <option value="">-- Select Exam --</option>
                                {exams.map(exam => <option key={exam._id} value={exam._id}>{renderSafeString(exam.title)} ({renderSafeString(exam.classLevel)})</option>)}
                            </select>

                            <label htmlFor="questionText">Question Text:</label>
                            <textarea id="questionText" value={question.questionText} onChange={(e) => setQuestion({ ...question, questionText: e.target.value })} required />

                            {question.options.map((option, index) => (
                                <input
                                    key={index}
                                    type="text"
                                    placeholder={`Option ${index + 1}`}
                                    value={option}
                                    onChange={(e) => {
                                        const newOptions = [...question.options];
                                        newOptions[index] = e.target.value;
                                        setQuestion({ ...question, options: newOptions });
                                    }}
                                    required
                                />
                            ))}

                            <label htmlFor="correctAnswer">Correct Answer (must match one of the options):</label>
                            <input type="text" id="correctAnswer" value={question.correctAnswer} onChange={(e) => setQuestion({ ...question, correctAnswer: e.target.value })} required />

                            <button type="submit">Add Question</button>
                        </form>
                        {successMessage && <p className="upload-message">{successMessage}</p>}
                    </div>
                );
            case 'allQuestions':
                return (
                    <div className="dashboard-section">
                        <h3>All Questions in Question Bank</h3>
                        {allQuestions.length === 0 ? (
                            <p>No questions in the bank. Add some questions first.</p>
                        ) : (
                            <div className="question-list">
                                {allQuestions.map(q => (
                                    <div key={q._id} className="question-item">
                                        <h4>Exam: {renderSafeString(q.examTitle)}</h4> {/* Assuming examTitle is available in the question object */}
                                        <p>{renderSafeString(q.questionText)}</p>
                                        <ul>
                                            {q.options.map((opt, idx) => (
                                                <li key={idx} style={{ color: opt === q.correctAnswer ? 'lightgreen' : 'white' }}>{opt}</li>
                                            ))}
                                        </ul>
                                        {/* Add edit/delete question buttons if needed */}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'paymentManagement':
                return (
                    <div className="dashboard-section">
                        <h3>Payment Management</h3>
                        <form onSubmit={handleSearchPayment}>
                            <label htmlFor="searchPayment">Search by Payment ID:</label>
                            <input
                                type="text"
                                id="searchPayment"
                                value={searchPaymentId}
                                onChange={(e) => setSearchPaymentId(e.target.value)}
                                placeholder="Enter Payment ID"
                            />
                            <button type="submit">Search Payment</button>
                        </form>
                        {foundPayment && (
                            <div className="payment-details">
                                <h4>Payment Details</h4>
                                <p>ID: {renderSafeString(foundPayment._id)}</p>
                                <p>Student ID: {renderSafeString(foundPayment.studentId)}</p>
                                <p>Amount: ${renderSafeString(foundPayment.amount)}</p>
                                <p>Status: {renderSafeString(foundPayment.status)}</p>
                                {foundPayment.status !== 'successful' && (
                                    <button onClick={handleUpdatePayment} className="dashboard-button">Mark Successful</button>
                                )}
                                <button onClick={handleGenerateReceipt} className="dashboard-button">Generate Receipt</button>
                                {receiptHtml && (
                                    <div className="receipt-preview" dangerouslySetInnerHTML={{ __html: receiptHtml }} />
                                )}
                            </div>
                        )}
                        {successMessage && <p className="upload-message">{successMessage}</p>}
                    </div>
                );
            case 'studentResults':
                // --- NEW: Student Results Dashboard ---
                return (
                    <div className="main-content"> {/* Use main-content for wider display if needed */}
                        <div className="dashboard-section">
                            <h2>Student Results Overview</h2>

                            {/* Filter Section */}
                            <div className="filter-section">
                                <div>
                                    <label htmlFor="filterClassLevel">Class Level:</label>
                                    <select id="filterClassLevel" name="classLevel" value={filterClassLevel} onChange={handleFilterChange}>
                                        <option value="">All</option>
                                        {CLASS_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                                    </select>
                                </div>

                                {/* Section filter only for Senior classes (SS1, SS2, SS3) */}
                                {filterClassLevel && ['SS1', 'SS2', 'SS3'].includes(filterClassLevel) && (
                                    <div>
                                        <label htmlFor="filterSection">Section:</label>
                                        <select id="filterSection" name="section" value={filterSection} onChange={handleFilterChange}>
                                            <option value="">All</option>
                                            {SECTIONS.map(section => <option key={section} value={section}>{section}</option>)}
                                        </select>
                                    </div>
                                )}

                                {/* Department filter only for Senior section and Senior classes */}
                                {filterSection === 'Senior' && filterClassLevel && ['SS1', 'SS2', 'SS3'].includes(filterClassLevel) && (
                                    <div>
                                        <label htmlFor="filterDepartment">Department:</label>
                                        <select id="filterDepartment" name="department" value={filterDepartment} onChange={handleFilterChange}>
                                            <option value="">All</option>
                                            {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="filterDateTaken">Date Taken:</label>
                                    <input type="date" id="filterDateTaken" name="dateTaken" value={filterDateTaken} onChange={handleFilterChange} />
                                </div>

                                <div>
                                    <label htmlFor="filterStudentId">Student ID:</label>
                                    <input type="text" id="filterStudentId" name="studentId" value={filterStudentId} onChange={handleFilterChange} placeholder="Enter Student ID" />
                                </div>
                            </div>

                            {/* Results Table */}
                            {loading && <p>Loading results...</p>}
                            {error && <p className="error-message">{error}</p>}
                            {!loading && !error && studentResults.length === 0 && (
                                <p>No results found for the selected filters. Adjust filters or check student ID.</p>
                            )}

                            {!loading && !error && studentResults.length > 0 && (
                                <>
                                    <table className="results-table">
                                        <thead>
                                            <tr>
                                                <th>Student ID</th>
                                                <th>Name of Student</th>
                                                <th>Exam Name</th>
                                                <th>Overall Score (%)</th>
                                                <th>Subject Score</th>
                                                <th>Date Taken</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studentResults.map((result, index) => (
                                                <tr key={result.studentId + result.examName + index}> {/* Unique key combining multiple fields */}
                                                    <td>{renderSafeString(result.studentId)}</td>
                                                    <td>{renderSafeString(result.studentName)}</td>
                                                    <td>{renderSafeString(result.examName)}</td>
                                                    <td>{renderSafeString(result.overallPercentageScore)}%</td>
                                                    <td>
                                                        {/* Assuming result.subjectScores is an object like { "Math": 85, "English": 90 } */}
                                                        {result.subjectScores ?
                                                            Object.entries(result.subjectScores).map(([subject, score]) => (
                                                                <div key={subject}>{subject}: {renderSafeString(score)}%</div>
                                                            )) : (
                                                                // Fallback if subjectScore is a single string or number
                                                                renderSafeString(result.subjectScore)
                                                            )
                                                        }
                                                    </td>
                                                    <td>{result.dateTaken ? new Date(result.dateTaken).toLocaleDateString() : 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Pagination Controls */}
                                    <div className="pagination-controls">
                                        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
                                        <span>Page {currentPage} of {totalPages}</span>
                                        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
                                    </div>

                                    {/* Print Button */}
                                    <button onClick={handlePrintResults} className="print-button">Print Current Page (50 results)</button>
                                </>
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="header-content">
                    <Link to="/" className="logo-link">
                        {/* Assuming your logo path */}
                        <img src="/school_logo.png" alt="School Logo" className="school-logo" />
                        <h1>CITY GROUP OF SCHOOLS, OGID</h1>
                    </Link>
                    <nav className="main-nav">
                        <ul>
                            {user ? (
                                <>
                                    <li className="welcome-message">Welcome, {renderSafeString(user.username)}!</li>
                                    <li><Link to="/profile">Profile</Link></li>
                                    <li><button onClick={handleLogout} className="logout-button">Logout</button></li>
                                </>
                            ) : (
                                <>
                                    <li><Link to="/login" className="login-button">Login</Link></li>
                                    <li><Link to="/register" className="register-button">Register</Link></li>
                                </>
                            )}
                        </ul>
                    </nav>
                </div>
            </header>

            <main className="main-content">
                <h1 style={{ textAlign: 'center' }}>Admin Dashboard</h1>
                <div className="dashboard-navigation">
                    <button onClick={() => setActiveSection('dashboard')} className={activeSection === 'dashboard' ? 'active-nav-button' : ''}>Dashboard Home</button>
                    <button onClick={() => setActiveSection('addExam')} className={activeSection === 'addExam' ? 'active-nav-button' : ''}>Add Unit Exam</button>
                    <button onClick={() => setActiveSection('manageExams')} className={activeSection === 'manageExams' ? 'active-nav-button' : ''}>Manage Exams</button>
                    <button onClick={() => setActiveSection('addQuestion')} className={activeSection === 'addQuestion' ? 'active-nav-button' : ''}>Add Question</button>
                    <button onClick={() => setActiveSection('allQuestions')} className={activeSection === 'allQuestions' ? 'active-nav-button' : ''}>All Questions</button>
                    <button onClick={() => setActiveSection('paymentManagement')} className={activeSection === 'paymentManagement' ? 'active-nav-button' : ''}>Payment Management</button>
                    {/* NEW: Student Results button */}
                    <button onClick={() => setActiveSection('studentResults')} className={activeSection === 'studentResults' ? 'active-nav-button' : ''}>Student Results</button>
                    <button onClick={handleLogout} className="logout-button">Logout</button>
                </div>

                {/* Loading and Error states for the overall dashboard sections */}
                {loading && <p>Loading dashboard section...</p>}
                {error && <p className="error-message">Dashboard Error: {error}</p>}
                {/* Display the active section content */}
                <DisplaySection sectionName={activeSection} />
            </main>

            <footer className="app-footer">
                <p>&copy; 2024 Your School Name. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default AdminDashboard;