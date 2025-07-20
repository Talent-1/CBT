import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUserResults } from '../api/results'; // Import real API function

function ResultsPage() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const currentUser = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const data = await getUserResults(); // REAL API CALL
                setResults(data);
            } catch (err) {
                setError(err.message || 'Failed to load results.');
                console.error("Error fetching user results:", err);
            } finally {
                setLoading(false);
            }
        };
        if (currentUser) {
            fetchResults();
        } else {
            setError('No user logged in to view results.');
            setLoading(false);
        }
    }, [currentUser]); // Depend on currentUser to re-fetch if user changes (e.g., after login/logout)

    if (loading) return <p>Loading results...</p>;
    if (error) return <p className="error-message" style={{ color: 'red' }}>{error}</p>;

    return (
        <div style={{ maxWidth: '900px', margin: '30px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '30px' }}>Your Exam Results</h1>

            {results.length === 0 ? (
                <p style={{ textAlign: 'center', fontSize: '1.1em' }}>No results found for your exams yet.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}> {/* Added overflowX for responsiveness */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#0056b3' }}> {/* Changed header background */}
                                <th style={{ padding: '12px', border: '1px solid #004085', color: 'white', textAlign: 'left' }}>Exam Name</th>
                                <th style={{ padding: '12px', border: '1px solid #004085', color: 'white', textAlign: 'left' }}>Overall Score</th>
                                <th style={{ padding: '12px', border: '1px solid #004085', color: 'white', textAlign: 'left' }}>Percentage</th>
                                <th style={{ padding: '12px', border: '1px solid #004085', color: 'white', textAlign: 'left' }}>Date Taken</th>
                                <th style={{ padding: '12px', border: '1px solid #004085', color: 'white', textAlign: 'left' }}>Subject Scores</th> {/* New column */}
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((result) => (
                                <tr key={result._id} style={{ backgroundColor: '#f4f4f4', color: '#333', borderBottom: '1px solid #ddd' }}> {/* Lighter row background */}
                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{result.exam_name}</td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{result.score} / {result.total_questions}</td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{result.percentage}%</td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                        {result.date_taken ?
                                            new Date(result.date_taken).toLocaleDateString('en-GB') : // Format date for clarity (e.g., DD/MM/YYYY)
                                            'N/A'}
                                    </td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                        {result.subject_scores_breakdown && result.subject_scores_breakdown.length > 0 ? (
                                            <ul style={{ listStyleType: 'none', margin: 0, padding: 0 }}>
                                                {result.subject_scores_breakdown.map((subjectScore, idx) => (
                                                    <li key={idx} style={{ marginBottom: '5px' }}>
                                                        <strong>{subjectScore.subjectName}:</strong> {subjectScore.score} / {subjectScore.totalQuestionsInSubject}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span>N/A</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <p style={{ marginTop: '30px', textAlign: 'center' }}>
                <Link to="/dashboard" style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold' }}>Back to Dashboard</Link>
            </p>
        </div>
    );
}

export default ResultsPage;