import api from './api';
import type { User } from '../types';

interface VendorFilters {
  category?: string;
  latitude?: number;
  longitude?: number;
  maxDistance?: number; // km
  page?: number;
  limit?: number;
}

export const vendorService = {
  getVerified: async (filters: VendorFilters = {}) => {
    const response = await api.get<{
      vendors: User[];
      pagination: { currentPage: number; totalPages: number; total: number };
    }>('/verification/vendors/verified', { params: filters });
    return response.data;
  },

  getVendorProfile: async (id: string) => {
    const response = await api.get<{ vendor: User }>(`/verification/vendors/${id}`);
    return response.data;
  }
};
