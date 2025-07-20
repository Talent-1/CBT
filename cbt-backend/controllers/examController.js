// cbt-backend/controllers/examController.js

const Exam = require('../models/Exam');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Question = require('../models/Question');
const Subject = require('../models/Subject');
const Result = require('../models/Result');
const mongoose = require('mongoose');

// Helper function to check if a student has a successful payment
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

// Helper function to check if a class level is senior secondary
function isSeniorSecondaryClass(classLevel) {
    return ['SS1', 'SS2', 'SS3'].includes(classLevel);
}

// Get all exams (for admin dashboards)
exports.getAllExams = async (req, res) => {
    try {
        let query = {};
        // Filter exams by branch if the user is a branch_admin
        if (req.user && req.user.role === 'branch_admin' && req.user.branchId) {
            query.branchId = req.user.branchId;
        }

        const exams = await Exam.find(query)
            .populate('createdBy', 'fullName email role')
            .populate('branchId', 'name')
            .populate('subjectsIncluded.subjectId', 'name'); // Good: Populating subject name

        const transformedExams = exams.map(exam => {
            console.log("DEBUG(getAllExams): Processing exam:", exam.title, "(ID:", exam._id, ")"); // Debug line
            const transformedSubjectsIncluded = exam.subjectsIncluded.map(si => {
                console.log("DEBUG(getAllExams): Current subjectsIncluded entry (si):", si); // Debug line
                console.log("DEBUG(getAllExams): Type of si.subjectId:", typeof si.subjectId); // Debug line
                if (si.subjectId && typeof si.subjectId === 'object') { // Check if populated object
                    console.log("DEBUG(getAllExams): Populated si.subjectId.name:", si.subjectId.name); // Debug line
                } else {
                    console.log("DEBUG(getAllExams): si.subjectId is NOT a populated object or is null/undefined:", si.subjectId); // Debug line
                }
                console.log("DEBUG(getAllExams): Denormalized si.subjectName (from Exam doc):", si.subjectName); // Debug line

                return {
                    ...si.toObject(),
                    // Add a more robust fallback for subjectName to prevent crashes
                    subjectName: (si.subjectId && typeof si.subjectId === 'object' && si.subjectId.name)
                                 ? si.subjectId.name // Use populated name if available and valid object
                                 : (si.subjectName || 'Unknown Subject') // Fallback to denormalized name, then a generic string
                };
            });
            return {
                ...exam.toObject(),
                subjectsIncluded: transformedSubjectsIncluded,
            };
        });

        console.log(`DEBUG(getAllExams): Successfully transformed ${transformedExams.length} exams.`); // Debug line
        res.status(200).json(transformedExams);
    } catch (error) {
        console.error("CRITICAL ERROR in getAllExams:", error.message); // Improved error logging
        res.status(500).json({ message: 'Server Error fetching exams.', error: error.message }); // Send error message to frontend
    }
};

