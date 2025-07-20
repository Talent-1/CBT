import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ExamInstructions = () => {
    console.log("ExamInstructions component rendered.");
    const { examId } = useParams();
    console.log("useParams returned examId:", examId);

    const navigate = useNavigate();
    const [examDetails, setExamDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedStartSubject, setSelectedStartSubject] = useState('');

    const fetchExamDetails = useCallback(async () => {
        console.log("fetchExamDetails called. Current examId in fetch:", examId);

        if (!examId) {
            console.error("fetchExamDetails: examId is undefined or null. Cannot make API call.");
            setError("Exam ID is missing. Please select an exam from the dashboard.");
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn("No authentication token found. Redirecting to login.");
                navigate('/login');
                return;
            }

            // Log the exact API URL that is being attempted
            console.log("Attempting API call to:", `/api/exams/${examId}/questions`); 
            const config = {
                headers: {
                    'x-auth-token': token
                }
            };

            const res = await axios.get(`/api/exams/${examId}/questions`, config);

            // This console log will show the HTML response you're currently getting
            console.log('API Response for Exam Details:', res.data);

            const examData = res.data.exam || res.data; // Attempt to get exam object

            if (!examData || typeof examData !== 'object' || Array.isArray(examData)) {
                // If the response is not an object (e.g., HTML), set a generic error
                setError('Failed to load exam details: Unexpected response format.');
                setLoading(false);
                setExamDetails(null); // Ensure examDetails is null if response is bad
                return;
            }

            // --- MODIFICATION START ---
            // Remove the specific error check for subjectsIncluded causing the crash.
            // We'll still check for its existence in rendering, but won't stop execution.
            // If subjectsIncluded is missing or not an array, it will simply be treated as empty.
            if (!examData.subjectsIncluded || !Array.isArray(examData.subjectsIncluded)) {
                console.warn("Exam data received, but subjectsIncluded is missing or not an array. Displaying available info.");
                // We won't set a hard error here, just a warning, to allow partial display
                // The rendering logic below will handle the case of missing subjectsIncluded gracefully
            }
            // --- MODIFICATION END ---

            setExamDetails(examData); // Set whatever exam data was received
            setLoading(false);
            setError(null); // Clear any previous error if data is successfully fetched

            // Set initial selected subject to the first one available, if any
            if (examData.subjectsIncluded && examData.subjectsIncluded.length > 0) {
                setSelectedStartSubject(examData.subjectsIncluded[0].subjectId);
            } else {
                setSelectedStartSubject(''); // No subjects, so no initial selection
            }

        } catch (err) {
            console.error('Error fetching exam details:', err.response?.data?.message || err.message, err);
            setError(err.response?.data?.message || 'Failed to load exam instructions. Please try again.');
            setLoading(false);
            if (err.response?.status === 401 || err.response?.status === 403) {
                navigate('/login');
            }
        }
    }, [examId, navigate]);

    useEffect(() => {
        console.log("useEffect triggered in ExamInstructions. examId state in useEffect:", examId);
        if (examId) {
            fetchExamDetails();
        } else {
            console.error("useEffect: examId is undefined or null, not calling fetchExamDetails.");
            setError("Exam ID is missing. Cannot fetch instructions.");
            setLoading(false);
        }
    }, [fetchExamDetails, examId]);

    const handleStartExam = () => {
        if (!selectedStartSubject) {
            setError('Please select a starting subject.');
            return;
        }
        navigate(`/take-exam/${examId}?startSubjectId=${selectedStartSubject}`);
    };

    const handleSubjectChange = (event) => {
        setSelectedStartSubject(event.target.value);
    };

    if (loading) return <p>Loading instructions...</p>;
    if (error) return <p style={{ color: 'red', fontSize: '1.2em', fontWeight: 'bold', textAlign: 'center' }}>{error}</p>;
    // If examDetails is null here, it means the API call failed to return a valid object format
    if (!examDetails) return <p>No exam details found after loading. Please ensure the exam ID is valid and try again.</p>;

    // Calculate total questions safely, even if subjectsIncluded is not an array or empty
    const totalQuestionsCalculated = examDetails.subjectsIncluded?.reduce((sum, subject) => sum + (subject.numberOfQuestions || 0), 0) || 0;
    const displayTotalQuestions = examDetails.totalQuestionsCount || totalQuestionsCalculated;

    return (
        <div className="exam-instructions-container">
            <h1>Examination Instructions - Read All</h1>
            <hr/>

            <div className="available-subjects">
                <p>You have selected, and will be examined on the following subjects;</p>
                {/* --- MODIFICATION START --- */}
                {/* Conditionally render subjectsIncluded only if it's an array and has items */}
                {examDetails.subjectsIncluded && Array.isArray(examDetails.subjectsIncluded) && examDetails.subjectsIncluded.length > 0 ? (
                    <ul>
                        {examDetails.subjectsIncluded.map(subject => (
                            <li key={subject.subjectId}>
                                **{subject.subjectName}** {subject.numberOfQuestions ? ` (${subject.numberOfQuestions} Questions)` : ''}
                            </li>
                        ))}
                    </ul>
                ) : (
                    // Display a fallback message that doesn't cause an error
                    <p style={{ color: 'orange', fontWeight: 'bold' }}>Subject details are not available or not configured for this exam. Please check with an administrator.</p>
                )}
                {/* --- MODIFICATION END --- */}
            </div>
            <hr/>

            <div className="summary-info">
                <p>Practice mode</p>
                <p>Total Number of Questions: **{displayTotalQuestions}**</p>
                <p>Total Time Given: **{examDetails.duration || 'N/A'}** mins</p> {/* Add N/A fallback */}
                {examDetails.areaOfSpecialization && examDetails.areaOfSpecialization !== 'N/A' && (
                    <p>Department: **{examDetails.areaOfSpecialization}**</p>
                )}
            </div>
            <hr/>

            {/* Subject selection dropdown, only show if there are subjects */}
            {examDetails.subjectsIncluded && Array.isArray(examDetails.subjectsIncluded) && examDetails.subjectsIncluded.length > 0 && (
                <div className="subject-switch-section">
                    <label htmlFor="startSubject">Choose your starting subject:</label>
                    <select id="startSubject" value={selectedStartSubject} onChange={handleSubjectChange}>
                        {examDetails.subjectsIncluded.map(subject => (
                            <option key={subject.subjectId} value={subject.subjectId}>
                                {subject.subjectName}
                            </option>
                        ))}
                    </select>
                    <p className="note">You can switch between subjects during the exam.</p>
                </div>
            )}
            <hr/>

            <div className="cbt-instructions">
                <h2>CBT Instructions</h2>
                <p>You will be given {displayTotalQuestions} questions in {examDetails.subjectsIncluded && Array.isArray(examDetails.subjectsIncluded) && examDetails.subjectsIncluded.length > 0 ? examDetails.subjectsIncluded.map(s => s.subjectName).join(', ') : 'various subjects'}. The questions will be presented 1 each in series, starting with your chosen subject. Once you have answered a question, you will be required to click on "Next" to move to the next question and click "Finish" when you are done with all questions. If at any time, you can no longer continue, you can click on "End Exam" to submit your answers.</p>
                <p>You will be given {examDetails.duration || 'N/A'} minutes to answer all {displayTotalQuestions} questions and submit. If at any point, you're unable to finish on time, your exam will be automatically submitted, and you will be shown the summary of your performance.</p>
                <p>Your ranking will be based on a cumulative of all your scores this week and the number of free exams written. The time taken to finish each exam will also be taken into consideration. To start now, click on the "Start Exam" button below...</p>
            </div>
            <hr/>

            <div className="action-buttons">
                <button
                    className="btn btn-primary"
                    onClick={handleStartExam}
                    // Disable if no subjects are found or no total questions, or no selected start subject
                    disabled={
                        !selectedStartSubject || 
                        displayTotalQuestions === 0 ||
                        !examDetails.subjectsIncluded || 
                        examDetails.subjectsIncluded.length === 0
                    }
                >
                    Start Exam
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Change Subjects</button>
                <button className="btn btn-secondary" onClick={() => alert('Change Test Mode logic goes here.')}>Change Test Mode</button>
                <button className="btn btn-danger" onClick={() => navigate('/dashboard')}>Quit</button>
            </div>
        </div>
    );
};

export default ExamInstructions;