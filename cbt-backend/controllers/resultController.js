// cbt-backend/controllers/resultController.js

const Result = require('../models/Result');
const User = require('../models/User');
const Exam = require('../models/Exam');
const Question = require('../models/Question');

// Helper Function 1: Counts correct answers for each subject from a list of answers
// Input: result.answers (populated with question.subject._id and question.subject.subjectName)
// Output: An object mapping subjectId (string) to { score: number, totalQuestions: number }
const countCorrectAnswersPerSubject = (answers) => {
    const subjectScoresAndCounts = {}; // Key: subjectId (string), Value: { score: number, totalQuestions: number }

    answers.forEach(answer => {
        if (answer.question && answer.question.subject && answer.question.subject._id && answer.question.subject.subjectName) {
            const subjectId = answer.question.subject._id.toString();

            if (!subjectScoresAndCounts[subjectId]) {
                subjectScoresAndCounts[subjectId] = { score: 0, totalQuestions: 0 };
            }
            subjectScoresAndCounts[subjectId].totalQuestions++; // Increment total questions for this subject
            if (answer.isCorrect) {
                subjectScoresAndCounts[subjectId].score++;
            }
        } else {
            console.warn("DEBUG (countCorrectAnswersPerSubject): Skipping answer due to missing question/subject data:", {
                question: answer.question?._id,
                subjectId: answer.question?.subject?._id,
                subjectName: answer.question?.subject?.subjectName,
                isCorrect: answer.isCorrect
            });
        }
    });
    console.log("DEBUG (countCorrectAnswersPerSubject): Raw scores and counts per subject ID:", subjectScoresAndCounts);
    return subjectScoresAndCounts;
};

// Helper Function 2: Combines the counted scores with total questions from exam config
// and calculates overall exam score and percentage.
// Input: result (populated with exam and answers), countedSubjectData (from Helper 1)
// Output: { subject_scores_breakdown: array, calculated_total_score: number, calculated_percentage: number }
const compileFinalSubjectAndOverallScores = (result, countedSubjectData) => {
    const finalSubjectScoresBreakdown = [];
    let calculatedTotalScore = 0; // This will be the sum of correct answers across all subjects answered
    let calculatedTotalQuestionsAttempted = 0; // This will be the sum of all questions answered

    // 1. Process subjects based on the questions actually answered by the student
    // This is the most reliable source for the student's actual performance.
    // We will build the breakdown using the countedSubjectData.
    for (const subjectId in countedSubjectData) {
        if (Object.hasOwnProperty.call(countedSubjectData, subjectId)) {
            const { score, totalQuestions } = countedSubjectData[subjectId];

            // Find the subject name from the populated result.answers
            const subjectNameFromAnswers = result.answers.find(a =>
                a.question?.subject?._id?.toString() === subjectId
            )?.question?.subject?.subjectName || "Unknown Subject";

            finalSubjectScoresBreakdown.push({
                subjectName: subjectNameFromAnswers,
                score: score,
                totalQuestionsInSubject: totalQuestions // Use the actual count from answers
            });

            calculatedTotalScore += score;
            calculatedTotalQuestionsAttempted += totalQuestions;
        }
    }

    // Sort the breakdown for consistent order
    finalSubjectScoresBreakdown.sort((a, b) => a.subjectName.localeCompare(b.subjectName));

    const percentage = calculatedTotalQuestionsAttempted > 0
        ? parseFloat(((calculatedTotalScore / calculatedTotalQuestionsAttempted) * 100).toFixed(2))
        : 0;

    console.log("DEBUG (compileFinalSubjectAndOverallScores): Final Subject Breakdown:", finalSubjectScoresBreakdown);
    console.log("DEBUG (compileFinalSubjectAndOverallScores): Calculated Overall Score (from answers):", calculatedTotalScore);
    console.log("DEBUG (compileFinalSubjectAndOverallScores): Calculated Overall Questions Attempted (from answers):", calculatedTotalQuestionsAttempted);
    console.log("DEBUG (compileFinalSubjectAndOverallScores): Calculated Percentage:", percentage);

    return {
        subject_scores_breakdown: finalSubjectScoresBreakdown,
        calculated_total_score: calculatedTotalScore,
        calculated_percentage: percentage,
        calculated_total_questions_attempted: calculatedTotalQuestionsAttempted // New return value
    };
};


