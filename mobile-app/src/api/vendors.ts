import { api } from './client';

export const vendorApi = {
  listVerified: async (params: { category?: string; latitude?: number; longitude?: number; maxDistance?: number; page?: number; limit?: number } = {}) => {
    const res = await api.get('/verification/vendors/verified', { params });
    return res.data.vendors || res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/verification/vendors/${id}`);
    return res.data.vendor || res.data;
  }
};
