import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = (Constants.expoConfig?.extra as any)?.API_URL;

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