// Add a new exam
exports.addExam = async (req, res) => {
    const { title, classLevel, duration, branchId, subjectsIncluded, areaOfSpecialization } = req.body;

    try {
        // Basic validation for required fields
        if (!title || !classLevel || !duration || !branchId || !subjectsIncluded || subjectsIncluded.length === 0) {
            return res.status(400).json({ message: 'Please provide all required exam fields: title, class level, duration, branch ID, and at least one subject.' });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Authentication required to create an exam.' });
        }

        console.log("DEBUG(addExam): Received subjectsIncluded from request body:", subjectsIncluded); // Debug line

        const examQuestions = [];
        let totalQuestionsForExam = 0;

        // Loop through each subject included in the exam
        for (const subjData of subjectsIncluded) {
            const { subjectId } = subjData;
            let { numberOfQuestions } = subjData;

            if (!subjectId) {
                return res.status(400).json({ message: 'Each included subject must have a subjectId.' });
            }

            // Ensure numberOfQuestions is a valid positive integer
            const parsedNumQuestions = parseInt(numberOfQuestions, 10);
            if (isNaN(parsedNumQuestions) || parsedNumQuestions < 1) {
                return res.status(400).json({ message: `Each included subject must have a valid number of questions (at least 1). Issue with subject ID: ${subjectId}` });
            }
            numberOfQuestions = parsedNumQuestions;

            // Validate Subject ID format and existence
            if (!mongoose.Types.ObjectId.isValid(subjectId)) {
                return res.status(400).json({ message: `Invalid Subject ID format provided for ${subjectId}.` });
            }
            const existingSubject = await Subject.findById(subjectId);
            if (!existingSubject) {
                return res.status(400).json({ message: `Subject with ID ${subjectId} not found. Please ensure it exists.` });
            }

            // Fetch questions for the current subject and class level, then select a random subset
            const availableQuestions = await Question.find({
                subject: subjectId,
                classLevel: classLevel
            });

            const selectedSubjQuestions = availableQuestions
                .sort(() => 0.5 - Math.random()) // Randomize order
                .slice(0, numberOfQuestions) // Select the required number
                .map(q => q._id);

            // Warn if not enough questions are found
            if (selectedSubjQuestions.length < numberOfQuestions) {
                console.warn(`Warning: Not enough questions found for subject ${existingSubject.name} (ID: ${subjectId}) and class level ${classLevel}. Requested ${numberOfQuestions}, found ${selectedSubjQuestions.length}.`);
            }

            examQuestions.push(...selectedSubjQuestions);
            totalQuestionsForExam += selectedSubjQuestions.length;
        }

        // Ensure at least some questions were compiled for the exam
        if (examQuestions.length === 0) {
            return res.status(400).json({ message: 'No questions could be found for the selected subjects and class level. Please ensure questions exist for these subjects and class level.' });
        }

        // Create the new exam document
        const newExam = new Exam({
            title,
            classLevel,
            duration: parseInt(duration),
            branchId,
            createdBy: req.user.id,
            subjectsIncluded: subjectsIncluded, // subjectsIncluded from req.body is an array of { subjectId, numberOfQuestions }
            questions: examQuestions,
            totalQuestionsCount: totalQuestionsForExam,
            // Assign areaOfSpecialization only for senior secondary exams
            areaOfSpecialization: isSeniorSecondaryClass(classLevel) ? areaOfSpecialization : 'N/A',
        });

        console.log("DEBUG(addExam): New Exam object before saving:", newExam); // Debug line

        const savedExam = await newExam.save();

        // Populate related fields for the response
        const populatedExam = await Exam.findById(savedExam._id)
            .populate('createdBy', 'fullName email')
            .populate('branchId', 'name')
            .populate('subjectsIncluded.subjectId', 'name'); // Good: Populating subject name

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

// Get exams for a specific student's class level and branch, with payment eligibility check
exports.getStudentExams = async (req, res) => {
    try {
        const studentUser = req.user;

        // Ensure the authenticated user is a student
        if (!studentUser || studentUser.role !== 'student') {
            return res.status(403).json({ message: 'Access denied. Only students can view their exams.' });
        }

        // Destructure necessary fields directly from the studentUser object
        // 'department' is used here as it's the field name in your User model for student specialization.
        const { classLevel, branchId, department, id: userId } = studentUser;

        // Basic validation for student's class and branch info
        if (!classLevel || !branchId) {
            return res.status(400).json({ message: 'Class level and Branch ID are required to fetch exams for this student.' });
        }

        // Check if the student has made a successful payment
        const isPaymentEligible = await hasSuccessfulPayment(userId);
        if (!isPaymentEligible) {
            // If not payment eligible, return an empty array of exams
            return res.json([]);
        }

        // Build the base query for exams based on class level and branch
        const query = {
            classLevel: classLevel,
            branchId: branchId
        };

        // Add department-specific filtering for senior secondary students
        if (isSeniorSecondaryClass(classLevel)) {
            // If the student has a specific department (not null/undefined/N/A)
            if (department && department !== 'N/A') {
                query.areaOfSpecialization = department; // Filter exams by student's department
            } else {
                // If a senior student has no specific department, prevent them from seeing departmental exams
                query.areaOfSpecialization = null; // This will only match exams explicitly set to null for areaOfSpecialization
            }
        } else {
            // For non-senior classes, exams should typically have 'N/A' for areaOfSpecialization
            query.areaOfSpecialization = 'N/A';
        }

        // Find exams matching the constructed query
        const exams = await Exam.find(query)
            .populate('createdBy', 'fullName')
            .populate('branchId', 'name')
            .populate('subjectsIncluded.subjectId', 'name'); // Good: Populating subject name

        // Transform exam data for the frontend
        const transformedExams = exams.map(exam => ({
            _id: exam._id,
            title: exam.title,
            // 🐛 POTENTIAL ISSUE HERE: If subjectsIncluded is empty/missing, .map() will fail or return empty
            // Use the same robust logic as in getAllExams
            subject: exam.subjectsIncluded.map(si => {
                return (si.subjectId && typeof si.subjectId === 'object' && si.subjectId.name)
                       ? si.subjectId.name
                       : (si.subjectName || 'Unknown Subject');
            }).join(', '),
            classLevel: exam.classLevel,
            duration: exam.duration,
            totalQuestions: exam.totalQuestionsCount,
            isPaymentEligibleForExam: isPaymentEligible, // Indicate payment status for this exam
            areaOfSpecialization: exam.areaOfSpecialization // Include for clarity/debugging
        }));

        res.json(transformedExams);

    } catch (err) {
        console.error('Backend: Error fetching student-specific exams:', err.message);
        res.status(500).json({ message: 'Server Error while fetching student exams.' });
    }
};

// Get questions for a specific exam
exports.getExamQuestions = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.examId)
            .populate('subjectsIncluded.subjectId', 'name') // <-- Ensure this is present and correct
            .populate({ // This populates the actual questions
                path: 'questions',
                model: 'Question',
                populate: {
                    path: 'subject',
                    model: 'Subject',
                    select: 'name'
                }
            });

        // 🎯 CRITICAL DEBUGGING LOG:
        console.log('DEBUG(getExamQuestions): Raw exam object after populate:', exam ? exam.toObject() : 'null'); // Debug line
        if (exam && exam.subjectsIncluded) {
            console.log('DEBUG(getExamQuestions): exam.subjectsIncluded before transformation:', exam.subjectsIncluded); // Debug line
        } else {
            console.log('DEBUG(getExamQuestions): exam or exam.subjectsIncluded is missing/null/undefined.'); // Debug line
        }

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        const studentUser = req.user;
        const { id: userId } = studentUser;

        // Re-check payment eligibility before allowing access to questions
        const isPaymentEligible = await hasSuccessfulPayment(userId);
        if (!isPaymentEligible) {
            return res.status(403).json({ message: 'Payment required to take this exam. Please ensure your fees are paid.' });
        }

        // Authorize student based on role, class level, and branch
        if (studentUser.role !== 'student' ||
            exam.classLevel !== studentUser.classLevel ||
            (exam.branchId && exam.branchId.toString() !== studentUser.branchId.toString())) {
            return res.status(403).json({ message: 'You are not authorized to take this exam.' });
        }

        // --- START: NEW IMPLEMENTATION FOR SUBJECTS INCLUDED TRANSFORMATION ---
        const transformedSubjectsIncluded = exam.subjectsIncluded.map(si => {
            // Check if subjectId is populated (an object)
            if (si.subjectId && typeof si.subjectId === 'object' && si.subjectId._id) {
                return {
                    subjectId: si.subjectId._id.toString(), // Get _id from populated object
                    subjectName: si.subjectId.name, // Get name from populated object
                    numberOfQuestions: si.numberOfQuestions // This should already be part of the `subjectsIncluded` sub-document
                };
            } else {
                // Fallback if subjectId is not populated (shouldn't happen with the added .populate)
                // or if it's somehow malformed in the DB.
                console.warn(`WARN(getExamQuestions): subjectsIncluded sub-document might not be fully populated for ID: ${si.subjectId || si._id}. Falling back.`); // Debug line
                return {
                    subjectId: si.subjectId ? si.subjectId.toString() : (si._id ? si._id.toString() : 'N/A_ID'), // Fallback to original ID as string
                    subjectName: 'Unknown Subject', // Provide a fallback name
                    numberOfQuestions: si.numberOfQuestions || 0
                };
            }
        });
        // --- END: NEW IMPLEMENTATION FOR SUBJECTS INCLUDED TRANSFORMATION ---

        // Transform questions for the frontend (remove correct answers)
        const questionsToSend = exam.questions.map(q => {
            const transformedQuestion = {
                _id: q._id,
                questionText: q.questionText,
                subjectName: q.subject ? q.subject.name : 'N/A',
                classLevel: q.classLevel,
            };
            // Dynamically add options (option_a, option_b, etc.)
            q.options.forEach((option, index) => {
                const optionKeyChar = String.fromCharCode(65 + index); // A, B, C...
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
                areaOfSpecialization: exam.areaOfSpecialization, // Include areaOfSpecialization
                subjectsIncluded: transformedSubjectsIncluded // Use the transformed array
            },
            questions: questionsToSend
        });

    } catch (err) {
        console.error('CRITICAL ERROR fetching exam questions:', err.message); // Improved error logging
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid Exam ID.' });
        }
        res.status(500).json({ message: 'Server error fetching exam questions.', error: err.message }); // Send error message to frontend
    }
};

