import { create } from 'zustand';
import { authService } from '../services/authService';
import { socketService } from '../services/socketService';
import type { User } from '../types';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (credentials: { email: string; password: string }) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => void;
    initializeAuth: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token'),
    isLoading: false,
    error: null,
        
    login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
            const data = await authService.login(credentials);

            // 1. Save Token
            localStorage.setItem('token', data.token);

            // 2. Update State
            set({
                user: data.user,
                token: data.token,
                isAuthenticated: true,
                    isLoading: false,
            });

            // 3. Connect Socket (Real-time chat/notofications
            socketService.connect();

        } catch (err: any) {
            set({
                error: err.response?.data?.message || 'Login failed',
                isLoading: false
            });
            throw err;
        }
    },

    register: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authService.register(data);
            localStorage.setItem('token', response.token);

            set({
                user: response.user,
                token: response.token,
                isAuthenticated: true,
                isLoading: false
            });

            socketService.connect();

        } catch (err: any) {
            set({
                error: err.response?.data?.message || 'Registration failed',
                isLoading: false
            });
            throw err;
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        socketService.disconnect();
        set({ user: null, token: null, isAuthenticated: false });
    },

    initializeAuth: async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const data = await authService.getMe();
            set({ user: data.user, isAuthenticated: true });
            socketService.connect();
        } catch (err) {
            // If token is invalid (expired), log out
            get().logout();
        }
    },

    clearError: () => set({ error: null })
}));