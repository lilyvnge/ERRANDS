import api from './api';
import type { Task, TaskCategory, TaskStatus } from '../types';

interface CreateTaskData {
    title: string;
    description: string;
    category: TaskCategory;
    budget: number;
    urgency: string;
    estimatedHours?: number;
    location?: {
        address: string;
        coordinates: [number, number];
    };
}

interface TaskFilters {
    category?: string;
    status?: string;
    minBudget?: number;
    maxBudget?: number;
    latitude?: number;
    longitude?: number;
    maxDistance?: number; 
}

export const taskService = {
    // Create
    create: async (data: CreateTaskData) => {
        const response = await api.post<{ task: Task}>('/tasks', data);
        return response.data;
    },

    // Get All (Feed)
    getAll: async (filters: TaskFilters = {}, page = 1) => {
        const params = { ...filters, page };
        const response = await api.get<{ tasks: Task[]; total: number; totalPages: number }>('/tasks', { params });
        return response.data;
    },

    // Get Single
  getById: async (id: string) => {
    const response = await api.get<{ task: Task }>(`/tasks/${id}`);
    return response.data;
  },

  // Get My Tasks (Employer/Vendor)
  getMyTasks: async (type: 'employer' | 'vendor' | 'all', page = 1) => {
    const response = await api.get(`/tasks/user/my-tasks`, { params: { type, page } });
    return response.data;
  },

  // Vendor assigns self
  assignSelf: async (taskId: string) => {
    const response = await api.patch<{ task: Task }>(`/tasks/${taskId}/assign`);
    return response.data;
  },

  // Update Status
  updateStatus: async (taskId: string, status: TaskStatus) => {
    const response = await api.patch<{ task: Task }>(`/tasks/${taskId}/status`, { status });
    return response.data;
  },

  // Update Budget (Employer only, before assignment)
  updateBudget: async (taskId: string, budget: number) => {
    const response = await api.put<{ task: Task }>(`/tasks/${taskId}`, { budget });
    return response.data;
  },

  // Rate User
  rateUser: async (taskId: string, data: { rating: number; comment: string; rateeRole: 'employer' | 'vendor' }) => {
    const response = await api.post(`/tasks/${taskId}/rate`, data); // Note: Route is /api/tasks/:id/rate per app.js
    return response.data;
  }
};
