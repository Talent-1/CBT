// cbt-backend/controllers/examController.js (MODIFIED - Force ParseInt and Detailed Debugging)
const Exam = require('../models/Exam');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Question = require('../models/Question');
const Subject = require('../models/Subject'); // Correct path
const Result = require('../models/Result');
const mongoose = require('mongoose'); // Import mongoose for ObjectId validation


// --- Helper function to check if a student has a successful payment ---
async function hasSuccessfulPayment(userId, classLevel, branchId) {
    try {
        const recentSuccessfulPayment = await Payment.findOne({
            student: userId,
            status: 'successful',
        }).sort({ paymentDate: -1 });

        return !!recentSuccessfulPayment;
    } catch (error) {
        console.error(`Error checking successful payment for user ${userId}:`, error);
        return false;
    }
}
// --- END Helper function ---


// Example: Get all exams
exports.getAllExams = async (req, res) => {
    try {
        let query = {};
        if (req.user && req.user.role === 'branch_admin' && req.user.branchId) {
            query.branchId = req.user.branchId;
        }

        const exams = await Exam.find(query)
                                .populate('createdBy', 'fullName email role')
                                .populate('branchId', 'name')
                                .populate('subjectsIncluded.subjectId', 'name');

        const transformedExams = exams.map(exam => ({
            ...exam.toObject(),
            subjectsIncluded: exam.subjectsIncluded.map(si => ({
                ...si.toObject(),
                subjectName: si.subjectId ? si.subjectId.name : si.subjectName
            })),
        }));

        res.status(200).json(transformedExams);
    } catch (error) {
        console.error("Error in getAllExams:", error);
        res.status(500).json({ message: 'Server Error fetching exams.' });
    }
};

// Example: Add a new exam (Super Admin Only)
exports.addExam = async (req, res) => {
    console.log('DEBUG (addExam): Received request body:', JSON.stringify(req.body, null, 2)); // Detailed log

    const { title, classLevel, duration, branchId, subjectsIncluded } = req.body;

    try {
        if (!title || !classLevel || !duration || !branchId || !subjectsIncluded || subjectsIncluded.length === 0) {
            console.error('DEBUG (addExam): Validation Error: Missing required exam fields (title, classLevel, duration, branchId, or subjectsIncluded array is empty).');
            return res.status(400).json({ message: 'Please provide all required exam fields: title, class level, duration, branch ID, and at least one subject.' });
        }

        if (!req.user || !req.user.id) {
            console.error('DEBUG (addExam): Authentication Error: User not found or not authenticated.');
            return res.status(401).json({ message: 'Authentication required to create an exam.' });
        }
        console.log('DEBUG (addExam): Basic validation passed.');

        const examQuestions = [];
        let totalQuestionsForExam = 0;

        for (const subjData of subjectsIncluded) {
            const { subjectId } = subjData; // Destructure subjectId
            let { numberOfQuestions } = subjData; // Destructure numberOfQuestions (will be modified)

            console.log(`DEBUG (addExam - loop start): Initial: subjectId=${subjectId}, numberOfQuestions=${numberOfQuestions}, Type: ${typeof numberOfQuestions}`); // Initial loop log

            if (!subjectId) {
                console.error(`DEBUG (addExam): Validation Error: Missing subjectId in subject entry: ${JSON.stringify(subjData)}`);
                return res.status(400).json({ message: 'Each included subject must have a subjectId.' });
            }

            // --- FORCE PARSEINT FOR numberOfQuestions IN BACKEND ---
            const parsedNumQuestions = parseInt(numberOfQuestions, 10);
            console.log(`DEBUG (addExam - loop parse): Parsed: ${parsedNumQuestions}, IsNaN: ${isNaN(parsedNumQuestions)}`);

            if (isNaN(parsedNumQuestions) || parsedNumQuestions < 1) {
                console.error(`DEBUG (addExam): Validation Error: Invalid or missing numberOfQuestions for subjectId ${subjectId}. Value: ${numberOfQuestions} (parsed to ${parsedNumQuestions}), Type: ${typeof numberOfQuestions}. Must be a number >= 1.`);
                return res.status(400).json({ message: `Each included subject must have a valid number of questions (at least 1). Issue with subject ID: ${subjectId}` });
            }
            numberOfQuestions = parsedNumQuestions; // Use the parsed, validated number for further operations
            console.log(`DEBUG (addExam - loop end): After validation: subjectId=${subjectId}, numberOfQuestions=${numberOfQuestions}, Type: ${typeof numberOfQuestions}`);
            // --- END FORCE PARSEINT AND VALIDATION ---

            // Validate if subjectId is a valid MongoDB ObjectId
            if (!mongoose.Types.ObjectId.isValid(subjectId)) {
                console.error(`DEBUG (addExam): Validation Error: Invalid Subject ID format: ${subjectId}`);
                return res.status(400).json({ message: `Invalid Subject ID format provided for ${subjectId}.` });
            }

            // Verify if the Subject actually exists in the database
            const existingSubject = await Subject.findById(subjectId);
            if (!existingSubject) {
                console.error(`DEBUG (addExam): Validation Error: Subject with ID ${subjectId} not found.`);
                return res.status(400).json({ message: `Subject with ID ${subjectId} not found. Please ensure it exists.` });
            }
            console.log(`DEBUG (addExam): Subject ${existingSubject.name} found for ID: ${subjectId}`);


            console.log(`DEBUG (addExam): Querying for questions: { subject: ${subjectId}, classLevel: ${classLevel} }`);
            const availableQuestions = await Question.find({
                subject: subjectId,
                classLevel: classLevel
            });
            console.log(`DEBUG (addExam): Found ${availableQuestions.length} available questions for subject ${subjectId} and class level ${classLevel}.`);


            const selectedSubjQuestions = availableQuestions
                .sort(() => 0.5 - Math.random())
                .slice(0, numberOfQuestions)
                .map(q => q._id);

            if (selectedSubjQuestions.length < numberOfQuestions) {
                console.warn(`DEBUG (addExam): Warning: Not enough questions found for subject ${existingSubject.name} (ID: ${subjectId}) and class level ${classLevel}. Requested ${numberOfQuestions}, found ${selectedSubjQuestions.length}.`);
            }

            examQuestions.push(...selectedSubjQuestions);
            totalQuestionsForExam += selectedSubjQuestions.length;
        }

        if (examQuestions.length === 0) {
            console.error('DEBUG (addExam): Validation Error: No questions found for selected subjects and class level after processing all subjects. This might be due to insufficient questions in the question bank.');
            return res.status(400).json({ message: 'No questions could be found for the selected subjects and class level. Please ensure questions exist for these subjects and class level.' });
        }
        console.log(`DEBUG (addExam): Total questions collected for exam: ${totalQuestionsForExam}`);

        const newExam = new Exam({
            title,
            classLevel,
            duration: parseInt(duration),
            branchId,
            createdBy: req.user.id,
            subjectsIncluded: subjectsIncluded, // Frontend sends this, already validated
            questions: examQuestions, // Array of ObjectIds of selected questions
            totalQuestionsCount: totalQuestionsForExam, // Calculated based on actual questions
        });
        console.log('DEBUG (addExam): New Exam object created, attempting to save:', newExam);

        const savedExam = await newExam.save();
        console.log('DEBUG (addExam): New Exam saved successfully. ID:', savedExam._id);

        const populatedExam = await Exam.findById(savedExam._id)
                                         .populate('createdBy', 'fullName email')
                                         .populate('branchId', 'name')
                                         .populate('subjectsIncluded.subjectId', 'name');
        console.log('DEBUG (addExam): Exam populated successfully.');

        res.status(201).json({ message: 'Exam created successfully', exam: populatedExam });

    } catch (err) {
        console.error('DEBUG (addExam): Error caught in addExam controller:', err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            console.error('DEBUG (addExam): Mongoose Validation Error details:', messages);
            return res.status(400).json({ message: `Validation Error: ${messages.join(', ')}` });
        }
        res.status(500).json({ message: 'Server error while creating exam.', error: err.message });
    }
};

