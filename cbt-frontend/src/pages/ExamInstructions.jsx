// ExamInstructions.js
import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ExamInstructions = () => {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [examDetails, setExamDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedStartSubject, setSelectedStartSubject] = useState('');

    // Memoize the fetch function to prevent unnecessary re-creations
    const fetchExamDetails = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const config = {
                headers: {
                    'x-auth-token': token
                }
            };
            // This endpoint provides subjectsIncluded array from the exam document
            const res = await axios.get(`/api/exams/${examId}/questions`, config); // Ensure this endpoint returns the full exam object with subjectsIncluded
            
            // Log the response to verify its structure
            console.log('API Response for Exam Details:', res.data); 

            // Assuming res.data contains the exam object directly or as res.data.exam
            const examData = res.data.exam || res.data; 
            
            if (!examData) {
                setError('No exam data received.');
                setLoading(false);
                return;
            }

            setExamDetails(examData);

            // Set initial selected subject to the first one available, if any
            if (examData.subjectsIncluded && examData.subjectsIncluded.length > 0) {
                setSelectedStartSubject(examData.subjectsIncluded[0].subjectId);
            } else {
                setError('No subjects defined for this exam.');
            }
            setLoading(false);
        } catch (err) {
            console.error('Error fetching exam details:', err.response?.data?.message || err.message, err);
            setError(err.response?.data?.message || 'Failed to load exam instructions. Please try again.');
            setLoading(false);
        }
    }, [examId]); // Depend on examId

    useEffect(() => {
        fetchExamDetails();
    }, [fetchExamDetails]); // Depend on the memoized fetchExamDetails

    const handleStartExam = () => {
        // Ensure a subject is selected before starting
        if (!selectedStartSubject) {
            setError('Please select a starting subject.');
            return;
        }
        // Navigate to the actual exam taking page, passing examId AND the selected starting subject ID
        navigate(`/take-exam/${examId}?startSubjectId=${selectedStartSubject}`);
    };

    const handleSubjectChange = (event) => {
        setSelectedStartSubject(event.target.value);
    };

    if (loading) return <p>Loading instructions...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;
    if (!examDetails) return <p>No exam details found.</p>;

    // Calculate total questions from subjectsIncluded, if totalQuestions is not directly available
    const totalQuestionsCalculated = examDetails.subjectsIncluded?.reduce((sum, subject) => sum + (subject.numberOfQuestions || 0), 0) || 0;
    const displayTotalQuestions = examDetails.totalQuestions || totalQuestionsCalculated; // Prefer explicit totalQuestions from API, fallback to calculated


    return (
        <div className="exam-instructions-container">
            <h1>Examination Instructions - Read All</h1>
            <hr/>

            <div className="available-subjects">
                <p>The following subjects are available for this examination:</p>
                {examDetails.subjectsIncluded && examDetails.subjectsIncluded.length > 0 ? (
                    <ul>
                        {examDetails.subjectsIncluded.map(subject => (
                            <li key={subject.subjectId}>
                                **{subject.subjectName}** {subject.numberOfQuestions ? ` (${subject.numberOfQuestions} Questions)` : ''}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No subjects listed for this exam.</p>
                )}
            </div>
            <hr/>

            <div className="summary-info">
                <p>Total Number of Questions: **{displayTotalQuestions}**</p>
                <p>Total Time Given: **{examDetails.duration}** mins</p>
                {examDetails.areaOfSpecialization && (
                    <p>Department: **{examDetails.areaOfSpecialization}**</p>
                )}
            </div>
            <hr/>

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
                <p>You will be given {displayTotalQuestions} questions. The questions will be presented 1 each in series, starting with your chosen subject. Once you have answered a question, you will be required to click on "Next" to move to the next question and click "Finish" when you are done with all questions. If at any time, you can no longer continue, you can click on "End Exam" to submit your answers.</p>
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
            </div>
        </div>
    );
};

export default ExamInstructions;