// cbt-frontend/src/pages/PaymentPage.jsx (FIXED - Payment Method Enum Value)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/api';
import { SCHOOL_BANK_DETAILS } from '../utils/paymentUtils';
import { getBranches } from '../api/admin';

import '../style/PaymentPage.css';

// Define common section letters for a class. This will be used for the dropdown.
const SECTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

const PaymentPage = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // --- Component State for Flow Control ---
    const [currentStep, setCurrentStep] = useState('form');

    // --- Component State for Form Fields ---
    const [amountDue, setAmountDue] = useState('');
    const [reasonForPayment, setReasonForPayment] = useState('');
    const [subclassLevel, setSubclassLevel] = useState(''); // This will be bound to the <select>

    // --- Component State for Data Between Steps (for confirmation display) ---
    const [tempConfirmationData, setTempConfirmationData] = useState(null);

    // --- Component State for Loading/Errors ---
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [branches, setBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(true);

    // Fetch branches and handle user authentication on component mount
    useEffect(() => {
        console.log('PaymentPage: useEffect running. User:', user, 'AuthLoading:', authLoading);

        if (!authLoading && !user) {
            console.log('User not logged in or auth loading complete, redirecting to /login');
            setError('Please login to access the payment page.');
            navigate('/login');
            return;
        }

        const fetchBranches = async () => {
            try {
                const data = await getBranches();
                setBranches(data);
            } catch (err) {
                console.error('Error fetching branches:', err);
                setError('Failed to load branch information.');
            } finally {
                setLoadingBranches(false);
            }
        };
        fetchBranches();
    }, [user, authLoading, navigate]);

    const getCurrentDateTime = () => {
        const now = new Date();
        const options = {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        };
        return now.toLocaleDateString('en-GB', options).replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$1/$2/$3');
    };

    const handleGenerateInvoiceClick = async (e) => {
        e.preventDefault();
        setError(null);

        console.log('PaymentPage: handleGenerateInvoiceClick called. User object at click:', user);

        // --- Frontend Validation ---
        if (!amountDue || !reasonForPayment || !subclassLevel) {
            setError('Please fill in all required fields.');
            return;
        }
        if (isNaN(parseFloat(amountDue)) || parseFloat(amountDue) <= 0) {
            setError('Amount Due must be a positive number.');
            return;
        }
        // Validate subclassLevel against our predefined list
        if (!SECTION_LETTERS.includes(subclassLevel.toUpperCase())) {
            setError('Invalid Subclass Level. Please select a letter from A-I.');
            return;
        }

        if (!user || !user.branchId || !user.classLevel || !user.email || !user.fullName || !user._id) {
             console.error('PaymentPage: Incomplete user details for validation.', {
                 userExists: !!user,
                 hasId: !!user?._id,
                 hasBranchId: !!user?.branchId,
                 hasClassLevel: !!user?.classLevel,
                 hasEmail: !!user?.email,
                 hasFullName: !!user?.fullName,
             });
             setError('User details incomplete. Please ensure you are logged in correctly.');
             return;
        }

        // Prepare data for confirmation step
        const payerBranchName = branches.find(b => b._id === user.branchId)?.name || 'N/A';

        setTempConfirmationData({
            payerName: user.fullName,
            payerEmail: user.email,
            payerRole: user.role,
            payerBranch: payerBranchName,
            payerStudentId: user.studentId || 'N/A',
            payerClassLevel: user.classLevel,
            subclassLevel: subclassLevel.toUpperCase(), // Ensure uppercase for consistency
            amountDue: parseFloat(amountDue),
            reasonForPayment,
            paymentDateTime: getCurrentDateTime(),
            bankDetails: SCHOOL_BANK_DETAILS,
        });

        setCurrentStep('confirm');
    };

    const handleConfirmPayment = async () => {
        setError(null);
        setLoading(true);

        const paymentData = {
            amount: tempConfirmationData.amountDue,
            description: tempConfirmationData.reasonForPayment,
            subClassLevel: tempConfirmationData.subclassLevel,
            classLevel: tempConfirmationData.payerClassLevel,
            student: user._id,
            branch: user.branchId,
            paymentMethod: 'bank_transfer', // FIXED: Changed to 'bank_transfer'
            status: 'pending',
        };

        try {
            console.log('PaymentPage: Initiating payment with data:', paymentData);
            const result = await api.post('/payments/initiate', paymentData);
            
            const finalInvoiceDetails = result.data.payment;

            console.log('PaymentPage: Data being sent to InvoicePage:', finalInvoiceDetails);

            setLoading(false);
            navigate('/invoice', { state: { finalInvoiceDetails } });

        } catch (err) {
            console.error('PaymentPage: Error confirming payment:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Failed to confirm payment. Please try again.');
            setLoading(false);
            setCurrentStep('form');
        }
    };

    const handleCancelConfirmation = () => {
        setCurrentStep('form');
        setError(null);
        setTempConfirmationData(null);
    };

    if (authLoading || loadingBranches) {
        return <p>Loading payment page...</p>;
    }

    if (!user) {
        return <p className="error-message">{error}</p>;
    }

    const branchNameForDisplay = branches.find(b => b._id === user.branchId)?.name || 'N/A';

    if (currentStep === 'form') {
        return (
            <div className="payment-page-container">
                <h1>Generate Payment Invoice</h1>
                <p>Please fill in the details for your bank payment.</p>
                {error && <p style={{ color: 'red', fontWeight: 'bold' }}>Error: {error}</p>}

                <div className="student-info-dashboard">
                    <h3>Your Details (from Dashboard)</h3>
                    <p><strong>Full Name:</strong> {user.fullName || 'N/A'}</p>
                    {user.studentId && <p><strong>Student ID:</strong> {user.studentId}</p>}
                    {user.email && <p><strong>Email:</strong> {user.email}</p>}
                    <p><strong>Role:</strong> {user.role || 'N/A'}</p>
                    <p><strong>Branch:</strong> {branchNameForDisplay}</p>
                    {user.classLevel && <p><strong>Class Level:</strong> {user.classLevel}</p>}
                    {user.section && <p><strong>Section:</strong> {user.section}</p>}
                    {user.areaOfSpecialization && <p><strong>Specialization:</strong> {user.areaOfSpecialization}</p>}
                </div>

                <form onSubmit={handleGenerateInvoiceClick}>
                    <div>
                        <label htmlFor="subclassLevel">Subclass Level (e.g., A, B, C):</label>
                        <select
                            id="subclassLevel"
                            name="subclassLevel"
                            value={subclassLevel}
                            onChange={(e) => setSubclassLevel(e.target.value)}
                            required
                        >
                            <option value="">Select Section</option>
                            {SECTION_LETTERS.map(letter => (
                                <option key={letter} value={letter}>{letter}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="amountDue">Amount Due (Naira):</label>
                        <input
                            type="number"
                            id="amountDue"
                            name="amountDue"
                            value={amountDue}
                            onChange={(e) => setAmountDue(e.target.value)}
                            min="0.01"
                            step="0.01"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="reasonForPayment">Reason for Payment (e.g., School Fees, Exam Fees):</label>
                        <input
                            type="text"
                            id="reasonForPayment"
                            name="reasonForPayment"
                            value={reasonForPayment}
                            onChange={(e) => setReasonForPayment(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" disabled={loading}>Generate Invoice</button>
                </form>
            </div>
        );
    }

    if (currentStep === 'confirm' && tempConfirmationData) {
        return (
            <div className="payment-page-container">
                <h2>Confirm Your Payment Details</h2>
                {error && <p style={{ color: 'red', fontWeight: 'bold' }}>Error: {error}</p>}
                <p>Please review the details below carefully before confirming.</p>

                <div className="confirmation-details">
                    <p><strong>Payer Name:</strong> {tempConfirmationData.payerName}</p>
                    <p><strong>Payer Email:</strong> {tempConfirmationData.payerEmail}</p>
                    <p><strong>Payer Role:</strong> {tempConfirmationData.payerRole}</p>
                    <p><strong>Payer Branch:</strong> {tempConfirmationData.payerBranch}</p>
                    <p><strong>Payer Student Id:</strong> {tempConfirmationData.payerStudentId}</p>
                    <p><strong>Payer Class Level:</strong> {tempConfirmationData.payerClassLevel}</p>
                    <p><strong>Subclass Level:</strong> {tempConfirmationData.subclassLevel}</p>
                    <p><strong>Amount Due:</strong> NGN {tempConfirmationData.amountDue?.toFixed(2)}</p>
                    <p><strong>Reason For Payment:</strong> {tempConfirmationData.reasonForPayment}</p>
                    <p><strong>Payment Date Time:</strong> {tempConfirmationData.paymentDateTime}</p>

                    <h3 style={{ marginTop: '20px' }}>School Bank Details:</h3>
                    <p><strong>Account Name:</strong> {tempConfirmationData.bankDetails.accountName}</p>
                    <p><strong>Account Number:</strong> {tempConfirmationData.bankDetails.accountNumber}</p>
                    <p><strong>Bank Name:</strong> {tempConfirmationData.bankDetails.bankName}</p>
                </div>

                <div className="invoice-actions">
                    <button onClick={handleConfirmPayment} disabled={loading} style={{ backgroundColor: '#28a745', marginBottom: '10px' }}>
                        {loading ? 'Confirming...' : 'Confirm'}
                    </button>
                    <button onClick={handleCancelConfirmation} disabled={loading} style={{ backgroundColor: '#dc3545' }}>
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return <div className="payment-page-container">Something went wrong. Please refresh.</div>;
};

export default PaymentPage;