const Exam = require('../models/Exam');
const User = require('../models/User'); // Assuming User model is needed for exam creation/linking
const Subject = require('../models/Subject'); // Assuming Subject model is needed for subject validation
const Question = require('../models/Question'); // Assuming Question model is needed for question validation/population
const mongoose = require('mongoose');

// @route   GET /api/exams
// @desc    Get all exams (for admin dashboards)
// @access  Private (Admin roles)
exports.getAllExams = async (req, res) => {
    try {
        let query = {};
        // Branch admin filtering logic (if applicable)
        if (req.user && req.user.role === 'branch_admin' && req.user.branchId) {
            query.branchId = req.user.branchId;
        }

        const exams = await Exam.find(query)
            .populate('createdBy', 'fullName email role')
            .populate('branchId', 'name')
            // --- MODIFIED: Populating 'subjectName' for subjectsIncluded.subjectId ---
            .populate('subjectsIncluded.subjectId', 'subjectName');

        // Transform the exams to ensure consistent subjectName for frontend
        const transformedExams = exams.map(exam => {
            const transformedSubjectsIncluded = exam.subjectsIncluded.map(si => {
                return {
                    ...si.toObject(),
                    // Use the populated subjectName if available, fallback to a generic message
                    subjectName: (si.subjectId && typeof si.subjectId === 'object' && si.subjectId.subjectName)
                                 ? si.subjectId.subjectName
                                 : 'Unknown Subject' // Fallback for cases where population might fail or data is missing
                };
            });
            return {
                ...exam.toObject(), // Convert Mongoose document to plain object
                subjectsIncluded: transformedSubjectsIncluded,
            };
        });

        res.status(200).json(transformedExams);
    } catch (error) {
        console.error("Error in getAllExams:", error);
        res.status(500).json({ message: 'Server Error fetching exams.' });
    }
};

// @route   POST /api/exams
// @desc    Add a new exam (Super Admin or Branch Admin)
// @access  Private
exports.addExam = async (req, res) => {
    const { title, description, durationMinutes, totalQuestions, classLevel, subjectsIncluded, branchId, examDate, instructions, timeLimitPerQuestion, shuffleQuestions, allowReview, passMark } = req.body;

    try {
        // Validation (basic checks)
        if (!title || !durationMinutes || !totalQuestions || !classLevel || !subjectsIncluded || subjectsIncluded.length === 0 || !examDate || !branchId) {
            return res.status(400).json({ message: 'Please provide all required exam fields.' });
        }

        // Validate subjectsIncluded array structure and IDs
        for (const item of subjectsIncluded) {
            if (!item.subjectId || !mongoose.Types.ObjectId.isValid(item.subjectId) || typeof item.numberOfQuestions !== 'number' || item.numberOfQuestions <= 0) {
                return res.status(400).json({ message: 'Invalid subject included data. Each subject must have a valid subjectId and a positive numberOfQuestions.' });
            }
            // Optional: Verify subjectId actually exists in the Subject collection
            const subjectExists = await Subject.findById(item.subjectId);
            if (!subjectExists) {
                return res.status(400).json({ message: `Subject with ID ${item.subjectId} not found.` });
            }
        }

        // Validate branchId
        if (!mongoose.Types.ObjectId.isValid(branchId)) {
            return res.status(400).json({ message: 'Invalid Branch ID format.' });
        }
        const branchExists = await Branch.findById(branchId);
        if (!branchExists) {
            return res.status(400).json({ message: 'Branch not found.' });
        }

        // Check if the user is a branch_admin and if the branchId matches their assigned branchId
        if (req.user.role === 'branch_admin' && req.user.branchId.toString() !== branchId) {
            return res.status(403).json({ message: 'You are not authorized to create exams for this branch.' });
        }

        const newExam = new Exam({
            title,
            description,
            durationMinutes,
            totalQuestions,
            classLevel,
            subjectsIncluded,
            branchId,
            examDate,
            instructions,
            timeLimitPerQuestion,
            shuffleQuestions,
            allowReview,
            passMark,
            createdBy: req.user.id // Get user ID from authenticated request
        });

        const savedExam = await newExam.save();

        // Populate the saved exam for the response
        const populatedExam = await Exam.findById(savedExam._id)
            .populate('createdBy', 'fullName email')
            .populate('branchId', 'name')
            // --- MODIFIED: Populating 'subjectName' for subjectsIncluded.subjectId ---
            .populate('subjectsIncluded.subjectId', 'subjectName');

        res.status(201).json({ message: 'Exam created successfully!', exam: populatedExam });

    } catch (error) {
        console.error("Error in addExam:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Error: ${messages.join(', ')}` });
        }
        res.status(500).json({ message: 'Server Error adding exam.', error: error.message });
    }
};