// Submit an exam
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

        // Re-check payment eligibility before allowing submission
        const isPaymentEligible = await hasSuccessfulPayment(userId);
        if (!isPaymentEligible) {
            return res.status(403).json({ message: 'Payment required to submit this exam. Please ensure your fees are paid.' });
        }

        // Authorize student for submission
        if (studentUser.role !== 'student' ||
            exam.classLevel !== studentUser.classLevel ||
            (exam.branchId && exam.branchId.toString() !== studentUser.branchId.toString())) {
            return res.status(403).json({ message: 'You are not authorized to submit this exam.' });
        }

        let score = 0;
        const totalQuestions = exam.questions.length;
        const resultsDetails = [];

        // Grade the submitted answers
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

        // Save the result
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
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Error: ${messages.join(', ')}` });
        }
        res.status(500).json({ message: 'Server error during exam submission.' });
    }
};

// Delete an exam
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

// Update an exam
exports.updateExam = async (req, res) => {
    try {
        const { examId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(examId)) {
            return res.status(400).json({ message: 'Invalid Exam ID.' });
        }
        const updateData = req.body;

        console.log("DEBUG(updateExam): Received update data for exam:", updateData); // Debug line

        const updatedExam = await Exam.findByIdAndUpdate(examId, updateData, { new: true })
            .populate('createdBy', 'fullName email role')
            .populate('branchId', 'name')
            .populate('subjectsIncluded.subjectId', 'name');

        console.log("DEBUG(updateExam): Updated Exam object after saving and populating:", updatedExam ? updatedExam.toObject() : 'null'); // Debug line

        if (!updatedExam) {
            return res.status(404).json({ message: 'Exam not found.' });
        }
        res.status(200).json({ message: 'Exam updated successfully.', exam: updatedExam });
    } catch (err) {
        console.error('Error updating exam:', err);
        res.status(500).json({ message: 'Server error updating exam.' });
    }
};