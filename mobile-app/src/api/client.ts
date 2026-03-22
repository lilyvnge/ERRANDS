import axios from 'axios';
import Constants from 'expo-constants';

const DEFAULT_API_URL = 'http://localhost:5000/api';

const normalizeApiUrl = (value?: string) => {
  const trimmed = value?.trim().replace(/\/+$/, '');

  if (!trimmed) {
    return DEFAULT_API_URL;
  }

  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const API_URL = normalizeApiUrl((Constants.expoConfig?.extra as any)?.API_URL);

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
});

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err?.response?.data || err)
);