// @desc Get all exam results (for admin/branch admin dashboard) with optional filters
// @route GET /api/results?classLevel=<level>&section=<section>
// @access Private (Admin, Branch Admin)
exports.getAllResults = async (req, res) => {
    try {
        let resultQuery = {}; // Base query for results

        const { classLevel, section } = req.query; // Get filter parameters from query string

        // Build a query for users if classLevel or section filters are provided
        let userFilterQuery = {};
        if (classLevel) {
            userFilterQuery.classLevel = classLevel;
        }
        if (section) {
            userFilterQuery.section = section;
        }

        // If there are user filters, first find the users matching those filters
        if (Object.keys(userFilterQuery).length > 0) {
            const filteredUsers = await User.find(userFilterQuery).select('_id');
            const userIds = filteredUsers.map(user => user._id);

            if (userIds.length === 0) {
                console.log(`DEBUG (getAllResults): No users found for classLevel=${classLevel}, section=${section}. Returning empty results.`);
                return res.status(200).json([]);
            }
            resultQuery.user = { $in: userIds };
            console.log(`DEBUG (getAllResults): Filtering results by User IDs: ${userIds.length} users found for filter.`);
        }

        // Branch Admin Filtering (Existing Logic)
        if (req.user && req.user.role === 'branch_admin' && req.user.branchId) {
            const examsInBranch = await Exam.find({ branchId: req.user.branchId }).select('_id');
            const examIds = examsInBranch.map(exam => exam._id);
            if (examIds.length === 0) {
                console.log(`DEBUG (getAllResults): No exams found for branch ${req.user.branchId}. Returning empty results.`);
                return res.status(200).json([]);
            }
            if (resultQuery.exam) {
                resultQuery.$and = (resultQuery.$and || []).concat({ exam: { $in: examIds } });
            } else {
                resultQuery.exam = { $in: examIds };
            }
            console.log(`DEBUG (getAllResults): Branch Admin (${req.user.fullName}) adding exam filter for branch: ${req.user.branchId}. Exam IDs: ${examIds.length}`);
        }

        // Fetch results with necessary populations for subject-wise scoring
        const results = await Result.find(resultQuery)
            .populate('user', 'fullName studentId classLevel section department')
            .populate({
                path: 'exam',
                select: 'title totalQuestionsCount subjectsIncluded',
                populate: {
                    path: 'subjectsIncluded.subjectId',
                    model: 'Subject',
                    select: 'subjectName _id'
                }
            })
            .populate({
                path: 'answers.question',
                select: 'subject',
                populate: {
                    path: 'subject',
                    select: 'subjectName _id'
                }
            })
            .sort({ createdAt: -1 });

        // Transform results and calculate subject scores for each
        const transformedResults = results.map(result => {
            const countedSubjectData = countCorrectAnswersPerSubject(result.answers);
            const { subject_scores_breakdown, calculated_total_score, calculated_percentage, calculated_total_questions_attempted } = compileFinalSubjectAndOverallScores(result, countedSubjectData);

            return {
                _id: result._id,
                user: result.user ? result.user._id : null,
                student_id: result.user?.studentId || 'N/A',
                student_name: result.user?.fullName || 'Unknown User',
                exam: result.exam ? result.exam._id : null,
                exam_title: result.exam?.title || 'Unknown Exam',
                // Use the calculated total score and percentage based on *answered questions*
                score: calculated_total_score,
                total_questions: calculated_total_questions_attempted, // Use the actual number of questions answered
                percentage: calculated_percentage,
                date_taken: result.dateTaken,
                createdAt: result.createdAt,
                student_classLevel: result.user?.classLevel || 'N/A',
                student_section: result.user?.section || 'N/A',
                student_department: (result.user && result.user.department && result.user.department !== 'N/A')
                    ? result.user.department
                    : (result.exam?.areaOfSpecialization || 'N/A'),
                subject_scores_breakdown: subject_scores_breakdown
            };
        });

        console.log(`DEBUG (getAllResults): Fetched ${transformedResults.length} results after all filters.`);
        res.status(200).json(transformedResults);
    } catch (error) {
        console.error("Error in getAllResults:", error);
        res.status(500).json({ message: 'Server Error fetching all results.' });
    }
};

