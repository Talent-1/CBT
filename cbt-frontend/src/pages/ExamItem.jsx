// src/pages/ExamItem.jsx
import React, { useState } from 'react';
import { updateExam } from '../../api/exams'; // Import your updateExam API call
import { Button } from '@shadcn/ui/button'; // Assuming you use shadcn/ui for buttons
// If not using shadcn/ui, you can use a simple <button> tag with Tailwind classes

const ExamItem = ({ exam, onExamUpdated }) => {
  // Use local state to reflect the exam's active status immediately after toggle
  // This is optimistic UI update, you might want to handle loading/error states more robustly
  const [isActive, setIsActive] = useState(exam.isActive || false); // Default to false if not set

  // Function to toggle the active status of the exam
  const handleToggleActive = async () => {
    try {
      // Toggle the status locally for immediate UI feedback
      const newStatus = !isActive;
      setIsActive(newStatus);

      // Call the API to update the exam's status in the database
      // Assuming your updateExam API takes exam ID and the fields to update
      const updatedExam = await updateExam(exam._id, { isActive: newStatus });

      console.log('Exam updated successfully:', updatedExam);

      // If there's a callback to the parent (AdminDashboard), notify it
      // This is useful if AdminDashboard needs to re-fetch or update its list
      if (onExamUpdated) {
        onExamUpdated(updatedExam);
      }
    } catch (error) {
      console.error('Error toggling exam status:', error);
      // If API call fails, revert the UI state
      setIsActive(prevStatus => !prevStatus); // Revert to previous state
      // You might want to show a toast/alert message here
      // IMPORTANT: Replace alert() with a custom modal/toast notification for better UX
      alert(`Failed to update exam status: ${error.message}`);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-3 flex items-center justify-between">
      {/* Display exam details */}
      <div className="flex-grow">
        <p className="text-gray-800 font-semibold">{exam.title}</p>
        {/* Changed from exam.subject?.name to exam.subject?.subjectName */}
        <p className="text-sm text-gray-600">Subject: {exam.subject?.subjectName || 'N/A'}</p>
        <p className="text-sm text-gray-600">Duration: {exam.duration} minutes</p>
        <p className="text-sm text-gray-600">Status: <span className={isActive ? 'text-green-600' : 'text-red-600'}>
            {isActive ? 'Active' : 'Inactive'}
        </span></p>
      </div>

      {/* Activate/Deactivate Button */}
      <Button
        onClick={handleToggleActive}
        className={`px-4 py-2 rounded-md text-white font-medium ${
          isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        {isActive ? 'Deactivate' : 'Activate'}
      </Button>
    </div>
  );
};

export default ExamItem;