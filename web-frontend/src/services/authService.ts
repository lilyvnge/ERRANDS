import api from './api';
import type { AuthResponse, User } from '../types';

export const authService = {
    login: async (credentials: { email: string; password: string}) => {
        const response = await api.post<AuthResponse>('/auth/login', credentials);
        return response.data;
    },

    register: async (data: any) => {
        //data can be Employer registration or Vendor registration
        const response = await api.post<AuthResponse>('/auth/register', data);
        return response.data;
    },

    getMe: async () => {
        //re-fetch user data on page reload if token exists
        const response = await api.get<{ user: User }>('/auth/profile');
        return response.data;
    },

    updateProfile: async (data: Partial<User>) => {
        //add a specific route for this in the backend
        const response = await api.put<{ user: User }>('/auth/profile', data);
        return response.data 
    }
};
