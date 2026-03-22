import api from './api';
import type { Payment } from '../types';
// import Payment from '../../../backend/src/models/Payment';

export const paymentService = {
    // M-Pesa STK Push
    initiateMpesa: async (taskId: string, phoneNumber: string) => {
        const response = await api.post<{ payment: Payment; message: string }>('/payments/mpesa/stk-push', {
            taskId,
            phoneNumber
        });
        return response.data;
    },

    // Cash: Create Record (Employer)
    createCashRecord: async (taskId: string, amount: number, notes?: string) => {
        const response = await api.post<{ payment: Payment }>('/payments/cash/create', {
            taskId,
            amount,
            notes
        });
        return response.data;
    },

    //Cash: Vendor Confirms Receipt
    confirmCashReceipt: async (paymentId: string) => {
        const response = await api.patch<{ payment: Payment }>(`/payments/${paymentId}/status`);
        return response.data;
    },

    // Fetch Payment History
    getMyPayments: async (page = 1) => {
        const response = await api.get('/payments/user/my-payments', { params: { page } });
        return response.data; // Returns { payments, pagination, summary }
    }
};