// @route   GET /api/exams/student/:classLevel/:branchId
// @desc    Get exams for a specific student's class level and branch
// @access  Private (Students)
exports.getStudentExams = async (req, res) => {
    try {
        const { classLevel, branchId } = req.params;

        // Ensure classLevel and branchId are provided
        if (!classLevel || !branchId) {
            return res.status(400).json({ message: 'Class level and branch ID are required.' });
        }

        // Ensure branchId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(branchId)) {
            return res.status(400).json({ message: 'Invalid Branch ID format.' });
        }

        // Construct query to find exams matching classLevel and branchId
        const query = {
            classLevel: classLevel,
            branchId: branchId,
            examDate: { $lte: new Date() } // Only show exams that are on or before today
        };

        const exams = await Exam.find(query)
            .populate('createdBy', 'fullName')
            .populate('branchId', 'name')
            // --- MODIFIED: Populating 'subjectName' for subjectsIncluded.subjectId ---
            .populate('subjectsIncluded.subjectId', 'subjectName');

        // Transform exam data for the frontend to include a combined subject string
        const transformedExams = exams.map(exam => ({
            _id: exam._id,
            title: exam.title,
            description: exam.description,
            durationMinutes: exam.durationMinutes,
            totalQuestions: exam.totalQuestions,
            classLevel: exam.classLevel,
            // Map subjectsIncluded to display their names
            subject: exam.subjectsIncluded.map(si => {
                // Check if subjectId is populated and has subjectName, otherwise fallback
                return (si.subjectId && typeof si.subjectId === 'object' && si.subjectId.subjectName)
                                ? si.subjectId.subjectName
                                : 'Unknown Subject';
            }).join(', '), // Join multiple subjects with a comma
            branchName: exam.branchId ? exam.branchId.name : 'N/A',
            examDate: exam.examDate,
            instructions: exam.instructions,
            passMark: exam.passMark,
            timeLimitPerQuestion: exam.timeLimitPerQuestion,
            shuffleQuestions: exam.shuffleQuestions,
            allowReview: exam.allowReview,
            createdBy: exam.createdBy ? exam.createdBy.fullName : 'N/A',
            createdAt: exam.createdAt,
            updatedAt: exam.updatedAt,
        }));

        res.json(transformedExams);
    } catch (err) {
        console.error('Error fetching student exams:', err);
        res.status(500).json({ message: 'Server error fetching student exams.' });
    }
};


// @route   GET /api/exams/:examId/questions
// @desc    Get all questions for a specific exam
// @access  Private (Students after exam started, or Admins)
exports.getExamQuestions = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.examId)
            // Populate subjectsIncluded to get subjectName for context
            // --- MODIFIED: Populating 'subjectName' for subjectsIncluded.subjectId ---
            .populate('subjectsIncluded.subjectId', 'subjectName')
            // Populate questions themselves, and within questions, populate their subject
            .populate({
                path: 'questions',
                model: 'Question',
                populate: {
                    path: 'subject',
                    model: 'Subject',
                    select: 'subjectName' // --- MODIFIED: Select 'subjectName' ---
                }
            });

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found.' });
        }

        // Prepare subjects for the frontend
        const transformedSubjectsIncluded = exam.subjectsIncluded.map(si => {
            if (si.subjectId && typeof si.subjectId === 'object' && si.subjectId._id) {
                return {
                    subjectId: si.subjectId._id.toString(),
                    subjectName: si.subjectId.subjectName, // --- MODIFIED: Use .subjectName ---
                    numberOfQuestions: si.numberOfQuestions
                };
            } else {
                return {
                    subjectId: si.subjectId ? si.subjectId.toString() : null, // Original ID if population failed
                    subjectName: 'Unknown Subject',
                    numberOfQuestions: si.numberOfQuestions
                };
            }
        });

        // Transform questions for the frontend (hide correct answer if for student, etc.)
        const questionsToSend = exam.questions.map(q => {
            const transformedQuestion = {
                _id: q._id,
                questionText: q.questionText,
                options: q.options,
                // --- MODIFIED: Access subjectName for display ---
                subjectName: q.subject ? q.subject.subjectName : 'N/A',
                classLevel: q.classLevel,
                category: q.category,
                difficulty: q.difficulty,
                imageUrl: q.imageUrl
            };

            // If not an admin, or exam is in progress/completed, hide correctOptionIndex
            // You might have specific role checks or exam state checks here.
            // For now, assuming only admins get correct answer by default.
            if (req.user && req.user.role === 'admin' || req.user.role === 'super_admin') {
                 transformedQuestion.correctOptionIndex = q.correctOptionIndex;
            } else {
                // For students during exam, do NOT include correctOptionIndex
            }

            return transformedQuestion;
        });

        res.json({
            _id: exam._id,
            title: exam.title,
            description: exam.description,
            durationMinutes: exam.durationMinutes,
            totalQuestions: exam.totalQuestions,
            classLevel: exam.classLevel,
            subjectsIncluded: transformedSubjectsIncluded, // Send transformed subjects
            examDate: exam.examDate,
            instructions: exam.instructions,
            timeLimitPerQuestion: exam.timeLimitPerQuestion,
            shuffleQuestions: exam.shuffleQuestions,
            allowReview: exam.allowReview,
            passMark: exam.passMark,
            questions: questionsToSend // Send transformed questions
        });

    } catch (err) {
        console.error('Error fetching exam questions:', err);
        res.status(500).json({ message: 'Server error fetching exam questions.' });
    }
};


