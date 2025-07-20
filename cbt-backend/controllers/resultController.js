// cbt-backend/controllers/resultController.js

const Result = require('../models/Result');
const User = require('../models/User');
const Exam = require('../models/Exam');
const Question = require('../models/Question'); // Ensure this is imported

// Helper function to calculate subject scores breakdown (NO CHANGE TO THIS FUNCTION ITSELF)
const calculateSubjectScores = (result) => {
    const subjectScores = {};

    if (result.exam && result.exam.subjectsIncluded) {
        result.exam.subjectsIncluded.forEach(sub => {
            subjectScores[sub._id.toString()] = {
                subjectName: sub.subjectName, // This expects subjectName to be available in exam.subjectsIncluded
                score: 0,
                totalQuestionsInSubject: sub.numberOfQuestions || 0
            };
        });
    }

    result.answers.forEach(answer => {
        // Crucial: Ensure answer.question.subject has _id AND subjectName
        if (answer.question && answer.question.subject && answer.question.subject._id && answer.question.subject.subjectName) {
            const subjectId = answer.question.subject._id.toString();
            const subjectName = answer.question.subject.subjectName;

            if (!subjectScores[subjectId]) {
                // Fallback for subjects not listed in exam.subjectsIncluded,
                // or if subjectName was missing from exam.subjectsIncluded initially.
                subjectScores[subjectId] = {
                    subjectName: subjectName, // Use subjectName from the question if available
                    score: 0,
                    totalQuestionsInSubject: 0 // Cannot determine total if not in exam.subjectsIncluded
                };
            }

            if (answer.isCorrect) {
                subjectScores[subjectId].score++;
            }
        }
    });

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
        let resultQuery = {};
        const { classLevel, section } = req.query;

        let userFilterQuery = {};
        if (classLevel) userFilterQuery.classLevel = classLevel;
        if (section) userFilterQuery.section = section;

        if (Object.keys(userFilterQuery).length > 0) {
            const filteredUsers = await User.find(userFilterQuery).select('_id');
            const userIds = filteredUsers.map(user => user._id);
            if (userIds.length === 0) return res.status(200).json([]);
            resultQuery.user = { $in: userIds };
        }

        if (req.user && req.user.role === 'branch_admin' && req.user.branchId) {
            const examsInBranch = await Exam.find({ branchId: req.user.branchId }).select('_id');
            const examIds = examsInBranch.map(exam => exam._id);
            if (examIds.length === 0) return res.status(200).json([]);
            if (resultQuery.exam) {
                resultQuery.$and = (resultQuery.$and || []).concat({ exam: { $in: examIds } });
            } else {
                resultQuery.exam = { $in: examIds };
            }
        }

        const results = await Result.find(resultQuery)
            .populate('user', 'fullName studentId classLevel section department')
            .populate({
                path: 'exam',
                select: 'title totalQuestionsCount subjectsIncluded',
                // Populate subjectsIncluded.subjectName if it's a ref in Exam schema
                // If subjectsIncluded is an array of objects *without* a direct Subject ref,
                // you need to ensure the objects themselves already contain subjectName when saved.
                // Assuming 'subjectsIncluded' is an array of objects like { _id: SubjectId, subjectName: 'Name', numberOfQuestions: 5 }
                // This populates the subjectName directly from the Exam document if it's stored there.
                // If it's *only* an ID in subjectsIncluded and needs to be populated, see below.
            })
            .populate({
                path: 'answers.question', // Populate the 'question' field within the 'answers' array
                select: 'subject',      // Only get the 'subject' field from the Question
                populate: {             // Populate the 'subject' field within the Question
                    path: 'subject',
                    select: 'subjectName _id' // <--- THIS IS THE CRUCIAL LINE. Ensure subjectName is selected here.
                }
            })
            .sort({ createdAt: -1 });

        const transformedResults = results.map(result => ({
            _id: result._id,
            user: result.user ? result.user._id : null,
            student_id: result.user?.studentId || 'N/A', // Using optional chaining for cleaner access
            student_name: result.user?.fullName || 'Unknown User',
            exam: result.exam ? result.exam._id : null,
            exam_title: result.exam?.title || 'Unknown Exam',
            score: result.score, // Keep total score
            total_questions: result.exam?.totalQuestionsCount || 0, // Keep total questions
            percentage: result.percentage,
            date_taken: result.dateTaken,
            createdAt: result.createdAt,
            student_classLevel: result.user?.classLevel || 'N/A',
            student_section: result.user?.section || 'N/A',
            student_department: (result.user?.department && result.user.department !== 'N/A')
                ? result.user.department
                : (result.exam?.areaOfSpecialization || 'N/A'),
            subject_scores_breakdown: calculateSubjectScores(result)
        }));

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
            return res.status(403).json({ message: 'Access denied. Only students can view their own results.' });
        }

        const results = await Result.find({ user: req.user.id })
            .populate({
                path: 'exam',
                select: 'title totalQuestionsCount subjectsIncluded'
            })
            .populate({
                path: 'answers.question',
                select: 'subject',
                populate: {
                    path: 'subject',
                    select: 'subjectName _id' // <--- THIS IS THE CRUCIAL LINE. Ensure subjectName is selected here.
                }
            })
            .sort({ createdAt: -1 });

        const transformedResults = results.map(result => ({
            _id: result._id,
            exam_name: result.exam?.title || 'Unknown Exam',
            score: result.score,
            total_questions: result.exam?.totalQuestionsCount || 0,
            percentage: result.percentage,
            date_taken: result.dateTaken,
            answers: result.answers, // Keeping for now, but consider if full answers are needed
            subject_scores_breakdown: calculateSubjectScores(result)
        }));

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
                    select: 'subjectName _id' // <--- THIS IS THE CRUCIAL LINE. Ensure subjectName is selected here.
                }
            });

        if (!result) {
            return res.status(404).json({ message: 'Result not found.' });
        }

        if (req.user.role === 'student' && result.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied. You can only view your own results.' });
        }

        const subjectScoresArray = calculateSubjectScores(result);

        res.status(200).json({
            _id: result._id,
            user: result.user,
            exam: result.exam,
            score: result.score,
            totalQuestions: result.totalQuestions,
            percentage: result.percentage,
            answers: result.answers,
            dateTaken: result.dateTaken,
            subject_scores_breakdown: subjectScoresArray
        });

    } catch (error) {
        console.error("Error in getSingleResult:", error);
        res.status(500).json({ message: 'Server Error fetching single result.' });
    }
};