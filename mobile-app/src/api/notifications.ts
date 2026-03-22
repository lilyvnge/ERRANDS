import { api } from './client';

export const notificationApi = {
  list: async () => {
    const res = await api.get('/notifications');
    return res.data.notifications || res.data;
  },
  markRead: async (id: string) => {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  }
};
