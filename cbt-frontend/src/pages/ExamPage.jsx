// cbt-frontend/src/pages/ExamPage.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getExamQuestions, submitExam } from '../api/exams';

// This import path is correct if ExamPage.css is in src/styles/
import '../styles/ExamPage.css';

function ExamPage() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [exam, setExam] = useState(null);
    const [allQuestions, setAllQuestions] = useState([]);
    const [questionsForCurrentSubject, setQuestionsForCurrentSubject] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const timerRef = useRef(null);

    const [currentSubjectId, setCurrentSubjectId] = useState('');
    const [subjectsMap, setSubjectsMap] = useState({});

    const handleOptionChange = useCallback((questionId, option) => {
        setSelectedAnswers((prevAnswers) => ({
            ...prevAnswers,
            [questionId]: option,
        }));
    }, []);

    const handleNextQuestion = useCallback(() => {
        if (currentQuestionIndex < questionsForCurrentSubject.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    }, [currentQuestionIndex, questionsForCurrentSubject.length]);

    const handlePrevQuestion = useCallback(() => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    }, [currentQuestionIndex]);

    const handleSubmitExam = useCallback(async (isAutoSubmit = false) => {
        clearInterval(timerRef.current);

        if (window.confirm(isAutoSubmit ? "Time's up! Submitting your exam." : 'Are you sure you want to submit your exam?')) {
            try {
                const answersToSubmit = Object.entries(selectedAnswers).map(([questionId, selectedOption]) => ({
                    questionId,
                    selectedOption,
                }));

                const result = await submitExam(examId, answersToSubmit);
                console.log('Exam submitted:', result);
                alert(`Exam submitted! Your score: ${result.score}/${result.totalQuestions}`);
                navigate('/results');

            } catch (err) {
                setError(err.message || 'Failed to submit exam. Please try again.');
                console.error("Submission error:", err);
            }
        }
    }, [examId, navigate, selectedAnswers]);

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
                setAllQuestions(data.questions);

                const initialSubjectsMap = {};
                data.questions.forEach(q => {
                    if (!initialSubjectsMap[q.subjectId]) {
                        initialSubjectsMap[q.subjectId] = {
                            subjectName: q.subjectName || 'Unknown Subject',
                            questions: []
                        };
                    }
                    initialSubjectsMap[q.subjectId].questions.push(q);
                });
                setSubjectsMap(initialSubjectsMap);

                const initialStartSubjectId = searchParams.get('startSubjectId');
                let actualStartSubjectId = '';

                if (initialStartSubjectId && initialSubjectsMap[initialStartSubjectId]) {
                    actualStartSubjectId = initialStartSubjectId;
                } else if (Object.keys(initialSubjectsMap).length > 0) {
                    actualStartSubjectId = Object.keys(initialSubjectsMap)[0];
                }

                setCurrentSubjectId(actualStartSubjectId);
                setQuestionsForCurrentSubject(initialSubjectsMap[actualStartSubjectId]?.questions || []);
                setCurrentQuestionIndex(0);
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
    }, [examId, searchParams]);

    useEffect(() => {
        if (subjectsMap[currentSubjectId]) {
            setQuestionsForCurrentSubject(subjectsMap[currentSubjectId].questions);
            setCurrentQuestionIndex(0);
        } else {
            setQuestionsForCurrentSubject([]);
            setCurrentQuestionIndex(0);
        }
    }, [currentSubjectId, subjectsMap]);

    useEffect(() => {
        if (!loading && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prevTime) => {
                    if (prevTime <= 1) {
                        clearInterval(timerRef.current);
                        handleSubmitExam(true);
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [loading, timeLeft, handleSubmitExam]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            const key = event.key.toLowerCase();
            const currentQuestion = questionsForCurrentSubject[currentQuestionIndex];

            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            if (!currentQuestion) return;

            const optionKeys = ['a', 'b', 'c', 'd'];
            if (optionKeys.includes(key)) {
                const optionValue = key.toUpperCase();
                if (currentQuestion[`option_${key}`] !== undefined) {
                    handleOptionChange(currentQuestion._id, optionValue);
                    event.preventDefault();
                }
            } else if (key === 'p') {
                handlePrevQuestion();
                event.preventDefault();
            } else if (key === 'n') {
                handleNextQuestion();
                event.preventDefault();
            } else if (key === 's' && event.ctrlKey) {
                event.preventDefault();
                handleSubmitExam(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [questionsForCurrentSubject, currentQuestionIndex, handleOptionChange, handlePrevQuestion, handleNextQuestion, handleSubmitExam]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    if (loading) return <p>Loading exam...</p>;
    if (error) return <p className="error-message">{error}</p>;
    if (!exam || allQuestions.length === 0) return <p>Exam not found or no questions available for this exam.</p>;

    const currentQuestion = questionsForCurrentSubject[currentQuestionIndex];
    if (!currentQuestion && questionsForCurrentSubject.length > 0) {
        return <p>Loading question for selected subject...</p>;
    }
    if (!currentQuestion) {
        return <p>No questions found for the selected subject. This might indicate a data issue.</p>;
    }

    return (
        <div className="exam-container">
            <h2>{exam.title}</h2>

            <div className="exam-header">
                <h3>Time Left: {formatTime(timeLeft)}</h3>
                <span>
                    Question {currentQuestionIndex + 1} of {questionsForCurrentSubject.length}
                </span>
            </div>

            {Object.keys(subjectsMap).length > 1 && (
                <div className="subject-select-container">
                    <label htmlFor="subject-select">Switch Subject:</label>
                    <select
                        id="subject-select"
                        value={currentSubjectId}
                        onChange={(e) => setCurrentSubjectId(e.target.value)}
                    >
                        {Object.entries(subjectsMap).map(([sId, sData]) => (
                            <option key={sId} value={sId}>
                                {sData.subjectName} ({sData.questions.length} Qs)
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div className="question-nav-grid">
                {questionsForCurrentSubject.map((q, index) => (
                    <button
                        key={q._id}
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`${selectedAnswers[q._id] ? 'answered' : ''} ${currentQuestionIndex === index ? 'current' : ''}`}
                    >
                        {index + 1}
                    </button>
                ))}
            </div>

            <div className="question-content">
                <p>
                    <strong>{currentQuestionIndex + 1}. {currentQuestion.questionText}</strong>
                </p>
                <div className="options-list">
                    {['A', 'B', 'C', 'D'].map((optionKey) => (
                        <label
                            key={optionKey}
                            className={selectedAnswers[currentQuestion._id] === optionKey ? 'selected-option' : ''}
                        >
                            <input
                                type="radio"
                                name={`question-${currentQuestion._id}`}
                                value={optionKey}
                                checked={selectedAnswers[currentQuestion._id] === optionKey}
                                onChange={() => handleOptionChange(currentQuestion._id, optionKey)}
                            />
                            <span>
                                {currentQuestion[`option_${optionKey.toLowerCase()}`]}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="nav-buttons">
                <button
                    onClick={handlePrevQuestion}
                    disabled={currentQuestionIndex === 0}
                >
                    Previous
                </button>
                {currentQuestionIndex < questionsForCurrentSubject.length - 1 ? (
                    <button
                        onClick={handleNextQuestion}
                    >
                        Next
                    </button>
                ) : (
                    <button
                        onClick={() => handleSubmitExam(false)}
                        className="submit-button"
                    >
                        Submit Exam
                    </button>
                )}
            </div>
        </div>
    );
}

export default ExamPage;