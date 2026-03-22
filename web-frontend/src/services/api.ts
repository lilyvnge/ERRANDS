import axios from 'axios';

const DEFAULT_API_URL = 'http://localhost:5000/api';

const normalizeApiUrl = (value?: string) => {
    const trimmed = value?.trim().replace(/\/+$/, '');

    if (!trimmed) {
        return DEFAULT_API_URL;
    }

    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Add Token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 (Token Expired)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear storage and redirect to login
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
