// cbt-backend/controllers/resultController.js

const Result = require('../models/Result');
const User = require('../models/User');
const Exam = require('../models/Exam');
const Question = require('../models/Question');

// Helper Function 1: Counts correct answers for each subject from a list of answers
const countCorrectAnswersPerSubject = (answers) => {
    const subjectScores = {}; // Key: subjectId (string), Value: { score: number }

    answers.forEach(answer => {
        // Ensure question and subject are populated and has an _id
        if (answer.question && answer.question.subject && answer.question.subject._id) {
            const subjectId = answer.question.subject._id.toString(); // Convert to string for consistent key usage

            if (!subjectScores[subjectId]) {
                subjectScores[subjectId] = { score: 0 };
            }
            if (answer.isCorrect) {
                subjectScores[subjectId].score++;
            }
        }
    });
    console.log("DEBUG: countedSubjectScores (raw counts):", subjectScores); // ADD THIS LOG
    return subjectScores;
};

// Helper Function 2: Combines the counted scores with total questions from exam config and calculates overall.
const compileFinalSubjectAndOverallScores = (result, countedSubjectScores) => {
    const finalSubjectScoresBreakdown = [];
    let totalExamScore = 0;
    let totalExamQuestions = 0;

    if (result.exam && result.exam.subjectsIncluded) {
        result.exam.subjectsIncluded.forEach(examSubject => {
            const subjectIdFromExamConfig = examSubject._id.toString(); // Ensure string conversion here too
            const subjectName = examSubject.subjectName;
            const totalQuestionsInSubject = examSubject.numberOfQuestions || 0;

            // Retrieve the score using the consistently stringified subject ID
            const scoreForSubject = countedSubjectScores[subjectIdFromExamConfig]
                                   ? countedSubjectScores[subjectIdFromExamConfig].score
                                   : 0;

            finalSubjectScoresBreakdown.push({
                subjectName: subjectName,
                score: scoreForSubject, // This should now correctly reflect the counted score
                totalQuestionsInSubject: totalQuestionsInSubject
            });

            totalExamScore += scoreForSubject; // Sum up for overall score
            totalExamQuestions += totalQuestionsInSubject; // Sum up for overall total questions
        });
    }

    // This section is a fallback for answered questions whose subjects might not be in Exam.subjectsIncluded.
    // However, it's generally best for Exam.subjectsIncluded to be the source of truth for total questions.
    // If you always expect subjects to be in subjectsIncluded, this block can be simplified or removed.
    Object.keys(countedSubjectScores).forEach(subjectId => {
        const alreadyIncludedInBreakdown = finalSubjectScoresBreakdown.some(s => s.subjectName === (result.answers.find(a => a.question.subject._id.toString() === subjectId)?.question.subject.subjectName || ""));
        // We also need to check if the subjectId from countedSubjectScores actually corresponds to one in the exam config
        const isSubjectInExamConfig = result.exam.subjectsIncluded.some(s => s._id.toString() === subjectId);


        if (!alreadyIncludedInBreakdown && !isSubjectInExamConfig) {
            // This case handles a scenario where a question for a subject was answered,
            // but that subject wasn't listed in the exam's 'subjectsIncluded'.
            // This suggests a potential data inconsistency.
            const subjectNameFromAnswer = result.answers.find(a => a.question.subject._id.toString() === subjectId)?.question.subject.subjectName || "Unknown Subject";
            const score = countedSubjectScores[subjectId].score;

            finalSubjectScoresBreakdown.push({
                subjectName: subjectNameFromAnswer,
                score: score,
                totalQuestionsInSubject: 0 // Cannot determine total if not in exam config
            });
            // These scores contribute to overall score but not overall questions count if totalQuestionsInSubject is 0.
            // If the overall score is only meant to be based on 'configured' questions, adjust totalExamScore logic above.
            totalExamScore += score; // Add score from these "unconfigured" subjects to overall score
        }
    });


    const percentage = totalExamQuestions > 0 ? (totalExamScore / totalExamQuestions) * 100 : 0;

    console.log("DEBUG: finalSubjectScoresBreakdown:", finalSubjectScoresBreakdown); // ADD THIS LOG
    console.log("DEBUG: calculated_total_score:", totalExamScore); // ADD THIS LOG
    console.log("DEBUG: calculated_percentage:", percentage); // ADD THIS LOG

    return {
        subject_scores_breakdown: finalSubjectScoresBreakdown,
        calculated_total_score: totalExamScore,
        calculated_percentage: percentage
    };
};

// ... (keep getAllResults, getUserResults, getSingleResult functions as before,
// but ensure they use the new calculated_total_score and calculated_percentage
// as the score and percentage for the final response object, as shown in previous update)