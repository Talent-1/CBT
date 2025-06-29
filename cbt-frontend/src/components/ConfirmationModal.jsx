// cbt-frontend/src/components/ConfirmationModal.jsx
import React from 'react';

// Helper function to format keys (e.g., "payerName" to "Payer Name")
const formatKey = (key) => {
    return key
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, (str) => str.toUpperCase()); // Capitalize the first letter
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, details }) => {
    if (!isOpen) {
        return null; // Don't render anything if the modal is not open
    }

    const renderDetailValue = (key, value) => {
        if (typeof value === 'object' && value !== null) {
            // If the value is an object (like schoolBankDetails), render its properties
            return (
                <div key={key} className="nested-details">
                    <strong>{formatKey(key)}:</strong>
                    {Object.entries(value).map(([nestedKey, nestedValue]) => (
                        <p key={nestedKey} style={{ marginLeft: '20px', marginBottom: '5px' }}>
                            <strong>{formatKey(nestedKey)}:</strong> {String(nestedValue)}
                        </p>
                    ))}
                </div>
            );
        }
        // If the value is not an object, just render it as a string
        return (
            <p key={key}>
                <strong>{formatKey(key)}:</strong> {String(value)}
            </p>
        );
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h3>{title || "Confirm Action"}</h3>
                <p>{message || "Are you sure you want to proceed?"}</p>

                {details && (
                    <div className="modal-details">
                        {Object.entries(details).map(([key, value]) => (
                            renderDetailValue(key, value) // Use the helper function to render
                        ))}
                    </div>
                )}

                <div className="modal-actions">
                    <button onClick={onClose} className="modal-button modal-cancel-button">Cancel</button>
                    <button onClick={onConfirm} className="modal-button modal-confirm-button">Confirm</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;