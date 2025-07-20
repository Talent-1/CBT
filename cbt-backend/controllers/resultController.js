// cbt-backend/controllers/resultController.js

const Result = require('../models/Result');
const User = require('../models/User');
const Exam = require('../models/Exam');
const Question = require('../models/Question'); // Make sure to import your Question model

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
            // Add branch-specific exam filter to the resultQuery
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
                select: 'title totalQuestionsCount subjectsIncluded'
            })
            .populate({
                path: 'answers.question', // Populate the 'question' field within the 'answers' array
                select: 'subject',      // Only get the 'subject' field from the Question
                populate: {             // Populate the 'subject' field within the Question
                    path: 'subject',
                    select: 'subjectName _id' // Get subjectName and _id from Subject model
                }
            })
            .sort({ createdAt: -1 });

        // Transform results to ensure all expected fields are present for frontend display
        const transformedResults = results.map(result => {
            const subjectScores = {}; // To store scores for each subject

            // Initialize subject scores based on the exam's subjectsIncluded
            if (result.exam && result.exam.subjectsIncluded) {
                result.exam.subjectsIncluded.forEach(sub => {
                    subjectScores[sub.subjectName] = {
                        score: 0,
                        totalQuestionsInSubject: sub.numberOfQuestions || 0, // Get expected questions from exam config
                        subjectId: sub._id // Store subject ID for consistency
                    };
                });
            }

            // Calculate score per subject from answers
            result.answers.forEach(answer => {
                if (answer.question && answer.question.subject && answer.question.subject.subjectName) {
                    const subjectName = answer.question.subject.subjectName;
                    if (!subjectScores[subjectName]) {
                        // This case handles questions that might not be in subjectsIncluded or if config is off
                        subjectScores[subjectName] = { score: 0, totalQuestionsInSubject: 0, subjectId: answer.question.subject._id };
                    }
                    if (answer.isCorrect) {
                        subjectScores[subjectName].score++;
                    }
                    // For totalQuestionsInSubject: if not from config, infer from answered questions
                    // If exam.subjectsIncluded has numberOfQuestions, prefer that.
                    // Otherwise, we might need to count questions linked to this subject in the exam.
                    // For simplicity now, we rely on exam.subjectsIncluded.numberOfQuestions or just actual answered questions.
                    if (!result.exam || !result.exam.subjectsIncluded || !result.exam.subjectsIncluded.find(s => s.subjectName === subjectName)) {
                        subjectScores[subjectName].totalQuestionsInSubject++; // Fallback if not defined in exam config
                    }
                }
            });

            // Convert subjectScores object to an array for frontend
            const subjectScoresArray = Object.keys(subjectScores).map(key => ({
                subjectName: key,
                score: subjectScores[key].score,
                totalQuestionsInSubject: subjectScores[key].totalQuestionsInSubject
            }));


            return {
                _id: result._id,
                user: result.user ? result.user._id : null,
                student_id: result.user && result.user.studentId ? result.user.studentId : 'N/A',
                student_name: result.user ? result.user.fullName : 'Unknown User',
                exam: result.exam ? result.exam._id : null,
                exam_title: result.exam ? result.exam.title : 'Unknown Exam',
                score: result.score,
                total_questions: result.exam ? result.exam.totalQuestionsCount : 0,
                percentage: result.percentage,
                date_taken: result.dateTaken,
                createdAt: result.createdAt,
                student_classLevel: result.user ? result.user.classLevel : 'N/A',
                student_section: result.user ? result.user.section : 'N/A',
                student_department: (result.user && result.user.department && result.user.department !== 'N/A')
                    ? result.user.department
                    : (result.exam && result.exam.areaOfSpecialization ? result.exam.areaOfSpecialization : 'N/A'),
                // Added subject_name (first subject) - now less relevant if we have full breakdown
                // subject_name: (result.exam && result.exam.subjectsIncluded && result.exam.subjectsIncluded.length > 0 && result.exam.subjectsIncluded[0].subjectName) ? result.exam.subjectsIncluded[0].subjectName : 'N/A',
                subject_scores_breakdown: subjectScoresArray // New field for subject-wise scores
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
                select: 'title totalQuestionsCount subjectsIncluded' // Ensure subjectsIncluded is populated
            })
            .populate({
                path: 'answers.question', // Populate the 'question' field within the 'answers' array
                select: 'subject',      // Only get the 'subject' field from the Question
                populate: {             // Populate the 'subject' field within the Question
                    path: 'subject',
                    select: 'subjectName _id' // Get subjectName and _id from Subject model
                }
            })
            .sort({ createdAt: -1 });

        const transformedResults = results.map(result => {
            const subjectScores = {}; // Object to hold scores for each subject

            // Initialize subject scores based on the exam's subjectsIncluded
            if (result.exam && result.exam.subjectsIncluded) {
                result.exam.subjectsIncluded.forEach(sub => {
                    subjectScores[sub.subjectName] = {
                        score: 0,
                        totalQuestionsInSubject: sub.numberOfQuestions || 0 // Get expected questions from exam config
                    };
                });
            }

            // Iterate through answers to calculate score per subject
            result.answers.forEach(answer => {
                // Ensure question and subject info are populated
                if (answer.question && answer.question.subject && answer.question.subject.subjectName) {
                    const subjectName = answer.question.subject.subjectName;
                    if (!subjectScores[subjectName]) {
                        // This handles cases where a question might be answered for a subject not listed in subjectsIncluded
                        // or if initial config for subjectsIncluded was missing.
                        subjectScores[subjectName] = { score: 0, totalQuestionsInSubject: 0 };
                    }
                    if (answer.isCorrect) {
                        subjectScores[subjectName].score++;
                    }
                    // Increment totalQuestionsInSubject for questions actually answered, if not explicitly defined by exam config
                    // This is a fallback to ensure we count all questions that were part of the exam if numberOfQuestions is not reliable.
                    if (!result.exam || !result.exam.subjectsIncluded || !result.exam.subjectsIncluded.find(s => s.subjectName === subjectName)) {
                         subjectScores[subjectName].totalQuestionsInSubject++; // Only increment if not from exam config
                    }
                }
            });

            // Convert the subjectScores object into an array for easier rendering
            const subjectScoresArray = Object.keys(subjectScores).map(key => ({
                subjectName: key,
                score: subjectScores[key].score,
                totalQuestionsInSubject: subjectScores[key].totalQuestionsInSubject
            }));

            return {
                _id: result._id,
                exam_name: result.exam ? result.exam.title : 'Unknown Exam',
                score: result.score,
                total_questions: result.exam ? result.exam.totalQuestionsCount : 0,
                percentage: result.percentage,
                date_taken: result.dateTaken,
                answers: result.answers, // You might not need all answers on frontend, but keeping for now
                subject_scores_breakdown: subjectScoresArray // Add the new subject-wise scores
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
                select: 'title totalQuestionsCount subjectsIncluded'
            })
            .populate({
                path: 'answers.question',
                select: 'questionText options correctOption subject',
                populate: {
                    path: 'subject',
                    select: 'subjectName'
                }
            });

        if (!result) {
            return res.status(404).json({ message: 'Result not found.' });
        }

        // Authorization check
        if (req.user.role === 'student' && result.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied. You can only view your own results.' });
        }

        // Calculate subject-wise scores for single result as well
        const subjectScores = {};
        if (result.exam && result.exam.subjectsIncluded) {
            result.exam.subjectsIncluded.forEach(sub => {
                subjectScores[sub.subjectName] = {
                    score: 0,
                    totalQuestionsInSubject: sub.numberOfQuestions || 0
                };
            });
        }

        result.answers.forEach(answer => {
            if (answer.question && answer.question.subject && answer.question.subject.subjectName) {
                const subjectName = answer.question.subject.subjectName;
                if (!subjectScores[subjectName]) {
                    subjectScores[subjectName] = { score: 0, totalQuestionsInSubject: 0 };
                }
                if (answer.isCorrect) {
                    subjectScores[subjectName].score++;
                }
                if (!result.exam || !result.exam.subjectsIncluded || !result.exam.subjectsIncluded.find(s => s.subjectName === subjectName)) {
                    subjectScores[subjectName].totalQuestionsInSubject++;
                }
            }
        });

        const subjectScoresArray = Object.keys(subjectScores).map(key => ({
            subjectName: key,
            score: subjectScores[key].score,
            totalQuestionsInSubject: subjectScores[key].totalQuestionsInSubject
        }));

        res.status(200).json({
            _id: result._id,
            user: result.user,
            exam: result.exam,
            score: result.score,
            totalQuestions: result.totalQuestions,
            percentage: result.percentage,
            answers: result.answers, // Include detailed answers for review
            dateTaken: result.dateTaken,
            subject_scores_breakdown: subjectScoresArray // Add subject-wise scores
        });

    } catch (error) {
        console.error("Error in getSingleResult:", error);
        res.status(500).json({ message: 'Server Error fetching single result.' });
    }
};