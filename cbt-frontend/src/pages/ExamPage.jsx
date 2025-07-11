import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExamQuestions, submitExam } from '../api/exams';

function ExamPage() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionId: 'A' }
    const [timeLeft, setTimeLeft] = useState(0); // in seconds
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const timerRef = useRef(null);

    // Memoize stable functions with useCallback
    const handleOptionChange = useCallback((questionId, option) => {
        setSelectedAnswers((prevAnswers) => ({
            ...prevAnswers,
            [questionId]: option,
        }));
    }, []); // No dependencies, as setSelectedAnswers is always stable

    const handleNextQuestion = useCallback(() => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    }, [currentQuestionIndex, questions.length]);

    const handlePrevQuestion = useCallback(() => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    }, [currentQuestionIndex]);

    const handleSubmitExam = useCallback(async (isAutoSubmit = false) => {
        clearInterval(timerRef.current); // Stop the timer

        if (window.confirm(isAutoSubmit ? "Time's up! Submitting your exam." : 'Are you sure you want to submit your exam?')) {
            try {
                const answersToSubmit = Object.entries(selectedAnswers).map(([questionId, selectedOption]) => ({
                    questionId,
                    selectedOption,
                }));

                const result = await submitExam(examId, answersToSubmit);
                console.log('Exam submitted:', result);
                alert(`Exam submitted! Your score: ${result.score}/${result.totalQuestions}`);
                navigate('/results'); // Navigate to a generic results page for the user

            } catch (err) {
                setError(err.message || 'Failed to submit exam. Please try again.');
                console.error("Submission error:", err);
            }
        }
    }, [examId, navigate, selectedAnswers]); // Dependencies for useCallback

    // Fetch exam data and questions
    useEffect(() => {
        const fetchExamData = async () => {
            try {
                if (!examId) {
                    setError('Exam ID is missing.');
                    setLoading(false);
                    return;
                }
                const data = await getExamQuestions(examId);
                setExam(data.exam);
                setQuestions(data.questions);
                setTimeLeft(data.exam.duration * 60);
            } catch (err) {
                setError(err.message || 'Failed to load exam data.');
                console.error("Error fetching exam data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchExamData();

        return () => clearInterval(timerRef.current);
    }, [examId]);

    // Timer logic
    useEffect(() => {
        if (!loading && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prevTime) => {
                    if (prevTime <= 1) {
                        clearInterval(timerRef.current);
                        handleSubmitExam(true); // Auto-submit when time runs out
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
        }

        return () => clearInterval(timerRef.current);
    }, [loading, timeLeft, handleSubmitExam]);

    // Keybinding logic
    useEffect(() => {
        const handleKeyDown = (event) => {
            const key = event.key.toLowerCase();
            const currentQuestion = questions[currentQuestionIndex];
            
            // Prevent interference with input fields if any
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            if (!currentQuestion) return;

            // Handle A, B, C, D for options
            const optionKeys = ['a', 'b', 'c', 'd'];
            if (optionKeys.includes(key)) {
                const optionValue = key.toUpperCase();
                // Check if the option exists (e.g., currentQuestion.option_a)
                if (currentQuestion[`option_${key}`] !== undefined) { 
                    handleOptionChange(currentQuestion._id, optionValue);
                    event.preventDefault(); // Prevent default browser actions if any
                }
            } else if (key === 'p') {
                handlePrevQuestion();
                event.preventDefault(); // Prevent page scrolling
            } else if (key === 'n') {
                handleNextQuestion();
                event.preventDefault(); // Prevent page scrolling
            } else if (key === 's' && event.ctrlKey) { 
                event.preventDefault(); // Prevent browser's save dialog
                handleSubmitExam(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [questions, currentQuestionIndex, handleOptionChange, handlePrevQuestion, handleNextQuestion, handleSubmitExam]);


    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    if (loading) return <p>Loading exam...</p>;
    if (error) return <p className="error-message">{error}</p>;
    if (!exam || !questions || questions.length === 0) return <p>Exam not found or no questions available for this exam.</p>;

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div style={{ textAlign: 'left', maxWidth: '800px', margin: '20px auto', padding: '20px', borderRadius: '10px', backgroundColor: '#2c2c2c', color: '#f0f0f0' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#87CEEB' }}>{exam.title}</h2> 
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '10px', border: '1px solid #666', borderRadius: '5px', backgroundColor: '#3a3a3a' }}>
                <h3 style={{ margin: 0 }}>Time Left: {formatTime(timeLeft)}</h3>
                <span style={{ fontSize: '1.1em' }}>
                    Question {currentQuestionIndex + 1} of {questions.length}
                </span>
            </div>

            {/* Question Navigation List */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '20px',
                padding: '10px',
                border: '1px solid #666',
                borderRadius: '5px',
                backgroundColor: '#3a3a3a',
                justifyContent: 'center'
            }}>
                {questions.map((q, index) => (
                    <button
                        key={q._id}
                        onClick={() => setCurrentQuestionIndex(index)}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            border: `2px solid ${currentQuestionIndex === index ? '#87CEEB' : 'transparent'}`, // Highlight current question with light blue border
                            backgroundColor: selectedAnswers[q._id] ? '#28a745' : '#dc3545', // Green if answered, red if not
                            color: 'white',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: currentQuestionIndex === index ? '0 0 8px #87CEEB' : 'none', // Add subtle glow for current
                            transition: 'background-color 0.3s, border 0.3s, box-shadow 0.3s' // Smooth transitions
                        }}
                    >
                        {index + 1}
                    </button>
                ))}
            </div>

            <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #777', borderRadius: '8px', backgroundColor: '#444' }}>
                <p style={{ fontSize: '1.2em', marginBottom: '15px' }}>
                    <strong>{currentQuestionIndex + 1}. {currentQuestion.questionText}</strong> 
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {['A', 'B', 'C', 'D'].map((optionKey) => (
                        <label key={optionKey} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', backgroundColor: selectedAnswers[currentQuestion._id] === optionKey ? '#555' : 'transparent', padding: '10px', borderRadius: '5px', transition: 'background-color 0.2s' }}>
                            <input
                                type="radio"
                                name={`question-${currentQuestion._id}`}
                                value={optionKey}
                                checked={selectedAnswers[currentQuestion._id] === optionKey}
                                onChange={() => handleOptionChange(currentQuestion._id, optionKey)}
                                style={{ transform: 'scale(1.2)' }}
                            />
                            <span style={{ fontSize: '1.1em' }}>
                                {currentQuestion[`option_${optionKey.toLowerCase()}`]}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <button 
                    onClick={handlePrevQuestion} 
                    disabled={currentQuestionIndex === 0}
                    style={{ padding: '10px 20px', fontSize: '1em', cursor: 'pointer', borderRadius: '5px', border: 'none', backgroundColor: '#007bff', color: 'white' }}
                >
                    Previous
                </button>
                {/* Next button logic remains as per your previous requirement for last question */}
                {currentQuestionIndex < questions.length - 1 ? (
                    <button 
                        onClick={handleNextQuestion}
                        style={{ padding: '10px 20px', fontSize: '1em', cursor: 'pointer', borderRadius: '5px', border: 'none', backgroundColor: '#007bff', color: 'white' }}
                    >
                        Next
                    </button>
                ) : (
                    <button 
                        onClick={() => handleSubmitExam(false)}
                        style={{ padding: '10px 20px', fontSize: '1em', cursor: 'pointer', borderRadius: '5px', border: 'none', backgroundColor: '#28a745', color: 'white' }}
                    >
                        Submit Exam
                    </button>
                )}
            </div>
        </div>
    );
}

export default ExamPage;