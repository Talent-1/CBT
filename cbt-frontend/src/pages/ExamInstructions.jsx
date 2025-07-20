// ExamInstructions.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ExamInstructions = () => {
    // ➡️ Add a console log to confirm component rendering and useParams extraction
    console.log("ExamInstructions component rendered.");
    const { examId } = useParams();
    console.log("useParams returned examId:", examId); // 🎯 CRITICAL LOG: Check if this is undefined/null

    const navigate = useNavigate();
    const [examDetails, setExamDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedStartSubject, setSelectedStartSubject] = useState('');

    const fetchExamDetails = useCallback(async () => {
        // ➡️ Add a console log to confirm fetch function is called
        console.log("fetchExamDetails called. Current examId in fetch:", examId); // 🎯 CRITICAL LOG

        // ➡️ Immediate check for examId validity before proceeding
        if (!examId) {
            console.error("fetchExamDetails: examId is undefined or null. Cannot make API call.");
            setError("Exam ID is missing. Please select an exam from the dashboard.");
            setLoading(false);
            return; // Exit if examId is not available
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn("No authentication token found. Redirecting to login.");
                navigate('/login'); // Redirect if no token
                return;
            }

            console.log("Attempting API call to:", `/api/exams/${examId}/questions`); // Log the exact API URL
            const config = {
                headers: {
                    'x-auth-token': token
                }
            };

            const res = await axios.get(`/api/exams/${examId}/questions`, config);

            console.log('API Response for Exam Details:', res.data);

            const examData = res.data.exam || res.data;

            if (!examData) {
                setError('No exam data received from API.'); // More specific error
                setLoading(false);
                return;
            }

            // Ensure subjectsIncluded is an array before setting state
            if (!examData.subjectsIncluded || !Array.isArray(examData.subjectsIncluded)) {
                console.warn("Exam data received, but subjectsIncluded is missing or not an array:", examData.subjectsIncluded);
                setError('Exam data is incomplete: no subjects defined.');
                setLoading(false);
                setExamDetails(examData); // Still set examDetails even if subjects are missing for debugging
                return;
            }

            setExamDetails(examData);

            // Set initial selected subject to the first one available, if any
            if (examData.subjectsIncluded.length > 0) {
                setSelectedStartSubject(examData.subjectsIncluded[0].subjectId);
            } else {
                setError('No subjects defined for this exam.'); // This error will now be displayed by the `if (error)` block
            }
            setLoading(false);
            setError(null); // Clear any previous error if data is successfully fetched
        } catch (err) {
            console.error('Error fetching exam details:', err.response?.data?.message || err.message, err);
            setError(err.response?.data?.message || 'Failed to load exam instructions. Please try again.');
            setLoading(false);
            // Handle specific status codes, e.g., redirect on 401/403
            if (err.response?.status === 401 || err.response?.status === 403) {
                navigate('/login'); // Or to a specific unauthorized page
            }
        }
    }, [examId, navigate]); // Added navigate to dependencies for useCallback

    useEffect(() => {
        // ➡️ Add a console log for useEffect trigger
        console.log("useEffect triggered in ExamInstructions. examId state in useEffect:", examId); // 🎯 CRITICAL LOG
        if (examId) {
            fetchExamDetails();
        } else {
            console.error("useEffect: examId is undefined or null, not calling fetchExamDetails.");
            setError("Exam ID is missing. Cannot fetch instructions.");
            setLoading(false);
        }
    }, [fetchExamDetails, examId]); // Added examId to dependencies for useEffect

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
    if (error) return <p style={{ color: 'red', fontSize: '1.2em', fontWeight: 'bold', textAlign: 'center' }}>{error}</p>; // Highlight error display
    if (!examDetails) return <p>No exam details found after loading. This should not happen if no error.</p>; // Fallback, should be caught by error or loading

    const totalQuestionsCalculated = examDetails.subjectsIncluded?.reduce((sum, subject) => sum + (subject.numberOfQuestions || 0), 0) || 0;
    const displayTotalQuestions = examDetails.totalQuestionsCount || totalQuestionsCalculated; // Prefer explicit totalQuestionsCount from API, fallback to calculated

    return (
        <div className="exam-instructions-container">
            <h1>Examination Instructions - Read All</h1>
            <hr/>

            <div className="available-subjects">
                <p>You have selected, and will be examined on the following subjects;</p> {/* Adjusted phrasing to match "need UI1.png" */}
                {examDetails.subjectsIncluded && examDetails.subjectsIncluded.length > 0 ? (
                    <ul>
                        {examDetails.subjectsIncluded.map(subject => (
                            <li key={subject.subjectId}>
                                **{subject.subjectName}** {subject.numberOfQuestions ? ` (${subject.numberOfQuestions} Questions)` : ''}
                            </li>
                        ))}
                    </ul>
                ) : (
                    // ➡️ This is the fallback message that was showing initially
                    <p style={{ color: 'red', fontWeight: 'bold' }}>No subjects defined for this exam. Please check exam configuration.</p>
                )}
            </div>
            <hr/>

            <div className="summary-info">
                {/* Adjusted phrasing for clarity matching "need UI1.png" */}
                <p>Practice mode</p> {/* If you have a practice mode */}
                <p>Total Number of Questions: **{displayTotalQuestions}**</p>
                <p>Total Time Given: **{examDetails.duration}** mins</p>
                {examDetails.areaOfSpecialization && examDetails.areaOfSpecialization !== 'N/A' && ( // Only show if not N/A
                    <p>Department: **{examDetails.areaOfSpecialization}**</p>
                )}
            </div>
            <hr/>

            {/* Subject selection dropdown, only show if there are subjects */}
            {examDetails.subjectsIncluded && examDetails.subjectsIncluded.length > 0 && (
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
                <p>You will be given {displayTotalQuestions} questions in {examDetails.subjectsIncluded && examDetails.subjectsIncluded.length > 0 ? examDetails.subjectsIncluded.map(s => s.subjectName).join(', ') : 'various subjects'}. The questions will be presented 1 each in series, starting with your chosen subject. Once you have answered a question, you will be required to click on "Next" to move to the next question and click "Finish" when you are done with all questions. If at any time, you can no longer continue, you can click on "End Exam" to submit your answers.</p>
                <p>You will be given {examDetails.duration} minutes to answer all {displayTotalQuestions} questions and submit. If at any point, you're unable to finish on time, your exam will be automatically submitted, and you will be shown the summary of your performance.</p>
                <p>Your ranking will be based on a cumulative of all your scores this week and the number of free exams written. The time taken to finish each exam will also be taken into consideration. To start now, click on the "Start Exam" button below...</p>
            </div>
            <hr/>

            <div className="action-buttons">
                <button
                    className="btn btn-primary"
                    onClick={handleStartExam}
                    disabled={!selectedStartSubject || displayTotalQuestions === 0}
                >
                    Start Exam
                </button>
                {/* Add other buttons as per "needed UI .png" if desired */}
                <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Change Subjects</button> {/* Example */}
                <button className="btn btn-secondary" onClick={() => alert('Change Test Mode logic goes here.')}>Change Test Mode</button> {/* Example */}
                <button className="btn btn-danger" onClick={() => navigate('/dashboard')}>Quit</button> {/* Example */}
            </div>
        </div>
    );
};

export default ExamInstructions;