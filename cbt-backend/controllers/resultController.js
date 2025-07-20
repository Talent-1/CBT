// cbt-backend/controllers/resultController.js

const Result = require('../models/Result');
const User = require('../models/User');
const Exam = require('../models/Exam');
const Question = require('../models/Question'); // Ensure this is imported

// Helper function to calculate subject scores breakdown
const calculateSubjectScores = (result) => {
    const subjectScores = {};

    // 1. Initialize subject scores from the Exam's subjectsIncluded configuration
    // This is the authoritative source for the *total possible questions* per subject.
    if (result.exam && result.exam.subjectsIncluded) {
        result.exam.subjectsIncluded.forEach(sub => {
            // Use subject ID as key for uniqueness, and store name for display
            subjectScores[sub._id.toString()] = {
                subjectName: sub.subjectName,
                score: 0, // Initialize score for this subject
                totalQuestionsInSubject: sub.numberOfQuestions || 0 // Get total questions from exam config
            };
        });
    }

    // 2. Iterate through the user's answers to count correct answers per subject.
    result.answers.forEach(answer => {
        // Ensure question and its subject details are populated
        if (answer.question && answer.question.subject && answer.question.subject._id) {
            const subjectId = answer.question.subject._id.toString();
            const subjectName = answer.question.subject.subjectName;

            // If a subject from an answered question isn't in exam.subjectsIncluded
            // (e.g., due to data inconsistency or changes), add it to the breakdown.
            if (!subjectScores[subjectId]) {
                subjectScores[subjectId] = {
                    subjectName: subjectName,
                    score: 0,
                    totalQuestionsInSubject: 0 // If not in exam config, we can't get total.
                                               // This might indicate a data issue, but we still display what we can.
                };
            }

            // Increment score for this subject if the answer was correct
            if (answer.isCorrect) {
                subjectScores[subjectId].score++;
            }
        }
    });

    // Convert the subjectScores object into an array for easier frontend rendering
    const subjectScoresArray = Object.keys(subjectScores).map(key => ({
        subjectName: subjectScores[key].subjectName,
        score: subjectScores[key].score,
        totalQuestionsInSubject: subjectScores[key].totalQuestionsInSubject
    }));

    return subjectScoresArray;
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
                select: 'title totalQuestionsCount subjectsIncluded' // Ensure subjectsIncluded is populated here
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

        // Transform results and calculate subject scores for each
        const transformedResults = results.map(result => ({
            _id: result._id,
            user: result.user ? result.user._id : null,
            student_id: result.user && result.user.studentId ? result.user.studentId : 'N/A',
            student_name: result.user ? result.user.fullName : 'Unknown User',
            exam: result.exam ? result.exam._id : null,
            exam_title: result.exam ? result.exam.title : 'Unknown Exam',
            score: result.score, // Keep total score
            total_questions: result.exam ? result.exam.totalQuestionsCount : 0, // Keep total questions
            percentage: result.percentage,
            date_taken: result.dateTaken,
            createdAt: result.createdAt,
            student_classLevel: result.user ? result.user.classLevel : 'N/A',
            student_section: result.user ? result.user.section : 'N/A',
            student_department: (result.user && result.user.department && result.user.department !== 'N/A')
                ? result.user.department
                : (result.exam && result.exam.areaOfSpecialization ? result.exam.areaOfSpecialization : 'N/A'),
            subject_scores_breakdown: calculateSubjectScores(result) // Use the helper function
        }));

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

        const transformedResults = results.map(result => ({
            _id: result._id,
            exam_name: result.exam ? result.exam.title : 'Unknown Exam',
            score: result.score, // Keep total score
            total_questions: result.exam ? result.exam.totalQuestionsCount : 0, // Keep total questions
            percentage: result.percentage,
            date_taken: result.dateTaken,
            answers: result.answers, // You might not need all answers on frontend, but keeping for now
            subject_scores_breakdown: calculateSubjectScores(result) // Add the new subject-wise scores
        }));

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
                    select: 'subjectName _id' // Ensure _id is also selected for consistent lookup
                }
            });

        if (!result) {
            return res.status(404).json({ message: 'Result not found.' });
        }

        // Authorization check
        if (req.user.role === 'student' && result.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied. You can only view your own results.' });
        }

        // Calculate subject-wise scores using the helper function
        const subjectScoresArray = calculateSubjectScores(result);

        res.status(200).json({
            _id: result._id,
            user: result.user,
            exam: result.exam,
            score: result.score, // Keep total score
            totalQuestions: result.totalQuestions, // Keep total questions
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