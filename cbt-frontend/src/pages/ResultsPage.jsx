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
        const data = await getUserResults(); // REAL API CALL (fetches results for logged-in user)
        setResults(data);
      } catch (err) {
        setError(err.message || 'Failed to load results.');
        console.error("Error fetching user results:", err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) { // Only fetch if a user is logged in
      fetchResults();
    } else {
        setError('No user logged in to view results.');
        setLoading(false);
    }
  }, []); // Depend on currentUser to re-fetch if user changes (e.g., after login/logout)

  if (loading) return <p>Loading results...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div>
      <h1>Your Exam Results</h1>
      {results.length === 0 ? (
        <p>No results found for your exams yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#555' }}>
              <th style={{ padding: '10px', border: '1px solid #666', color: 'white' }}>Exam Name</th>
              <th style={{ padding: '10px', border: '1px solid #666', color: 'white' }}>Score</th>
              <th style={{ padding: '10px', border: '1px solid #666', color: 'white' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result._id} style={{ backgroundColor: '#444', color: 'white' }}>
                <td style={{ padding: '10px', border: '1px solid #666' }}>{result.exam_name}</td>
                <td style={{ padding: '10px', border: '1px solid #666' }}>{result.score} / {result.total_questions}</td>
                <td style={{ padding: '10px', border: '1px solid #666' }}>
                  {result.date_taken ?
                      new Date(result.date_taken).toLocaleDateString() :
                      'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ marginTop: '20px' }}>
        <Link to="/dashboard">Back to Dashboard</Link>
      </p>
    </div>
  );
}

export default ResultsPage;
