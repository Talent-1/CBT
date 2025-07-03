// cbt-frontend/src/utils/paymentUtils.js
import { v4 as uuidv4 } from 'uuid';

export const SCHOOL_BANK_DETAILS = {
  accountName: "City Secondary School",
  accountNumber: "3036243418",
  bankName: "First Bank of Nigeria Plc",
};

export const generateUniquePaymentCode = (userData, paymentDetails) => {
    const uniqueIdPart = uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase();
    // Use studentId if available, otherwise fallback to full name initials
    const identifierPart = userData.studentId ? userData.studentId.replace(/\//g, '-').substring(4) : (userData.fullName ? userData.fullName.substring(0, 3).toUpperCase() : 'CBT'); // Use part of student ID or initials

    return `PAY-${identifierPart}-${uniqueIdPart}`; // Simpler payment code format
};

export const formatPaymentDetailsForInvoice = (user, paymentFormData) => {
    const dateTime = new Date();
    const uniqueCode = generateUniquePaymentCode(user, paymentFormData);

    return {
        payerName: user.fullName,
        payerEmail: user.email || 'N/A', // Include email
        payerRole: user.role,
        payerBranch: user.branchName || user.branchId,
        payerStudentId: user.studentId || 'N/A', // Include student ID
        payerSection: user.section || 'N/A',
        payerClassLevel: user.classLevel || 'N/A',
        subclassLevel: paymentFormData.subclassLevel,
        amountDue: parseFloat(paymentFormData.amountDue).toFixed(2),
        reasonForPayment: paymentFormData.reasonForPayment,
        paymentDateTime: dateTime.toLocaleString(),
        paymentCode: uniqueCode,
        schoolBankDetails: SCHOOL_BANK_DETAILS,
    };
};