import { api } from './client';

export const paymentApi = {
  initiateMpesa: async (taskId: string, phoneNumber: string) => {
    const res = await api.post('/payments/mpesa/stk-push', { taskId, phoneNumber });
    return res.data;
  },
  createCashRecord: async (taskId: string, amount: number, notes?: string) => {
    const res = await api.post('/payments/cash/create', { taskId, amount, notes });
    return res.data;
  },
  confirmCashReceipt: async (paymentId: string) => {
    const res = await api.patch(`/payments/${paymentId}/status`);
    return res.data;
  },
  getMyPayments: async (page = 1) => {
    const res = await api.get('/payments/user/my-payments', { params: { page } });
    return res.data;
  }
};
