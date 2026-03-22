import { api } from './client';

export type Task = {
  _id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  status: string;
  paymentStatus?: string;
  location?: { address: string; coordinates?: [number, number] };
  employer?: { name?: string };
  assignedVendor?: { name?: string };
  createdAt: string;
};

export const taskApi = {
  list: async (params: Record<string, any> = {}) => {
    const res = await api.get('/tasks', { params });
    return res.data.tasks || res.data;
  },
  listMine: async (params: Record<string, any> = {}) => {
    const res = await api.get('/tasks/user/my-tasks', { params });
    return res.data.tasks || res.data;
  },
  get: async (id: string) => {
    const res = await api.get(`/tasks/${id}`);
    return res.data.task || res.data;
  },
  updateStatus: async (id: string, status: string) => {
    const res = await api.patch(`/tasks/${id}/status`, { status });
    return res.data.task || res.data;
  },
  assignSelf: async (id: string) => {
    const res = await api.patch(`/tasks/${id}/assign`);
    return res.data.task || res.data;
  },
  create: async (payload: {
    title: string;
    description: string;
    category: string;
    budget: number;
    location?: { address: string; coordinates?: [number, number] };
    urgency?: string;
    estimatedHours?: number;
  }) => {
    const res = await api.post('/tasks', payload);
    return res.data.task || res.data;
  },
  updateBudget: async (id: string, budget: number) => {
    const res = await api.put(`/tasks/${id}`, { budget });
    return res.data.task || res.data;
  },
};
