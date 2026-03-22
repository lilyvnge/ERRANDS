import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

type User = {
  _id: string;
  name: string;
  email: string;
  role: 'employer' | 'vendor' | 'admin';
  vendorProfile?: {
    isVerified?: boolean;
  };
  token?: string;
};

type AuthState = {
  user?: User;
  isHydrating: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
  setToken: (token?: string) => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: undefined,
  isHydrating: true,

  setToken: (token) => {
    if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
    else delete api.defaults.headers.common.Authorization;
  },

  restore: async () => {
    try {
      const raw = await AsyncStorage.getItem('auth');
      if (raw) {
        const parsed = JSON.parse(raw) as User & { token?: string };
        set({ user: parsed });
        get().setToken(parsed.token);
      }
    } catch (e) {
      console.warn('restore auth failed', e);
    } finally {
      set({ isHydrating: false });
    }
  },

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user, token } = res.data;
    const payload = { ...user, token };
    await AsyncStorage.setItem('auth', JSON.stringify(payload));
    set({ user: payload });
    get().setToken(token);
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth');
    get().setToken(undefined);
    set({ user: undefined });
  },
}));
