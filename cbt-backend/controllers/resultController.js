// cbt-backend/controllers/resultController.js

const Result = require('../models/Result');
const User = require('../models/User');
const Exam = require('../models/Exam');
const Question = require('../models/Question'); // Ensure this is imported

// Helper Function 1: Counts correct answers for each subject from a list of answers
// Input: result.answers (populated with question.subject._id and question.subject.subjectName)
// Output: An object mapping subjectId (string) to { score: number }
const countCorrectAnswersPerSubject = (answers) => {
    const subjectScores = {}; // Key: subjectId (string), Value: { score: number }

    answers.forEach(answer => {
        // Ensure question and subject are populated and has an _id and subjectName
        // With the fix in Subject.js, subjectName should now be present.
        if (answer.question && answer.question.subject && answer.question.subject._id && answer.question.subject.subjectName) {
            const subjectId = answer.question.subject._id.toString(); // Convert to string for consistent key usage

            if (!subjectScores[subjectId]) {
                subjectScores[subjectId] = { score: 0 };
            }
            if (answer.isCorrect) {
                subjectScores[subjectId].score++;
            }
        } else {
            // This log will now be less frequent if the Subject.js fix works,
            // but helpful if there's still missing data or population issues.
            console.warn("DEBUG (countCorrectAnswersPerSubject): Skipping answer due to missing question/subject data:", {
                question: answer.question?._id,
                subjectId: answer.question?.subject?._id,
                subjectName: answer.question?.subject?.subjectName,
                isCorrect: answer.isCorrect
            });
        }
    });
    console.log("DEBUG (countCorrectAnswersPerSubject): Raw counts per subject ID:", subjectScores);
    return subjectScores;
};

