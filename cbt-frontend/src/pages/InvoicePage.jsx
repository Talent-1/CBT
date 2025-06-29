// cbt-frontend/src/pages/InvoicePage.jsx (Switch to window.print() for reliability)
import React, { useEffect, useState, useCallback } from 'react'; // Removed useRef, useReactToPrint
import { useLocation, useNavigate } from 'react-router-dom';
// Removed useReactToPrint import
import { SCHOOL_BANK_DETAILS } from '../utils/paymentUtils';

import '/src/style/InvoicePage.css';

const InvoicePage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [invoiceDetails, setInvoiceDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(true);

    // Removed componentRef as it's no longer needed for window.print()

    // Helper function to safely render properties that might be objects with { _id, name }
    const renderSafeString = useCallback((value) => {
        if (typeof value === 'object' && value !== null && (Object.prototype.hasOwnProperty.call(value, '_id') || Object.prototype.hasOwnProperty.call(value, 'name'))) {
            return value.name || 'N/A';
        }
        return value || 'N/A';
    }, []);

    // Helper to specifically handle section display (e.g., replace 'senior' with something else)
    const renderSectionDisplay = useCallback((value) => {
        const safeValue = renderSafeString(value);
        if (typeof safeValue === 'string' && safeValue.toLowerCase() === 'senior') {
            return 'N/A (Invalid Section Data)';
        }
        return safeValue;
    }, [renderSafeString]);

    // Removed handlePrint function and useReactToPrint hook

    useEffect(() => {
        console.log("InvoicePage useEffect: location.state:", location.state);
        console.log("InvoicePage useEffect: loadingDetails before state update:", loadingDetails);

        if (location.state && location.state.finalInvoiceDetails) {
            setInvoiceDetails(location.state.finalInvoiceDetails);
            setLoadingDetails(false);
            console.log("InvoicePage useEffect: Invoice details found and set. loadingDetails set to false.");
        } else {
            console.warn("No invoice details found in location state. Redirecting.");
            setLoadingDetails(false);
            navigate('/admin-dashboard', { replace: true });
        }
    }, [location.state, navigate, loadingDetails]);

    // Logs for debugging disabled state removed as they are less relevant with window.print()
    // console.log("InvoicePage Render: loadingDetails:", loadingDetails, "invoiceDetails:", invoiceDetails, "componentRef.current:", componentRef.current);
    // console.log("InvoicePage Render: Print button disabled status check:", loadingDetails || !invoiceDetails || !componentRef.current);


    return (
        <div className="invoice-page-container">
            {/* Header and buttons always visible on screen */}
            {/* The 'no-print' class will hide these elements during actual print */}
            <div className="invoice-header no-print">
                <h1>Payment Invoice</h1>
                <button
                    onClick={() => {
                        // Directly call native browser print function
                        window.print();
                    }}
                    className="print-button"
                    // The button can still be disabled if details aren't loaded yet
                    disabled={loadingDetails || !invoiceDetails}
                >
                    Print Invoice
                </button>
                <button onClick={() => navigate(-1)} className="back-button">Go Back</button>
            </div>

            {/* This div contains the invoice content. 
                It no longer needs a ref for react-to-print, but the 'invoice-content-printable' class 
                is still useful for styling and print media queries. */}
            <div className="invoice-content-wrapper">
                {loadingDetails ? (
                    <p>Loading invoice details...</p>
                ) : invoiceDetails ? (
                    <div className="invoice-content-printable">
                        <h2 style={{ textAlign: 'center', color: '#0056b3', textTransform: 'uppercase', marginBottom: '20px' }}>Official Payment Receipt / Invoice</h2>
                        <p style={{ textAlign: 'center', fontSize: '0.9em', color: '#555' }}>
                            Generated on: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                            at {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                        <div style={{ borderTop: '1px dashed #ccc', margin: '20px 0' }}></div>

                        <div className="section-details">
                            <h3>Payment Details</h3>
                            <p><strong>Transaction Ref:</strong> {renderSafeString(invoiceDetails.transactionRef)}</p>
                            <p><strong>Status:</strong> <span style={{ color: invoiceDetails.status === 'successful' ? 'green' : 'orange' }}>{renderSafeString(invoiceDetails.status?.toUpperCase())}</span></p>
                            <p><strong>Amount:</strong> NGN {invoiceDetails.amount?.toFixed(2) || '0.00'}</p>
                            <p><strong>Reason:</strong> {renderSafeString(invoiceDetails.description)}</p>
                            <p><strong>Payment Method:</strong> {renderSafeString(invoiceDetails.paymentMethod)}</p>
                            <p><strong>Payment Date:</strong> {invoiceDetails.paymentDate ? new Date(invoiceDetails.paymentDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                        </div>

                        <div className="section-details">
                            <h3>Payer Details</h3>
                            <p><strong>Payer Name:</strong> {renderSafeString(invoiceDetails.student?.fullName)}</p>
                            <p><strong>Student ID:</strong> {renderSafeString(invoiceDetails.student?.studentId)}</p>
                            <p><strong>Email:</strong> {renderSafeString(invoiceDetails.student?.email)}</p>
                            <p><strong>Branch:</strong> {renderSafeString(invoiceDetails.branch?.name)}</p>
                            <p><strong>Class Level:</strong> {renderSafeString(invoiceDetails.classLevel)}</p>
                            <p><strong>Sub-Class Level:</strong> {renderSectionDisplay(invoiceDetails.subClassLevel)}</p>
                        </div>

                        {invoiceDetails.status === 'successful' && invoiceDetails.verifiedBy && (
                            <div className="section-details">
                                <h3>Verification Details</h3>
                                <p><strong>Verified By (ID):</strong> {renderSafeString(invoiceDetails.verifiedBy)}</p>
                                <p><strong>Verification Date:</strong> {invoiceDetails.verificationDate ? new Date(invoiceDetails.verificationDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</p>
                                {invoiceDetails.adminNotes && <p><strong>Admin Notes:</strong> {renderSafeString(invoiceDetails.adminNotes)}</p>}
                            </div>
                        )}

                        <div className="section-details school-bank-details">
                            <h3>School Bank Details</h3>
                            <p><strong>Account Name:</strong> {SCHOOL_BANK_DETAILS.accountName}</p>
                            <p><strong>Account Number:</strong> {SCHOOL_BANK_DETAILS.accountNumber}</p>
                            <p><strong>Bank Name:</strong> {SCHOOL_BANK_DETAILS.bankName}</p>
                        </div>

                        <div style={{ borderTop: '1px dashed #ccc', margin: '20px 0' }}></div>
                        <p style={{ textAlign: 'center', fontSize: '0.9em', color: '#555', marginTop: '20px' }}>
                            Thank you for your payment. This is an official invoice.
                        </p>
                    </div>
                ) : (
                    <p className="errorMessage">No invoice details to display. Please initiate a payment first.</p>
                )}
            </div>
        </div>
    );
};

export default InvoicePage;