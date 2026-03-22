import { api } from './client';

export const verificationApi = {
  status: async () => {
    const res = await api.get('/verification/status');
    return res.data.verification || res.data;
  },
  submit: async (documents: { documentType: string; documentUrl: string }[]) => {
    const res = await api.post('/verification/submit', { documents });
    return res.data;
  }
};
