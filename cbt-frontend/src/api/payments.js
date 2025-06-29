// cbt-frontend/src/api/payments.js
import api from './api'; // Ensure you have an axios instance or fetch wrapper named 'api'

export const createPendingPayment = async (paymentData) => {
    try {
        const response = await api.post('/payments/initiate', paymentData);
        return response.data;
    } catch (error) {
        // Centralized error handling if needed
        console.error('API Error creating pending payment:', error);
        throw error; // Re-throw to be caught by the component
    }
};

// You'll add other payment-related API calls here later, e.g.,
// export const updatePaymentStatus = async (paymentId, newStatus) => { ... };
// export const getPaymentsSummaryByStatus = async () => { ... };
// export const getDetailedPayments = async (filters) => { ... };