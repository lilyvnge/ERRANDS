import api from './api';

export const disputeService = {
  create: async (payload: { taskId: string; type: string; title: string; description: string; evidence?: string[] }) => {
    const res = await api.post('/disputes', payload);
    return res.data;
  }
};
