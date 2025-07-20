// cbt-backend/controllers/examController.js (MODIFIED - Force ParseInt and Detailed Debugging)
const Exam = require('../models/Exam');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Question = require('../models/Question');
const Subject = require('../models/Subject');
const Result = require('../models/Result');
const mongoose = require('mongoose');

async function hasSuccessfulPayment(userId) {
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

function isSeniorSecondaryClass(classLevel) {
    return ['SS1', 'SS2', 'SS3'].includes(classLevel);
}

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

exports.addExam = async (req, res) => {
    const { title, classLevel, duration, branchId, subjectsIncluded, areaOfSpecialization } = req.body;

    try {
        if (!title || !classLevel || !duration || !branchId || !subjectsIncluded || subjectsIncluded.length === 0) {
            return res.status(400).json({ message: 'Please provide all required exam fields: title, class level, duration, branch ID, and at least one subject.' });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Authentication required to create an exam.' });
        }

        const examQuestions = [];
        let totalQuestionsForExam = 0;

        for (const subjData of subjectsIncluded) {
            const { subjectId } = subjData;
            let { numberOfQuestions } = subjData;

            if (!subjectId) {
                return res.status(400).json({ message: 'Each included subject must have a subjectId.' });
            }

            const parsedNumQuestions = parseInt(numberOfQuestions, 10);
            if (isNaN(parsedNumQuestions) || parsedNumQuestions < 1) {
                return res.status(400).json({ message: `Each included subject must have a valid number of questions (at least 1). Issue with subject ID: ${subjectId}` });
            }
            numberOfQuestions = parsedNumQuestions;

            if (!mongoose.Types.ObjectId.isValid(subjectId)) {
                return res.status(400).json({ message: `Invalid Subject ID format provided for ${subjectId}.` });
            }

            const existingSubject = await Subject.findById(subjectId);
            if (!existingSubject) {
                return res.status(400).json({ message: `Subject with ID ${subjectId} not found. Please ensure it exists.` });
            }

            const availableQuestions = await Question.find({
                subject: subjectId,
                classLevel: classLevel
            });

            const selectedSubjQuestions = availableQuestions
                .sort(() => 0.5 - Math.random())
                .slice(0, numberOfQuestions)
                .map(q => q._id);

            if (selectedSubjQuestions.length < numberOfQuestions) {
                console.warn(`Warning: Not enough questions found for subject ${existingSubject.name} (ID: ${subjectId}) and class level ${classLevel}. Requested ${numberOfQuestions}, found ${selectedSubjQuestions.length}.`);
            }

            examQuestions.push(...selectedSubjQuestions);
            totalQuestionsForExam += selectedSubjQuestions.length;
        }

        if (examQuestions.length === 0) {
            return res.status(400).json({ message: 'No questions could be found for the selected subjects and class level. Please ensure questions exist for these subjects and class level.' });
        }

        const newExam = new Exam({
            title,
            classLevel,
            duration: parseInt(duration),
            branchId,
            createdBy: req.user.id,
            subjectsIncluded: subjectsIncluded,
            questions: examQuestions,
            totalQuestionsCount: totalQuestionsForExam,
            areaOfSpecialization: isSeniorSecondaryClass(classLevel) ? areaOfSpecialization : 'N/A',
        });

        const savedExam = await newExam.save();

        const populatedExam = await Exam.findById(savedExam._id)
            .populate('createdBy', 'fullName email')
            .populate('branchId', 'name')
            .populate('subjectsIncluded.subjectId', 'name');

        res.status(201).json({ message: 'Exam created successfully', exam: populatedExam });

    } catch (err) {
        console.error('Error caught in addExam controller:', err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Error: ${messages.join(', ')}` });
        }
        res.status(500).json({ message: 'Server error while creating exam.', error: err.message });
    }
};

exports.getStudentExams = async (req, res) => {
    try {
        const studentUser = req.user;

        if (!studentUser || studentUser.role !== 'student') {
            return res.status(403).json({ message: 'Access denied. Only students can view their exams.' });
        }

        const { classLevel, branchId, areaOfSpecialization, id: userId } = studentUser;
        const department = req.query.department || areaOfSpecialization;

        if (!classLevel || !branchId) {
            console.error('Backend: Class level or Branch ID is missing for student user:', studentUser);
            return res.status(400).json({ message: 'Class level and Branch ID are required to fetch exams for this student.' });
        }

        const isPaymentEligible = await hasSuccessfulPayment(userId); // Removed classLevel, branchId as they are not used in hasSuccessfulPayment
        console.log(`DEBUG: Student ${studentUser.fullName} (ID: ${userId}) is payment eligible: ${isPaymentEligible}`);

        const query = {
            classLevel: classLevel,
            branchId: branchId
        };

        if (isSeniorSecondaryClass(classLevel)) {
            if (department) {
                query.areaOfSpecialization = department;
                console.log(`Backend: Filtering exams for senior class ${classLevel} by department: ${department}`);
            } else {
                // If senior secondary student has no department, they should not see departmental exams.
                // Assuming senior exams always have areaOfSpecialization set to a specific department string.
                // We set it to a value that won't match any actual department.
                // This ensures that if a senior student has no department, they don't see exams
                // that are explicitly set for "Sciences", "Arts", or "Commercial".
                query.areaOfSpecialization = null; // Or a specific non-matching string like 'NO_DEPARTMENT_MATCH'
                console.warn(`Backend: Senior student ${studentUser.fullName} (${userId}) has no areaOfSpecialization. Filtering for exams with areaOfSpecialization: null.`);
            }
        } else {
            // For non-senior secondary students, only show exams where areaOfSpecialization is 'N/A'
            // (as set by the addExam controller for non-senior exams).
            query.areaOfSpecialization = 'N/A';
            console.log(`Backend: Filtering exams for non-senior class ${classLevel} by areaOfSpecialization: 'N/A'`);
        }

        console.log('Backend: Final query for student exams:', query);
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
            areaOfSpecialization: exam.areaOfSpecialization // Include for debugging/display
        }));

        console.log(`Backend: Found ${transformedExams.length} exams for class level: ${classLevel}, branchId: ${branchId}, department: ${department}`);
        res.json(transformedExams);

    } catch (err) {
        console.error('Backend: Error fetching student-specific exams:', err.message);
        res.status(500).json({ message: 'Server Error while fetching student exams.' });
    }
};

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

        const isPaymentEligible = await hasSuccessfulPayment(userId);
        if (!isPaymentEligible) {
            console.warn(`DEBUG: Student ${studentUser.fullName} (ID: ${userId}) is NOT payment eligible for exam ${exam.title}. Access denied.`);
            return res.status(403).json({ message: 'Payment required to take this exam. Please ensure your fees are paid.' });
        }

        if (studentUser.role !== 'student' ||
            exam.classLevel !== studentUser.classLevel ||
            (exam.branchId && exam.branchId.toString() !== studentUser.branchId.toString())) {
            return res.status(403).json({ message: 'You are not authorized to take this exam.' });
        }

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

        const isPaymentEligible = await hasSuccessfulPayment(userId);
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

exports.deleteExam = async (req, res) => {
    try {
        const { examId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(examId)) {
            return res.status(400).json({ message: 'Invalid Exam ID.' });
        }
        const deletedExam = await Exam.findByIdAndDelete(examId);
        if (!deletedExam) {
            return res.status(404).json({ message: 'Exam not found.' });
        }
        res.status(200).json({ message: 'Exam deleted successfully.' });
    } catch (err) {
        console.error('Error deleting exam:', err);
        res.status(500).json({ message: 'Server error deleting exam.' });
    }
};

exports.updateExam = async (req, res) => {
    try {
        const { examId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(examId)) {
            return res.status(400).json({ message: 'Invalid Exam ID.' });
        }
        const updateData = req.body;
        const updatedExam = await Exam.findByIdAndUpdate(examId, updateData, { new: true })
            .populate('createdBy', 'fullName email role')
            .populate('branchId', 'name')
            .populate('subjectsIncluded.subjectId', 'name');
        if (!updatedExam) {
            return res.status(404).json({ message: 'Exam not found.' });
        }
        res.status(200).json({ message: 'Exam updated successfully.', exam: updatedExam });
    } catch (err) {
        console.error('Error updating exam:', err);
        res.status(500).json({ message: 'Server error updating exam.' });
    }
};