// @route   GET /api/exams/student-exams
// @desc    Get exams for a specific student's class level and branch, WITH PAYMENT ELIGIBILITY
// @access  Private (Student-specific)
exports.getStudentExams = async (req, res) => {
    try {
        const studentUser = req.user;

        if (!studentUser || studentUser.role !== 'student') {
            return res.status(403).json({ message: 'Access denied. Only students can view their exams.' });
        }

        const { classLevel, branchId, id: userId } = studentUser;

        if (!classLevel || !branchId) {
            console.error('Backend: Class level or Branch ID is missing for student user:', studentUser);
            return res.status(400).json({ message: 'Class level and Branch ID are required to fetch exams for this student.' });
        }

        const isPaymentEligible = await hasSuccessfulPayment(userId, classLevel, branchId);
        console.log(`DEBUG: Student ${studentUser.fullName} (ID: ${userId}) is payment eligible: ${isPaymentEligible}`);

        const query = { classLevel: classLevel, branchId: branchId };

        console.log('Backend: Fetching student exams with query:', query);
        const exams = await Exam.find(query)
                               .populate('createdBy', 'fullName')
                               .populate('branchId', 'name')
                               .populate('subjectsIncluded.subjectId', 'name');

        const transformedExams = exams.map(exam => ({
            _id: exam._id,
            title: exam.title,
            subject: exam.subjectsIncluded.map(si => si.subjectId ? si.subjectId.name : si.subjectName).join(', '),
            classLevel: exam.classLevel,
            duration: exam.duration,
            totalQuestions: exam.totalQuestionsCount,
            isPaymentEligibleForExam: isPaymentEligible,
        }));

        console.log(`Backend: Found ${transformedExams.length} exams for class level: ${classLevel}, branchId: ${branchId}.`);
        res.json(transformedExams);

    } catch (err) {
        console.error('Backend: Error fetching student-specific exams:', err.message);
        res.status(500).json({ message: 'Server Error while fetching student exams.' });
    }
};

