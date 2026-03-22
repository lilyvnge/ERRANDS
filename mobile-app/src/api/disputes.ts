import { api } from './client';

export const disputeApi = {
  create: async (payload: {
    taskId: string;
    title: string;
    type: string;
    description: string;
    evidence?: Array<string | { type?: string; url?: string; description?: string }>;
  }) => {
    const res = await api.post('/disputes', payload);
    return res.data;
  },
  listMine: async (params: { page?: number; limit?: number } = {}) => {
    const res = await api.get('/disputes/user/my-disputes', { params });
    return res.data.disputes || res.data;
  }
};
