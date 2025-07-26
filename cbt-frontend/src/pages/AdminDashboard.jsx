// cbt-frontend/src/pages/AdminDashboard.jsx (CORRECTED CODE)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  addQuestion,
  getBranches,
  getAllUsers,
  addExam,
  getAllQuestions,
  getAllSubjects
} from '../api/admin';
import { getExams, deleteExam, updateExam } from '../api/exams';
import api from '../api/api'; // Your Axios instance
import { SCHOOL_BANK_DETAILS } from '../utils/paymentUtils';
import { deleteQuestion, updateQuestion } from '../api/questions';
import '/src/style/AdminDashboard.css'; // Make sure this CSS file is correctly linked and updated

// --- GLOBAL HELPER FUNCTIONS (MOVED HERE TO BE ACCESSIBLE) ---

// Helper function to safely render properties that might be objects with { _id, name }
const renderSafeString = (value) => {
  if (typeof value === 'object' && value !== null && (Object.prototype.hasOwnProperty.call(value, '_id') || Object.prototype.hasOwnProperty.call(value, 'name') || Object.prototype.hasOwnProperty.call(value, 'fullName') || Object.prototype.hasOwnProperty.call(value, 'subjectName') || Object.prototype.hasOwnProperty.call(value, 'title') || Object.prototype.hasOwnProperty.call(value, 'studentId'))) {
    return value.name || value.fullName || value.subjectName || value.title || value.studentId || 'N/A';
  }
  return value || 'N/A'; // Otherwise, render as is, or fallback to 'N/A' if null/undefined/empty string
};

// Helper to specifically handle section display (e.g., replace 'senior' with something else)
const renderSectionDisplay = (value) => {
  const safeValue = renderSafeString(value);
  // Based on your previous code, 'senior' was an invalid section data.
  // Assuming 'Junior' and 'Senior' are desired explicit values for sections.
  // If 'senior' is still an internal marker for "senior students" rather than a specific section name,
  // this might need adjustment based on how sections are truly stored.
  if (typeof safeValue === 'string' && safeValue.toLowerCase() === 'senior' && safeValue !== 'Senior') {
    // This condition might need refinement if 'senior' is a valid section name.
    // For now, I'm keeping the original intent which seemed to treat it as "N/A".
    return 'N/A (Invalid Section Data)';
  }
  return safeValue;
};


