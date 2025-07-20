// cbt-frontend/src/components/ExamInstructions.js
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ExamInstructions = () => {
    const { examId } = useParams();
    const navigate = useNavigate();

    // Comprehensive instructions text including malpractice warnings
    const instructions = [
        "Read all instructions carefully before starting the exam.",
        "The exam will be timed. Ensure you complete it within the allotted duration.",
        "You can only submit your answers once.",
        "Ensure you have a stable internet connection throughout the exam.",
        "Do not refresh the page during the exam, as this may lead to loss of progress.",
        "All questions must be attempted before submission."
    ];

    const malpracticeWarnings = [
        "**WARNING ON EXAM MALPRACTICE:** This exam is designed to assess your individual knowledge and understanding.",
        "Any form of **cheating, collusion, or unauthorized assistance** is strictly prohibited.",
        "**Consequences (Present):** Engaging in malpractice will lead to immediate disqualification from this exam, invalidation of your results, and potential suspension or expulsion from the platform/school.",
        "**Consequences (Future):** Records of malpractice can negatively impact your academic future, career prospects, and reputation.",
        "**Integrity is Key:** We encourage you to uphold academic integrity. Your honest efforts reflect your true capabilities and foster a fair learning environment for everyone."
    ];

    const encouragement = [
        "Believe in yourself and your preparation. You have the knowledge to succeed honestly.",
        "Focus solely on your own work. Your true potential shines brightest through integrity.",
        "Good luck! Do your best."
    ];

    const handleStartExam = () => {
        if (examId) {
            navigate(`/exam/${examId}`); // Assuming your route for ExamPage is '/exam/:examId'
        } else {
            alert("Error: Exam ID is missing. Cannot start exam.");
        }
    };

    return (
        <div className="exam-instructions-container" style={{ maxWidth: '800px', margin: '30px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ textAlign: 'center', color: '#333' }}>Examination Instructions</h1>
            <hr style={{ borderColor: '#eee', margin: '20px 0' }}/>

            <div className="cbt-instructions" style={{ marginBottom: '25px' }}>
                <h2 style={{ color: '#0056b3' }}>General Rules</h2>
                <ul style={{ listStyleType: 'disc', paddingLeft: '25px' }}>
                    {instructions.map((instruction, index) => (
                        <li key={index} style={{ marginBottom: '8px', lineHeight: '1.5' }}>{instruction}</li>
                    ))}
                </ul>
            </div>
            <hr style={{ borderColor: '#eee', margin: '20px 0' }}/>

            {/* MODIFICATION HERE: Changed background color to a much lighter yellow */}
            <div className="malpractice-warning" style={{ marginBottom: '25px', padding: '15px', border: '1px solid #ffd700', borderRadius: '5px', backgroundColor: '#fffbe6' }}> {/* Changed from #fffacd to #fffbe6 */}
                <h2 style={{ color: '#cc0000', textAlign: 'center' }}>Strict Warning Against Exam Malpractice</h2>
                <ul style={{ listStyleType: 'none', padding: '0', textAlign: 'left' }}>
                    {malpracticeWarnings.map((warning, index) => (
                        <li key={index} style={{ marginBottom: '8px', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: warning }}></li>
                    ))}
                </ul>
            </div>
            <hr style={{ borderColor: '#eee', margin: '20px 0' }}/>

            {/* MODIFICATION HERE: Changed background color to a much lighter green */}
            <div className="encouragement-message" style={{ marginBottom: '30px', padding: '15px', border: '1px solid #a2e8a2', borderRadius: '5px', backgroundColor: '#e6ffe6' }}> {/* Changed from #f8f9fa to #e6ffe6 */}
                <h2 style={{ color: '#28a745', textAlign: 'center' }}>A Message of Encouragement</h2>
                <ul style={{ listStyleType: 'none', padding: '0', textAlign: 'left' }}>
                    {encouragement.map((message, index) => (
                        <li key={index} style={{ marginBottom: '8px', lineHeight: '1.5' }}>{message}</li>
                    ))}
                </ul>
            </div>
            <hr style={{ borderColor: '#eee', margin: '20px 0' }}/>

            <div className="action-buttons" style={{ textAlign: 'center', marginTop: '20px' }}>
                <button
                    className="btn btn-primary"
                    onClick={handleStartExam}
                    disabled={!examId}
                    style={{ padding: '12px 40px', fontSize: '1.3em', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', transition: 'background-color 0.3s ease' }}
                >
                    Start Exam
                </button>
            </div>
        </div>
    );
};

export default ExamInstructions;