// @route   GET /api/exams/:examId/questions
// @desc    Get questions for a specific exam - ADD PAYMENT CHECK HERE TOO!
// @access  Private (Students taking the exam)
exports.getExamQuestions = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.examId)
                               .populate({
                                   path: 'questions',
                                   model: 'Question',
                                   populate: {
                                       path: 'subject',
                                       model: 'Subject',
                                       select: 'name'
                                   }
                               });

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        const studentUser = req.user;
        const { classLevel, branchId, id: userId } = studentUser;

        const isPaymentEligible = await hasSuccessfulPayment(userId, classLevel, branchId);
        if (!isPaymentEligible) {
            console.warn(`DEBUG: Student ${studentUser.fullName} (ID: ${userId}) is NOT payment eligible for exam ${exam.title}. Access denied.`);
            return res.status(403).json({ message: 'Payment required to take this exam. Please ensure your fees are paid.' });
        }

        if (studentUser.role !== 'student' ||
            exam.classLevel !== studentUser.classLevel ||
            (exam.branchId && exam.branchId.toString() !== studentUser.branchId.toString())) {
                return res.status(403).json({ message: 'You are not authorized to take this exam.' });
        }

        console.log('Backend DEBUG: Fetched Exam for questions:', exam.title);
        console.log('Backend DEBUG: Number of questions populated for exam:', exam.questions.length);

        const questionsToSend = exam.questions.map(q => {
            const transformedQuestion = {
                _id: q._id,
                questionText: q.questionText,
                subjectName: q.subject ? q.subject.name : 'N/A',
                classLevel: q.classLevel,
            };
            q.options.forEach((option, index) => {
                const optionKeyChar = String.fromCharCode(65 + index);
                transformedQuestion[`option_${optionKeyChar.toLowerCase()}`] = option.text;
            });
            return transformedQuestion;
        });

        console.log('Backend: Sending exam questions for examId:', exam._id);
        console.log('Backend: Questions count:', questionsToSend.length);
        if (questionsToSend.length > 0) {
            console.log('Backend DEBUG: First transformed question sent to frontend:', questionsToSend[0]);
        }

        res.json({
            exam: {
                _id: exam._id,
                title: exam.title,
                classLevel: exam.classLevel,
                duration: exam.duration,
                totalQuestions: exam.totalQuestionsCount,
                subjectsIncluded: exam.subjectsIncluded.map(si => ({
                    subjectId: si.subjectId ? si.subjectId._id : null,
                    subjectName: si.subjectId ? si.subjectId.name : si.subjectName
                }))
            },
            questions: questionsToSend
        });

    } catch (err) {
        console.error('Error fetching exam questions:', err.message);
        console.error(err);
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid Exam ID.' });
        }
        res.status(500).json({ message: 'Server error fetching exam questions.' });
    }
};

// @route   POST /api/exams/:examId/submit
// @desc    Submit an exam
// @access  Private (Student)
exports.submitExam = async (req, res) => {
    try {
        const { examId } = req.params;
        const { answers } = req.body;
        const userId = req.user.id;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ message: 'Invalid answers format.' });
        }

        const exam = await Exam.findById(examId).populate('questions');
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found.' });
        }

        const studentUser = req.user;
        const { classLevel, branchId } = studentUser;

        const isPaymentEligible = await hasSuccessfulPayment(userId, classLevel, branchId);
        if (!isPaymentEligible) {
            console.warn(`DEBUG: Student ${studentUser.fullName} (ID: ${userId}) is NOT payment eligible for exam ${exam.title}. Submission denied.`);
            return res.status(403).json({ message: 'Payment required to submit this exam. Please ensure your fees are paid.' });
        }

        if (studentUser.role !== 'student' ||
            exam.classLevel !== studentUser.classLevel ||
            (exam.branchId && exam.branchId.toString() !== studentUser.branchId.toString())) {
            return res.status(403).json({ message: 'You are not authorized to submit this exam.' });
        }

        let score = 0;
        const totalQuestions = exam.questions.length;
        const resultsDetails = [];

        for (const submittedAnswer of answers) {
            const question = exam.questions.find(q => q._id.toString() === submittedAnswer.questionId);

            if (question) {
                const selectedOptionIndex = submittedAnswer.selectedOption.charCodeAt(0) - 'A'.charCodeAt(0);
                const isCorrect = (selectedOptionIndex === question.correctOptionIndex);

                if (isCorrect) {
                    score++;
                }

                resultsDetails.push({
                    question: question._id,
                    selectedOption: submittedAnswer.selectedOption,
                    correctOption: String.fromCharCode(65 + question.correctOptionIndex),
                    isCorrect: isCorrect
                });
            }
        }

        const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

        const studentResult = new Result({
            user: userId,
            exam: examId,
            score: score,
            totalQuestions: totalQuestions,
            percentage: percentage,
            answers: resultsDetails,
            dateTaken: new Date(),
        });
        await studentResult.save();

        res.status(200).json({
            message: 'Exam submitted successfully!',
            score,
            totalQuestions,
            percentage,
            results: resultsDetails
        });

    } catch (err) {
        console.error('Error submitting exam:', err.message);
        console.error(err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Error: ${messages.join(', ')}` });
        }
        res.status(500).json({ message: 'Server error during exam submission.' });
    }
};