// Function to transform raw results into the desired grouped format
export const groupResultsByStudentAndExam = (results) => {
  if (!Array.isArray(results)) {
    console.error("groupResultsByStudentAndExam expects an array but received:", results);
    return [];
  }

  const grouped = {};

  results.forEach(result => {
    // Ensure we have stable IDs for grouping and rendering
    // Use student_id or user.studentId as primary, fallback to user._id if studentId not present
    const studentId = renderSafeString(result.student_id || result.user?.studentId || result.user?._id);
    // Use exam_id or exam._id as primary
    const examId = renderSafeString(result.exam_id || result.exam?._id);

    if (studentId === 'N/A' || examId === 'N/A') {
      console.warn("Skipping result due to missing student or exam ID for grouping:", result);
      return; // Skip this result if essential IDs are missing
    }

    const key = `${studentId}-${examId}`; // Unique key for each student-exam combination

    if (!grouped[key]) {
      // Initialize if this is the first time we see this student-exam combination
      grouped[key] = {
        _id: result._id, // Keep the original result ID for the row key if needed
        studentId: studentId,
        fullName: renderSafeString(result.student_name || result.user?.fullName),
        classLevel: renderSafeString(result.student_classLevel || result.user?.classLevel),
        section: renderSectionDisplay(result.student_section || result.user?.section),
        department: renderSafeString(result.student_department || result.user?.areaOfSpecialization),
        examTitle: renderSafeString(result.exam_title || result.exam?.title),
        dateTaken: result.date_taken ? new Date(result.date_taken).toLocaleDateString() : 'N/A',
        overallScore: result.score, // This is the total score for the exam from your API
        totalMaxScore: result.total_questions, // This is the total questions for the exam from your API
        // CRITICAL: Directly use subject_scores_breakdown from the API response
        subject_scores_breakdown: result.subject_scores_breakdown || [],
        formattedSubjectScores: '', // Initialize, will be populated next
      };

      // NEW LOGIC: Generate the formatted string from the subject_scores_breakdown
      if (grouped[key].subject_scores_breakdown.length > 0) {
        grouped[key].formattedSubjectScores = grouped[key].subject_scores_breakdown
          .map(
            (subScore) =>
              `${renderSafeString(subScore.subjectName)}: ${renderSafeString(subScore.score)}/${renderSafeString(subScore.totalQuestionsInSubject)}`
          )
          .join('\n'); // Join with a newline for <pre> tag
      } else {
        grouped[key].formattedSubjectScores = 'N/A';
      }
    }
    // No need to do anything here if you just want the first unique result per student-exam
    // If you needed to aggregate multiple attempts, this logic would be different.
  });

  // Calculate percentage for all entries after grouping
  return Object.values(grouped).map(entry => {
    const percentage = entry.totalMaxScore > 0
      ? ((entry.overallScore / entry.totalMaxScore) * 100).toFixed(2) + '%'
      : '0.00%';
    return { ...entry, percentage };
  });
};

    // Accumulate scores for each subject
    const score = typeof result.score === 'number' ? result.score : 0;
    const maxScore = typeof result.total_questions === 'number' ? result.total_questions : 0;
    const subjectName = renderSafeString(result.subject_name || result.subject?.subjectName);

    grouped[key].overallScore += score;
    grouped[key].totalMaxScore += maxScore;
    grouped[key].subjectScores.push({
      subjectName: subjectName,
      score: score,
      maxScore: maxScore,
    });
  });

  // Calculate percentage and format subject scores
  return Object.values(grouped).map(entry => {
    const percentage = entry.totalMaxScore > 0
      ? ((entry.overallScore / entry.totalMaxScore) * 100).toFixed(2) + '%'
      : '0.00%';

    // Format subject scores into the desired string
    entry.formattedSubjectScores = entry.subjectScores.map(sub =>
      `${sub.subjectName}: ${sub.score}/${sub.maxScore}`
    ).join('\n'); // Use newline for display in table cell

    return { ...entry, percentage };
  });
};

// --- END GLOBAL HELPER FUNCTIONS ---

// Added Primary levels as discussed
const CLASS_LEVELS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'];

// NEW: Departments for senior secondary class levels
const DEPARTMENTS = ['Sciences', 'Arts', 'Commercial'];

