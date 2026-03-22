import api from './api';

export const verificationService = {
  submit: async (documents: { documentType: string; documentUrl: string }[]) => {
    const res = await api.post('/verification/submit', { documents });
    return res.data;
  },
  status: async () => {
    const res = await api.get('/verification/status');
    return res.data;
  }
};
