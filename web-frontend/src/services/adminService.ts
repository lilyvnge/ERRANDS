import api from './api';

export const adminService = {
  getVerifications: async (status = 'pending') => {
    const res = await api.get('/admin/verifications', { params: { status } });
    return res.data;
  },
  reviewVerification: async (userId: string, status: 'verified' | 'rejected', rejectionReason?: string) => {
    const res = await api.put(`/verification/admin/verifications/${userId}/review`, {
      status,
      rejectionReason
    });
    return res.data;
  },
  getDisputes: async (params: Record<string, any> = {}) => {
    const res = await api.get('/disputes/admin/disputes', { params });
    return res.data;
  },
  resolveDispute: async (disputeId: string, resolution: { status: string; notes?: string }) => {
    const res = await api.patch(`/disputes/admin/disputes/${disputeId}/resolve`, resolution);
    return res.data;
  },
  addDisputeMessage: async (disputeId: string, payload: { message: string; isInternal?: boolean; attachments?: string[] }) => {
    const res = await api.post(`/disputes/admin/disputes/${disputeId}/messages`, payload);
    return res.data;
  },
  getOverview: async () => {
    const res = await api.get('/admin/overview');
    return res.data;
  },
  getActivities: async (params: Record<string, any> = {}) => {
    const res = await api.get('/admin/activities', { params });
    return res.data;
  },
  getUsers: async (params: Record<string, any> = {}) => {
    const res = await api.get('/admin/users', { params });
    return res.data;
  },
  updateUserStatus: async (userId: string, isActive: boolean) => {
    const res = await api.patch(`/admin/users/${userId}/status`, { isActive });
    return res.data;
  },
  getTasks: async (params: Record<string, any> = {}) => {
    const res = await api.get('/admin/tasks', { params });
    return res.data;
  },
  updateTaskStatus: async (taskId: string, status: string, adminNotes?: string) => {
    const res = await api.patch(`/admin/tasks/${taskId}/status`, { status, adminNotes });
    return res.data;
  },
  getNotifications: async () => {
    const res = await api.get('/notifications');
    return res.data;
  }
};