// Helper Function 2: Combines the counted scores with total questions from exam config
// and calculates overall exam score and percentage.
// Input: result (populated with exam and answers), countedSubjectScores (from Helper 1)
// Output: { subject_scores_breakdown: array, calculated_total_score: number, calculated_percentage: number }
const compileFinalSubjectAndOverallScores = (result, countedSubjectScores) => {
    const finalSubjectScoresBreakdown = [];
    let totalExamScore = 0; // This will be the sum of correct answers for subjects *configured* in the exam
    let totalExamQuestions = 0; // This will be the sum of total questions for subjects *configured* in the exam

    // 1. Process subjects explicitly defined in the Exam's configuration (subjectsIncluded)
    // This is the authoritative source for the *total possible questions* per subject.
if (result.exam && result.exam.subjectsIncluded && Array.isArray(result.exam.subjectsIncluded)) {
        result.exam.subjectsIncluded.forEach(examSubject => {
            // Ensure examSubject.subjectId is populated and has _id, subjectName
            // CHANGE THIS LINE:
            // if (examSubject._id && examSubject.subjectName) {
            // TO THIS:
            if (examSubject.subjectId && typeof examSubject.subjectId === 'object' && examSubject.subjectId._id && examSubject.subjectId.subjectName) {
                const subjectId = examSubject.subjectId._id.toString(); // Get ID from the *populated Subject*
                const subjectName = examSubject.subjectId.subjectName; // Get name from the *populated Subject*
                const totalQuestionsInSubject = examSubject.numberOfQuestions || 0;

                // ... rest of the logic is fine ...
            } else {
                // This warning indicates an issue with Exam model's subjectsIncluded data or its population
                console.warn(`DEBUG (compileFinalSubjectAndOverallScores): Exam subject config incomplete or not populated for exam ${result.exam._id} in subjectsIncluded array:`, examSubject);
            }
        });
    }
    // 2. Add any subjects that were answered but were *not* explicitly listed in exam.subjectsIncluded.
    // This handles data inconsistencies where questions might exist for subjects not formally part of the exam config.
    Object.keys(countedSubjectScores).forEach(subjectId => {
        const isSubjectAlreadyInBreakdown = finalSubjectScoresBreakdown.some(s => {
            // Check if this subjectId (from answers) is already represented in the breakdown
            const originalExamSubject = result.exam?.subjectsIncluded?.find(es => es._id.toString() === subjectId);
            return originalExamSubject ? true : false; // If found in exam config, it's already included
        });

        if (!isSubjectAlreadyInBreakdown) {
            // This means a question for this subject was answered, but the subject
            // was NOT explicitly part of the exam's subjectsIncluded configuration.
            const subjectNameFromAnswer = result.answers.find(a => a.question.subject._id.toString() === subjectId)?.question.subject.subjectName || "Unknown Subject";
            const score = countedSubjectScores[subjectId].score;

            finalSubjectScoresBreakdown.push({
                subjectName: subjectNameFromAnswer,
                score: score,
                totalQuestionsInSubject: 0 // Cannot determine total if not in exam config
            });
            // IMPORTANT: DO NOT add score to totalExamScore or totalExamQuestions here.
            // The overall exam score/percentage should reflect only the *configured* exam.
        }
    });

    const percentage = totalExamQuestions > 0 ? (totalExamScore / totalExamQuestions) * 100 : 0;

    console.log("DEBUG (compileFinalSubjectAndOverallScores): Final Subject Breakdown:", finalSubjectScoresBreakdown);
    console.log("DEBUG (compileFinalSubjectAndOverallScores): Calculated Overall Score:", totalExamScore);
    console.log("DEBUG (compileFinalSubjectAndOverallScores): Calculated Percentage:", percentage);

    return {
        subject_scores_breakdown: finalSubjectScoresBreakdown,
        calculated_total_score: totalExamScore,
        calculated_percentage: percentage
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
    select: 'title totalQuestionsCount subjectsIncluded', // Still select the array
    populate: { // NESTED POPULATE FOR subjectsIncluded.subjectId
        path: 'subjectsIncluded.subjectId', // Path to the reference in the sub-document
        model: 'Subject', // Specify the model if not inferrable (good practice)
        select: 'subjectName _id' // Select the necessary fields from the Subject model
    }
})
            .populate({
                path: 'answers.question', // Populate the 'question' field within the 'answers' array
                select: 'subject',      // Only get the 'subject' field from the Question
                populate: {             // Populate the 'subject' field within the Question
                    path: 'subject',
                    select: 'subjectName _id' // <--- CRUCIAL: Get subjectName and _id from Subject model
                }
            })
            .sort({ createdAt: -1 });

        // Transform results and calculate subject scores for each
        const transformedResults = results.map(result => {
            const countedSubjectScores = countCorrectAnswersPerSubject(result.answers);
            const { subject_scores_breakdown, calculated_total_score, calculated_percentage } = compileFinalSubjectAndOverallScores(result, countedSubjectScores);

            return {
                _id: result._id,
                user: result.user ? result.user._id : null,
                student_id: result.user?.studentId || 'N/A',
                student_name: result.user?.fullName || 'Unknown User',
                exam: result.exam ? result.exam._id : null,
                exam_title: result.exam?.title || 'Unknown Exam',
                // Use the calculated total score and percentage
                score: calculated_total_score,
                total_questions: result.exam?.totalQuestionsCount || 0, // Still use total from exam config
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
    select: 'title totalQuestionsCount subjectsIncluded', // Still select the array
    populate: { // NESTED POPULATE FOR subjectsIncluded.subjectId
        path: 'subjectsIncluded.subjectId', // Path to the reference in the sub-document
        model: 'Subject', // Specify the model if not inferrable (good practice)
        select: 'subjectName _id' // Select the necessary fields from the Subject model
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
            const countedSubjectScores = countCorrectAnswersPerSubject(result.answers);
            const { subject_scores_breakdown, calculated_total_score, calculated_percentage } = compileFinalSubjectAndOverallScores(result, countedSubjectScores);

            return {
                _id: result._id,
                exam_name: result.exam?.title || 'Unknown Exam',
                score: calculated_total_score,
                total_questions: result.exam?.totalQuestionsCount || 0,
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
    select: 'title totalQuestionsCount subjectsIncluded', // Still select the array
    populate: { // NESTED POPULATE FOR subjectsIncluded.subjectId
        path: 'subjectsIncluded.subjectId', // Path to the reference in the sub-document
        model: 'Subject', // Specify the model if not inferrable (good practice)
        select: 'subjectName _id' // Select the necessary fields from the Subject model
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

        const countedSubjectScores = countCorrectAnswersPerSubject(result.answers);
        const { subject_scores_breakdown, calculated_total_score, calculated_percentage } = compileFinalSubjectAndOverallScores(result, countedSubjectScores);

        res.status(200).json({
            _id: result._id,
            user: result.user,
            exam: result.exam,
            score: calculated_total_score, // Use the newly calculated score
            totalQuestions: result.exam?.totalQuestionsCount || 0, // Keep total from exam config
            percentage: calculated_percentage, // Use the newly calculated percentage
            answers: result.answers, // Include detailed answers for review
            dateTaken: result.dateTaken,
            subject_scores_breakdown: subject_scores_breakdown
        });

    } catch (error) {
        console.error("Error in getSingleResult:", error);
        res.status(500).json({ message: 'Server Error fetching single result.' });
    }
};