import { api } from './client';

export const ratingApi = {
  rate: async (taskId: string, payload: { rating: number; comment?: string; rateeRole: 'vendor' | 'employer' }) => {
    const res = await api.post(`/tasks/${taskId}/rate`, payload);
    return res.data;
  },
  summary: async () => {
    const res = await api.get('/users/ratings/summary');
    return res.data;
  }
};