// @desc Get exam results for the logged-in student
// @route GET /api/results/my
// @access Private (Student)
exports.getUserResults = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'student') {
            console.warn('DEBUG (getUserResults): Non-student user attempting to access /my results.');
            return res.status(403).json({ message: 'Access denied. Only students can view their own results.' });
        }

        const results = await Result.find({ user: req.user.id })
            .populate({
                path: 'exam',
                select: 'title totalQuestionsCount subjectsIncluded',
                populate: {
                    path: 'subjectsIncluded.subjectId',
                    model: 'Subject',
                    select: 'subjectName _id'
                }
            })
            .populate({
                path: 'answers.question',
                select: 'subject',
                populate: {
                    path: 'subject',
                    select: 'subjectName _id'
                }
            })
            .sort({ createdAt: -1 });

        const transformedResults = results.map(result => {
            const countedSubjectData = countCorrectAnswersPerSubject(result.answers);
            const { subject_scores_breakdown, calculated_total_score, calculated_percentage, calculated_total_questions_attempted } = compileFinalSubjectAndOverallScores(result, countedSubjectData);

            return {
                _id: result._id,
                exam_name: result.exam?.title || 'Unknown Exam',
                score: calculated_total_score,
                total_questions: calculated_total_questions_attempted, // Use the actual number of questions answered
                percentage: calculated_percentage,
                date_taken: result.dateTaken,
                answers: result.answers, // You might not need all answers on frontend, but keeping for now
                subject_scores_breakdown: subject_scores_breakdown
            };
        });

        console.log(`DEBUG (getUserResults): Fetched ${transformedResults.length} results for user ${req.user.id}.`);
        res.status(200).json(transformedResults);
    } catch (error) {
        console.error("Error in getUserResults:", error);
        res.status(500).json({ message: 'Server Error fetching user results.' });
    }
};

// @desc Get a single exam result by ID
// @route GET /api/results/:id
// @access Private (Student can view their own, Admin/Branch Admin can view all)
exports.getSingleResult = async (req, res) => {
    try {
        const result = await Result.findById(req.params.id)
            .populate({
                path: 'user',
                select: 'fullName studentId classLevel section department'
            })
            .populate({
                path: 'exam',
                select: 'title totalQuestionsCount subjectsIncluded',
                populate: {
                    path: 'subjectsIncluded.subjectId',
                    model: 'Subject',
                    select: 'subjectName _id'
                }
            })
            .populate({
                path: 'answers.question',
                select: 'questionText options correctOption subject',
                populate: {
                    path: 'subject',
                    select: 'subjectName _id'
                }
            });

        if (!result) {
            return res.status(404).json({ message: 'Result not found.' });
        }

        // Authorization check
        if (req.user.role === 'student' && result.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied. You can only view your own results.' });
        }

        const countedSubjectData = countCorrectAnswersPerSubject(result.answers);
        const { subject_scores_breakdown, calculated_total_score, calculated_percentage, calculated_total_questions_attempted } = compileFinalSubjectAndOverallScores(result, countedSubjectData);

        res.status(200).json({
            _id: result._id,
            user: result.user,
            exam: result.exam,
            score: calculated_total_score,
            totalQuestions: calculated_total_questions_attempted, // Use actual questions answered
            percentage: calculated_percentage,
            answers: result.answers,
            dateTaken: result.dateTaken,
            subject_scores_breakdown: subject_scores_breakdown
        });

    } catch (error) {
        console.error("Error in getSingleResult:", error);
        res.status(500).json({ message: 'Server Error fetching single result.' });
    }
};