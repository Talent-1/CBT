// cbt-backend/controllers/resultController.js (MOST RECENT VERSION - Added Filtering)
const Result = require('../models/Result');
const User = require('../models/User');
const Exam = require('../models/Exam');

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
                // If no users match the filter, return empty results early
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
            // Use $and if resultQuery already has a 'user' filter, otherwise just assign
            if (resultQuery.exam) {
                 resultQuery.$and = (resultQuery.$and || []).concat({ exam: { $in: examIds } });
            } else {
                resultQuery.exam = { $in: examIds };
            }
            console.log(`DEBUG (getAllResults): Branch Admin (${req.user.fullName}) adding exam filter for branch: ${req.user.branchId}. Exam IDs: ${examIds.length}`);
        }

        // Fetch results with necessary populations
        const results = await Result.find(resultQuery)
            .populate('user', 'fullName studentId classLevel section')
            .populate('exam', 'title totalQuestionsCount')
            .sort({ createdAt: -1 });

        // Transform results to ensure all expected fields are present for frontend display
        const transformedResults = results.map(result => ({
            _id: result._id,
            user: result.user ? result.user._id : null,
            student_name: result.user ? result.user.fullName : 'Unknown User',
            exam: result.exam ? result.exam._id : null,
            exam_title: result.exam ? result.exam.title : 'Unknown Exam',
            score: result.score,
            total_questions: result.exam ? result.exam.totalQuestionsCount : 0,
            percentage: result.percentage,
            date_taken: result.dateTaken,
            createdAt: result.createdAt,
            student_classLevel: result.user ? result.user.classLevel : 'N/A',
            student_section: result.user ? result.user.section : 'N/A'
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
            .populate('exam', 'title totalQuestionsCount')
            .sort({ createdAt: -1 });

        const transformedResults = results.map(result => ({
            _id: result._id,
            exam_name: result.exam ? result.exam.title : 'Unknown Exam',
            score: result.score,
            total_questions: result.exam ? result.exam.totalQuestionsCount : 0,
            percentage: result.percentage,
            date_taken: result.dateTaken,
            answers: result.answers
        }));

        console.log(`DEBUG (getUserResults): Fetched ${transformedResults.length} results for user ${req.user.id}.`);
        res.status(200).json(transformedResults);
    } catch (error) {
        console.error("Error in getUserResults:", error);
        res.status(500).json({ message: 'Server Error fetching user results.' });
    }
};
