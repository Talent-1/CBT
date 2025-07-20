// ExamInstructions.js (Conceptual)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios'; // Assuming you use axios

const ExamInstructions = () => {
    const { examId } = useParams(); // Get examId from URL params
    const navigate = useNavigate();
    const [examDetails, setExamDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedStartSubject, setSelectedStartSubject] = useState(''); // State for selected starting subject

    useEffect(() => {
        const fetchExamDetails = async () => {
            try {
                const token = localStorage.getItem('token'); // Or wherever you store it
                const config = {
                    headers: {
                        'x-auth-token': token
                    }
                };
                // This endpoint provides subjectsIncluded array from the exam document
                const res = await axios.get(`/api/exams/${examId}/questions`, config);
                setExamDetails(res.data.exam);

                // Set initial selected subject to the first one available, if any
                if (res.data.exam.subjectsIncluded && res.data.exam.subjectsIncluded.length > 0) {
                    // Use subjectId for the value to ensure uniqueness, display subjectName
                    setSelectedStartSubject(res.data.exam.subjectsIncluded[0].subjectId);
                }
                setLoading(false);
            } catch (err) {
                console.error('Error fetching exam details:', err);
                setError('Failed to load exam instructions. Please try again.');
                setLoading(false);
            }
        };

        fetchExamDetails();
    }, [examId]);

    const handleStartExam = () => {
        // Navigate to the actual exam taking page, passing examId AND the selected starting subject ID
        navigate(`/take-exam/${examId}?startSubjectId=${selectedStartSubject}`);
    };

    const handleSubjectChange = (event) => {
        setSelectedStartSubject(event.target.value);
    };

    if (loading) return <p>Loading instructions...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;
    if (!examDetails) return <p>No exam details found.</p>;

    return (
        <div className="exam-instructions-container">
            <h1>Examination Instructions - Read All</h1>
            <hr/>

            <div className="available-subjects"> {/* Changed class name */}
                <p>The following subjects are available for this examination:</p>
                <ul>
                    {examDetails.subjectsIncluded.map(subject => (
                        <li key={subject.subjectId}> {/* Use subjectId for key */}
                            {subject.subjectName}
                            {subject.numberOfQuestions ? ` (${subject.numberOfQuestions} Questions)` : ''}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="summary-info">
                <p>Total Number of Questions: **{examDetails.totalQuestions}**</p>
                <p>Total Time Given: **{examDetails.duration}** mins</p>
            </div>

            <div className="subject-switch-section">
                <label htmlFor="startSubject">Choose your starting subject:</label> {/* Changed label text */}
                <select id="startSubject" value={selectedStartSubject} onChange={handleSubjectChange}>
                    {examDetails.subjectsIncluded.map(subject => (
                        <option key={subject.subjectId} value={subject.subjectId}> {/* Use subjectId for option value */}
                            {subject.subjectName}
                        </option>
                    ))}
                </select>
                <p className="note">You can switch between subjects during the exam.</p>
            </div>

            <div className="cbt-instructions">
                <h2>CBT Instructions</h2>
                <p>You will be given {examDetails.totalQuestions} questions. The questions will be presented 1 each in series, starting with your chosen subject. Once you have answered a question, you will be required to click on "Next" to move to the next question and click "Finish" when you are done with all questions. If at any time, you can no longer continue, you can click on "End Exam" to submit your answers.</p>
                <p>You will be given {examDetails.duration} minutes to answer all {examDetails.totalQuestions} questions and submit. If at any point, you're unable to finish on time, your exam will be automatically submitted, and you will be shown the summary of your performance.</p>
                <p>Your ranking will be based on a cumulative of all your scores this week and the number of free exams written. The time taken to finish each exam will also be taken into consideration. To start now, click on the "Start Exam" button below...</p>
            </div>

            <div className="action-buttons">
                <button className="btn btn-primary" onClick={handleStartExam}>Start Exam</button>
            </div>
        </div>
    );
};

export default ExamInstructions;