// ⭐ NEW: Specific Sections as requested
const SECTIONS = ['Junior', 'Senior']; // Assuming these are the distinct values for 'section' filter

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
  // ⭐ MODIFIED: Use the fixed SECTIONS array for filtering results.
  // The backend should handle which students belong to 'Junior' or 'Senior' sections.
  // If the 'section' field on users is free-form, this might need more sophisticated mapping.
  // For the purpose of the dropdown, we'll use the defined SECTIONS.
  return SECTIONS.filter(section => {
    // Check if any user matches the classLevel and this section
    return users.some(user => user.classLevel === classLevel && (user.section === section || (user.section === 'senior' && section === 'Senior') || (user.section === 'junior' && section === 'Junior')));
  }).sort();
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
  const [allResults, setAllResults] = useState([]); // This state will now hold the raw transformed results
  // ⭐ MODIFIED STATE: Processed results for display
  const [processedResults, setProcessedResults] = useState([]);
  // ⭐ NEW STATE FOR PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage] = useState(50); // Fixed at 50 per page
  const [totalResultsCount, setTotalResultsCount] = useState(0); // Total count from backend
  const [allUsers, setAllUsers] = useState([]); // Keep all users to derive sections and departments
  const [allQuestions, setAllQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState({
    questionText: '', optionA: '', optionB: '', optionC: '', optionD: '', correctOption: '',
    subject: '', classLevel: '',
  });
  const [newExam, setNewExam] = useState({
    title: '', classLevel: '', duration: '', branchId: '', areaOfSpecialization: '', isActive: true // ⭐ NEW: Add isActive default
  });
  const [selectedSubjectsForExam, setSelectedSubjectsForExam] = useState({});
  const [availableSubjectsGrouped, setAvailableSubjectsGrouped] = useState({});
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [error, setError] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  // --- NEWLY ADDED STATE VARIABLES FOR RESULTS FILTERING ---
  const [selectedResultsClassLevel, setSelectedResultsClassLevel] = useState('');
  // ⭐ MODIFIED: This will now refer to 'Junior' or 'Senior'
  const [selectedResultsSubClassLevel, setSelectedResultsSubClassLevel] = useState('');
  const [selectedResultsDepartment, setSelectedResultsDepartment] = useState('');
  // ⭐ NEW: State for Date Taken filter
  const [selectedDateTaken, setSelectedDateTaken] = useState(''); // Format: YYYY-MM-DD
  // ⭐ NEW: State for Student ID filter
  const [studentIdFilter, setStudentIdFilter] = useState('');

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

  // ⭐ MODIFIED: fetchData now takes pagination and new filter parameters
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
      setAllUsers(fetchedUsers);

      const resultsFilterParams = new URLSearchParams();
      if (selectedResultsClassLevel) {
        resultsFilterParams.append('classLevel', selectedResultsClassLevel);
      }
      if (selectedResultsSubClassLevel) {
        resultsFilterParams.append('section', selectedResultsSubClassLevel);
      }
      if (isSeniorSecondaryClass(selectedResultsClassLevel) && selectedResultsDepartment) {
        resultsFilterParams.append('areaOfSpecialization', selectedResultsDepartment);
      }
      if (selectedDateTaken) {
        resultsFilterParams.append('dateTaken', selectedDateTaken);
      }
      if (studentIdFilter.trim()) {
        resultsFilterParams.append('studentId', studentIdFilter.trim());
      }
      resultsFilterParams.append('page', currentPage);
      resultsFilterParams.append('limit', resultsPerPage);

      const filterQueryString = resultsFilterParams.toString();
      const resultsEndpoint = `/results${filterQueryString ? `?${filterQueryString}` : ''}`;
      console.log(`AdminDashboard: API Call: Fetching all results with endpoint: ${resultsEndpoint}`);

      // ⭐ CRITICAL MODIFICATION: Access the 'data' property of the response object
      const fetchedResultsResponse = await api.get(resultsEndpoint);
      const resultsData = fetchedResultsResponse.data || []; // Ensure it's an array

      // ⭐ If your backend *also* sends a totalCount property directly in the response object
      // (e.g., { data: [...], totalCount: N }), you'd do:
      // const totalCount = fetchedResultsResponse.totalCount || resultsData.length;
      // BUT based on your previous network tab output, it's just the array.
      // So, totalCount is the length of the *current page's* results.
      const totalCount = resultsData.length;

      console.log("Fetched Results Raw Data:", resultsData);
      console.log("Total Results Count:", totalCount);

      setAllResults(resultsData); // Store the raw results for current page
      setTotalResultsCount(totalCount); // Store total count for pagination

      // Process results after fetching them (only the current page's results)
      setProcessedResults(groupResultsByStudentAndExam(resultsData)); // Pass the array

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
  }, [
    selectedResultsClassLevel,
    selectedResultsSubClassLevel,
    selectedResultsDepartment,
    selectedDateTaken,
    studentIdFilter,
    currentPage,
    resultsPerPage
  ]);


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
      // ⭐ MODIFIED: This now uses the fixed SECTIONS array based on your query.
      // You might need to adjust `getUniqueSectionsForClassLevel` if actual section names are dynamic.
      // For now, it filters the fixed SECTIONS based on users.
      const sections = getUniqueSectionsForClassLevel(allUsers, selectedResultsClassLevel);
      setAvailableResultsSubClassLevels(sections);
      setSelectedResultsSubClassLevel(''); // Reset section when class changes

      if (isSeniorSecondaryClass(selectedResultsClassLevel)) {
        const departments = getUniqueDepartmentsForClassLevel(allUsers, selectedResultsClassLevel);
        setAvailableResultsDepartments(departments);
        setSelectedResultsDepartment(''); // Reset department when class changes
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
    // ⭐ NEW: Reset currentPage when filters change to ensure fresh data
    setCurrentPage(1);
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
    setSelectedSubjectsForExam(prevSelected => {
      const newState = { ...prevSelected };
      // 1. Find the full subject object from your availableSubjectsGrouped state.
      // We flatten the grouped subjects to search across all class levels.
      const allSubjectsFlat = Object.values(availableSubjectsGrouped).flat();
      const selectedSubjectData = allSubjectsFlat.find(s => s._id === subjectId);

      if (!selectedSubjectData) {
        console.error("Error: Subject data not found for ID:", subjectId);
        return prevSelected; // Prevent updating state with incomplete data
      }

      if (isChecked) {
        newState[subjectId] = {
          isSelected: true,
          numQuestions: prevSelected[subjectId]?.numQuestions || '', // Preserve existing numQuestions or set to empty
          subjectName: selectedSubjectData.subjectName // ⭐ THIS IS THE CRUCIAL ADDITION
        };
      } else {
        // If unchecking, remove the subject from the state
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
        // You no longer need to find the subject again here because subjectName is already in 'data'
        return {
          subjectId: subjectId,
          subjectName: data.subjectName, // ⭐ CORRECTED: Use data.subjectName directly
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
        areaOfSpecialization: isSeniorSecondaryClass(newExam.classLevel) ? newExam.areaOfSpecialization : null,
        isActive: newExam.isActive, // ⭐ NEW: Include isActive in the payload
      };

      console.log('API Call: Adding new Unit Exam...', examDataToSend);
      await addExam(examDataToSend);
      setFeedbackMessage('Unit Exam added successfully!');
      setNewExam({
        title: '', classLevel: '', duration: '', branchId: '', areaOfSpecialization: '', isActive: true // Reset with default active
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
        console.log(`Searching for payment with term: ${paymentSearchTerm}`);
        const response = await api.get(`/payments/search?term=${encodeURIComponent(paymentSearchTerm.trim())}`);
        if (response.data && response.data.payment) {
          setFoundPayment(response.data.payment);
          paymentsToSet = [];
          if (response.data.payment && response.data.payment.status !== 'pending') {
            setUpdatePaymentFeedback(`Note: This payment is already ${response.data.payment.status}.`);
          }
        } else {
          setPaymentSearchError('No payment found for the provided search term.');
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

  // NEW: Handler stubs for exam and question edit/delete
  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Are you sure you want to delete this exam? This action cannot be undone.')) return;
    try {
      await deleteExam(examId);
      setExams(prev => prev.filter(e => e._id !== examId));
      setFeedbackMessage('Exam deleted successfully.');
      if (examToEdit && examToEdit._id === examId) closeEditExamModal();
    } catch (err) {
      setError(err.toString());
    }
  };

  // ⭐ NEW: Toggle Exam Active Status
  const handleToggleExamActiveStatus = async (examId, currentStatus) => {
    if (!authUser || authUser.role !== 'admin') {
      setError('Unauthorized: Only Super Administrators can change exam status.');
      return;
    }
    const newStatus = !currentStatus;
    if (!window.confirm(`Are you sure you want to ${newStatus ? 'ACTIVATE' : 'DEACTIVATE'} this exam?`)) return;

    setError('');
    setFeedbackMessage('');
    try {
      await updateExam(examId, { isActive: newStatus });
      setFeedbackMessage(`Exam ${newStatus ? 'activated' : 'deactivated'} successfully!`);
      // Update local state directly for immediate feedback
      setExams(prevExams =>
        prevExams.map(exam =>
          exam._id === examId ? { ...exam, isActive: newStatus } : exam
        )
      );
    } catch (err) {
      console.error("Toggle exam status error:", err.response ? err.response.data : err.message, err);
      setError(err.response?.data?.message || err.message || `Failed to ${newStatus ? 'activate' : 'deactivate'} exam.`);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) return;
    try {
      await deleteQuestion(questionId);
      setAllQuestions(prev => prev.filter(q => q._id !== questionId));
      setFeedbackMessage('Question deleted successfully.');
      if (questionToEdit && questionToEdit._id === questionId) closeEditQuestionModal();
    } catch (err) {
      setError(err.toString());
    }
  };

  // --- MODAL STATE FOR EDITING EXAMS & QUESTIONS ---
  const [editExamModalOpen, setEditExamModalOpen] = useState(false);
  const [examToEdit, setExamToEdit] = useState(null);
  const [editExamForm, setEditExamForm] = useState({});

  const [editQuestionModalOpen, setEditQuestionModalOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState(null);
  const [editQuestionForm, setEditQuestionForm] = useState({});

  // Handle Edit Exam (open modal and populate form)
  const handleEditExam = (exam) => {
    setExamToEdit(exam);
    setEditExamForm({
      title: exam.title || '',
      classLevel: exam.classLevel || '',
      duration: exam.duration || '',
      branchId: exam.branchId || '',
      areaOfSpecialization: exam.areaOfSpecialization || '',
      subjectsIncluded: exam.subjectsIncluded || [],
      isActive: exam.isActive ?? true, // ⭐ NEW: Populate isActive
    });
    setEditExamModalOpen(true);
  };

  // Handle Edit Question (open modal and populate form)
  const handleEditQuestion = (question) => {
    setQuestionToEdit(question);
    setEditQuestionForm({
      questionText: question.questionText || '',
      classLevel: question.classLevel || '',
      subject: question.subject?._id || '',
      optionA: question.options?.[0]?.text || '',
      optionB: question.options?.[1]?.text || '',
      optionC: question.options?.[2]?.text || '',
      optionD: question.options?.[3]?.text || '',
      correctOption: String.fromCharCode(65 + (question.correctOptionIndex ?? 0)),
    });
    setEditQuestionModalOpen(true);
  };

  // Handle closing modals
  const closeEditExamModal = () => {
    setEditExamModalOpen(false);
    setExamToEdit(null);
  };

  const closeEditQuestionModal = () => {
    setEditQuestionModalOpen(false);
    setQuestionToEdit(null);
  };

  // Handle edit form changes
  const handleEditExamFormChange = (e) => {
    const { name, value, type, checked } = e.target; // ⭐ NEW: Get type and checked for checkbox
    setEditExamForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEditQuestionFormChange = (e) => {
    setEditQuestionForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Handle saving exam edits
  const handleSaveExamEdit = async (e) => {
    e.preventDefault();
    if (!examToEdit) return;
    setError('');
    setFeedbackMessage('');
    try {
      await updateExam(examToEdit._id, {
        ...editExamForm,
        duration: parseInt(editExamForm.duration),
        // subjectsIncluded is not updated via this modal for simplicity, would need more complex UI
        // If subjects are modified, you'd need logic here to handle it.
      });
      setFeedbackMessage('Exam updated successfully!');
      setEditExamModalOpen(false);
      setExamToEdit(null);
      await fetchData(); // Re-fetch to get updated exams including isActive status
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update exam.');
    }
  };

  // Handle saving question edits
  const handleSaveQuestionEdit = async (e) => {
    e.preventDefault();
    if (!questionToEdit) return;
    setError('');
    setFeedbackMessage('');

    // Prepare options and correctOptionIndex
    const optionsArray = [
      { text: editQuestionForm.optionA },
      { text: editQuestionForm.optionB },
      { text: editQuestionForm.optionC },
      { text: editQuestionForm.optionD },
    ];
    const correctOptionMapping = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
    const correctOptionIndex = correctOptionMapping[editQuestionForm.correctOption.toUpperCase()];

    try {
      await updateQuestion(questionToEdit._id, {
        questionText: editQuestionForm.questionText,
        classLevel: editQuestionForm.classLevel,
        subject: editQuestionForm.subject,
        options: optionsArray,
        correctOptionIndex,
      });
      setFeedbackMessage('Question updated successfully!');
      setEditQuestionModalOpen(false);
      setQuestionToEdit(null);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update question.');
    }
  };

  // ⭐ NEW: Pagination handlers
  const totalPages = Math.ceil(totalResultsCount / resultsPerPage);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
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

      {/* --- EDIT EXAM MODAL --- */}
      {editExamModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Edit Exam</h2>
            <form onSubmit={handleSaveExamEdit} className="form">
              <div className="formGroup">
                <label>Title:</label>
                <input type="text" name="title" value={editExamForm.title} onChange={handleEditExamFormChange} required className="input" />
              </div>
              <div className="formGroup">
                <label>Class Level:</label>
                <select name="classLevel" value={editExamForm.classLevel} onChange={handleEditExamFormChange} required className="select">
                  <option value="">Select Class Level</option>
                  {CLASS_LEVELS.map(level => (<option key={level} value={level}>{level}</option>))}
                </select>
              </div>
              {/* Department for senior secondary */}
              {editExamForm.classLevel && isSeniorSecondaryClass(editExamForm.classLevel) && (
                <div className="formGroup">
                  <label>Department:</label>
                  <select name="areaOfSpecialization" value={editExamForm.areaOfSpecialization} onChange={handleEditExamFormChange} required className="select">
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="formGroup">
                <label>Duration (mins):</label>
                <input type="number" name="duration" value={editExamForm.duration} onChange={handleEditExamFormChange} required className="input" min="1" />
              </div>
              <div className="formGroup">
                <label>Branch:</label>
                <select name="branchId" value={editExamForm.branchId} onChange={handleEditExamFormChange} required className="select">
                  <option value="">Select Branch</option>
                  {branches.map(branch => (<option key={branch._id} value={branch._id}>{branch.name}</option>))}
                </select>
              </div>
              {/* ⭐ NEW: isActive checkbox */}
              <div className="formGroup checkboxGroup">
                <input type="checkbox" id="editExamIsActive" name="isActive" checked={editExamForm.isActive} onChange={handleEditExamFormChange} className="checkbox" />
                <label htmlFor="editExamIsActive" className="checkboxLabel">Exam is Active</label>
              </div>
              {/* Subjects display (read-only) */}
              <div className="formGroup">
                <label>Subjects:</label>
                <div>
                  {editExamForm.subjectsIncluded && editExamForm.subjectsIncluded.map(s => `${s.subjectName} (${s.numberOfQuestions})`).join(', ')}
                </div>
              </div>
              <div className="modal-actions">
                <button type="submit" className="submitButton">Save</button>
                <button type="button" className="cancelButton" onClick={closeEditExamModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT QUESTION MODAL --- */}
      {editQuestionModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Edit Question</h2>
            <form onSubmit={handleSaveQuestionEdit} className="form">
              <div className="formGroup">
                <label>Class Level:</label>
                <select name="classLevel" value={editQuestionForm.classLevel} onChange={handleEditQuestionFormChange} required className="select">
                  <option value="">Select Class Level</option>
                  {CLASS_LEVELS.map(level => (<option key={level} value={level}>{level}</option>))}
                </select>
              </div>
              <div className="formGroup">
                <label>Subject:</label>
                <select name="subject" value={editQuestionForm.subject} onChange={handleEditQuestionFormChange} required className="select">
                  <option value="">Select Subject</option>
                  {editQuestionForm.classLevel && availableSubjectsGrouped[editQuestionForm.classLevel]?.map(subject => (
                    <option key={subject._id} value={subject._id}>{subject.subjectName}</option>
                  ))}
                </select>
              </div>
              <div className="formGroup">
                <label>Question Text:</label>
                <textarea name="questionText" value={editQuestionForm.questionText} onChange={handleEditQuestionFormChange} required className="textarea"></textarea>
              </div>
              <div className="formGroup">
                <label>Option A:</label>
                <input type="text" name="optionA" value={editQuestionForm.optionA} onChange={handleEditQuestionFormChange} placeholder="Option A" required className="input" />
              </div>
              <div className="formGroup">
                <label>Option B:</label>
                <input type="text" name="optionB" value={editQuestionForm.optionB} onChange={handleEditQuestionFormChange} placeholder="Option B" required className="input" />
              </div>
              <div className="formGroup">
                <label>Option C:</label>
                <input type="text" name="optionC" value={editQuestionForm.optionC} onChange={handleEditQuestionFormChange} placeholder="Option C" required className="input" />
              </div>
              <div className="formGroup">
                <label>Option D:</label>
                <input type="text" name="optionD" value={editQuestionForm.optionD} onChange={handleEditQuestionFormChange} placeholder="Option D" required className="input" />
              </div>
              <div className="formGroup">
                <label>Correct Option (A, B, C, D):</label>
                <input type="text" name="correctOption" value={editQuestionForm.correctOption} onChange={handleEditQuestionFormChange} maxLength="1" required className="input" />
              </div>
              <div className="modal-actions">
                <button type="submit" className="submitButton">Save</button>
                <button type="button" className="cancelButton" onClick={closeEditQuestionModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                        <label htmlFor={`subject-${subject._id}`} className="checkboxLabel"><strong>{subject.subjectName}</strong></label>
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
              <div className="formGroup checkboxGroup"> {/* ⭐ NEW: isActive checkbox for new exam */}
                <input type="checkbox" id="newExamIsActive" name="isActive" checked={newExam.isActive} onChange={handleExamChange} className="checkbox" />
                <label htmlFor="newExamIsActive" className="checkboxLabel">Make Exam Active Immediately</label>
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
                    <option key={subject._id} value={subject._id}><strong>{subject.subjectName}</strong></option>
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
                    <th>Description</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Transaction Ref</th>
                    <th>Action</th>
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
                      <td>{renderSafeString(payment.description)}</td>
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

      <section className="section">
        <h2 className="sectionHeader">Exam Overview</h2>
        <div className="cardGrid">
          {exams.length > 0 ? (
            exams.map(exam => (
              <div className="adminCard" key={exam._id}>
                <div className="cardTitle">{exam.title}</div>
                <div className="cardDetail"><strong>Class Level:</strong> {exam.classLevel}</div>
                <div className="cardDetail"><strong>Department:</strong> {exam.areaOfSpecialization || 'N/A'}</div>
                <div className="cardDetail"><strong>Duration:</strong> {exam.duration} mins</div>
                <div className="cardDetail"><strong>Branch:</strong> {renderSafeString(exam.branch?.name || exam.branchId?.name)}</div>
                <div className="cardDetail"><strong>Subjects:</strong> {exam.subjectsIncluded.map(s => `${s.subjectName} (${s.numberOfQuestions})`).join(', ')}</div>
                <div className="cardDetail"><strong>Created Date:</strong> {new Date(exam.createdAt).toLocaleDateString()}</div>
                <div className="cardDetail"><strong>Status:</strong> <span className={exam.isActive ? 'active-status' : 'inactive-status'}>{exam.isActive ? 'Active' : 'Inactive'}</span></div> {/* ⭐ NEW: Display Status */}
                <div className="cardActions">
                  <button className="actionButton edit" onClick={() => handleEditExam(exam)} title="Edit Exam">Edit</button>
                  <button
                    className={`actionButton ${exam.isActive ? 'deactivate' : 'activate'}`} // ⭐ NEW: Dynamic class for button
                    onClick={() => handleToggleExamActiveStatus(exam._id, exam.isActive)}
                    title={exam.isActive ? 'Deactivate Exam' : 'Activate Exam'}
                  >
                    {exam.isActive ? 'Deactivate' : 'Activate'} {/* ⭐ NEW: Dynamic button text */}
                  </button>
                  <button className="actionButton delete" onClick={() => handleDeleteExam(exam._id)} title="Delete Exam">Delete</button>
                </div>
              </div>
            ))
          ) : (
            <div>No exams found.</div>
          )}
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allQuestions.length > 0 ? (
                allQuestions.map(q => (
                  <tr key={q._id}>
                    <td>{q.questionText}</td>
                    <td>{q.classLevel}</td>
                    <td>{renderSafeString(q.subject?.subjectName)}</td>
                    <td>
                      {q.options.map((opt, i) => (
                        <div key={i}>{String.fromCharCode(65 + i)}. {opt.text}</div>
                      ))}
                    </td>
                    <td>{String.fromCharCode(65 + q.correctOptionIndex)}</td>
                    <td>
                      <button className="actionButton edit" onClick={() => handleEditQuestion(q)} title="Edit Question">Edit</button>
                      <button className="actionButton delete" onClick={() => handleDeleteQuestion(q._id)} title="Delete Question">Delete</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">No questions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Results Section - Updated to use processedResults and new filters/pagination */}
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
              {/* ⭐ MODIFIED: Use the filtered sections based on the fixed SECTIONS array */}
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
          {/* ⭐ NEW: Date Taken Filter */}
          <div className="formGroup">
            <label htmlFor="resultsDateTaken" className="label">Filter by Date Taken:</label>
            <input
              type="date"
              id="resultsDateTaken"
              value={selectedDateTaken}
              onChange={(e) => setSelectedDateTaken(e.target.value)}
              className="input"
            />
          </div>
          {/* ⭐ NEW: Student ID Filter */}
          <div className="formGroup">
            <label htmlFor="resultsStudentId" className="label">Filter by Student ID:</label>
            <input
              type="text"
              id="resultsStudentId"
              value={studentIdFilter}
              onChange={(e) => setStudentIdFilter(e.target.value)}
              placeholder="Enter Student ID"
              className="input"
            />
          </div>
        </div>

        <button className="submitButton printButton" onClick={() => window.print()} style={{ marginBottom: '1rem' }}>Print Results (Current Page)</button>
        <div className="tableContainer results-printable">
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name of Student</th>
                <th>Exam Name</th>
                <th>Overall Score</th>
                <th>Percentage</th>
                <th>Subject Score</th>
                <th>Date Taken</th>
              </tr>
            </thead>
            <tbody>
              {processedResults.length > 0 ? (
                 processedResults.map((result, index) => (
            <tr key={`${result.studentId}-${result.examTitle}-${index}`}> {/* Unique key */}
                <td>{result.studentId}</td>
                <td>{result.fullName}</td>
                <td>{result.examTitle}</td>
                <td>{`${result.overallScore} / ${result.totalMaxScore}`}</td>
                <td>{result.percentage}</td>
                <td>
                    {/* This will now display the formatted string */}
                    <pre className="subject-scores-pre">{result.formattedSubjectScores}</pre>
                </td>
                <td>{result.dateTaken}</td>
            </tr>
        ))
              ) : (
                <tr>
                  <td colSpan="7">No results found for the selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ⭐ NEW: Pagination Controls */}
        {totalResultsCount > 0 && (
          <div className="paginationControls">
            <button onClick={handlePreviousPage} disabled={currentPage === 1} className="paginationButton">Previous</button>
            <span>Page {currentPage} of {totalPages} ({totalResultsCount} results)</span>
            <button onClick={handleNextPage} disabled={currentPage === totalPages} className="paginationButton">Next</button>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminDashboard;

/* PRINT STYLES - Adjusted for new results table and added general print hiding */
<style>{`
@media print {
  /* Hide everything by default */
  body * {
    visibility: hidden;
  }

  /* Show specific elements for printing */
  .receipt-content-printable.show-for-print,
  .receipt-content-printable.show-for-print *,
  .statement-content-printable.show-for-print,
  .statement-content-printable.show-for-print *,
  .results-printable,
  .results-printable * {
    visibility: visible !important;
  }

  /* Position printable content at the top */
  .receipt-content-printable,
  .statement-content-printable,
  .results-printable {
    position: absolute;
    left: 0;
    top: 0;
    width: 100vw;
    background: #fff;
    z-index: 9999;
    padding: 20px; /* Add some padding for printout */
  }

  /* Specific styles for tables in print view */
  .receipt-content-printable table,
  .statement-content-printable table,
  .results-printable table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
    font-size: 10px; /* Slightly smaller font for tables on print */
  }

  .receipt-content-printable th, .receipt-content-printable td,
  .statement-content-printable th, .statement-content-printable td,
  .results-printable th, .results-printable td {
    border: 1px solid #ccc;
    padding: 3px 6px; /* Adjusted padding for more condensed look */
    text-align: left;
    word-wrap: break-word; /* Ensure long text wraps */
  }

  .results-printable .subject-scores-pre {
    white-space: pre-wrap; /* Preserve whitespace and allow wrapping */
    font-family: inherit; /* Use default font for readability */
    font-size: inherit;
    margin: 0;
  }

  /* Hide elements that should never print */
  .printButton,
  .resultsFilter,
  .header,
  .logoutButton,
  .sectionHeader,
  .sectionDescription,
  .form,
  .formGroup,
  .modal-overlay,
  .cardActions, /* Hide buttons in exam overview when printing */
  .actionButton,
  .updateStatusButton,
  .bank-details-info,
  .filteredPaymentsSection .printButton, /* Hide button if printing whole statement */
  .paymentDetailsCard button, /* Hide buttons in single payment card */
  .paginationControls /* ⭐ NEW: Hide pagination controls for print */
  {
    display: none !important;
  }
}

/* Basic styles for pagination controls (add to your AdminDashboard.css) */
.paginationControls {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 15px;
  font-size: 1.1em;
  color: #333;
}

.paginationButton {
  padding: 8px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s ease;
}

.paginationButton:hover:not(:disabled) {
  background-color: #0056b3;
}

.paginationButton:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
`}</style>