// @route   PUT /api/exams/:id
// @desc    Update an exam
// @access  Private (Admin roles)
exports.updateExam = async (req, res) => {
    try {
        const examId = req.params.id;
        const updateData = req.body;

        if (!mongoose.Types.ObjectId.isValid(examId)) {
            return res.status(400).json({ message: 'Invalid Exam ID.' });
        }

        // Basic validation for incoming updateData if needed (e.g., branchId validity)
        if (updateData.branchId && !mongoose.Types.ObjectId.isValid(updateData.branchId)) {
            return res.status(400).json({ message: 'Invalid Branch ID format in update data.' });
        }
         if (updateData.branchId) {
            const branchExists = await Branch.findById(updateData.branchId);
            if (!branchExists) {
                return res.status(400).json({ message: 'Specified branch not found.' });
            }
        }
        // Handle subjectsIncluded updates
        if (updateData.subjectsIncluded) {
            for (const item of updateData.subjectsIncluded) {
                if (!item.subjectId || !mongoose.Types.ObjectId.isValid(item.subjectId) || typeof item.numberOfQuestions !== 'number' || item.numberOfQuestions <= 0) {
                    return res.status(400).json({ message: 'Invalid subject included data in update. Each subject must have a valid subjectId and a positive numberOfQuestions.' });
                }
                const subjectExists = await Subject.findById(item.subjectId);
                if (!subjectExists) {
                    return res.status(400).json({ message: `Subject with ID ${item.subjectId} not found in update.` });
                }
            }
        }

        // Check if the user is a branch_admin and if they are trying to update an exam
        // not belonging to their branch, or trying to change the branchId
        if (req.user.role === 'branch_admin') {
            const existingExam = await Exam.findById(examId);
            if (!existingExam) {
                return res.status(404).json({ message: 'Exam not found.' });
            }
            if (existingExam.branchId.toString() !== req.user.branchId.toString()) {
                return res.status(403).json({ message: 'You are not authorized to update exams for other branches.' });
            }
            // If branch_admin tries to change branchId to something else, prevent it
            if (updateData.branchId && updateData.branchId.toString() !== req.user.branchId.toString()) {
                 return res.status(403).json({ message: 'Branch administrators cannot change the branch of an exam.' });
            }
            // Ensure they don't try to change createdBy or other sensitive fields
            delete updateData.createdBy;
        }


        const updatedExam = await Exam.findByIdAndUpdate(examId, updateData, { new: true })
            .populate('createdBy', 'fullName email role')
            .populate('branchId', 'name')
            // --- MODIFIED: Populating 'subjectName' for subjectsIncluded.subjectId ---
            .populate('subjectsIncluded.subjectId', 'subjectName');

        if (!updatedExam) {
            return res.status(404).json({ message: 'Exam not found.' });
        }

        // Transform the updated exam response for consistency
        const transformedSubjectsIncluded = updatedExam.subjectsIncluded.map(si => {
            return {
                ...si.toObject(),
                subjectName: (si.subjectId && typeof si.subjectId === 'object' && si.subjectId.subjectName)
                             ? si.subjectId.subjectName
                             : 'Unknown Subject'
            };
        });

        const transformedUpdatedExam = {
            ...updatedExam.toObject(),
            subjectsIncluded: transformedSubjectsIncluded,
        };

        res.status(200).json({ message: 'Exam updated successfully.', exam: transformedUpdatedExam });
    } catch (err) {
        console.error('Error updating exam:', err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Error: ${messages.join(', ')}` });
        }
        res.status(500).json({ message: 'Server error updating exam.' });
    }
};


// @route   DELETE /api/exams/:id
// @desc    Delete an exam
// @access  Private (Admin roles)
exports.deleteExam = async (req, res) => {
    try {
        const examId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(examId)) {
            return res.status(400).json({ message: 'Invalid Exam ID.' });
        }

        const examToDelete = await Exam.findById(examId);
        if (!examToDelete) {
            return res.status(404).json({ message: 'Exam not found.' });
        }

        // Branch admin authorization: Can only delete exams from their branch
        if (req.user.role === 'branch_admin' && examToDelete.branchId.toString() !== req.user.branchId.toString()) {
            return res.status(403).json({ message: 'You are not authorized to delete exams from other branches.' });
        }

        await Exam.findByIdAndDelete(examId);
        res.status(200).json({ message: 'Exam deleted successfully.' });
    } catch (err) {
        console.error('Error deleting exam:', err);
        res.status(500).json({ message: 'Server error deleting exam.' });
    }
};