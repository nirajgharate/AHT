import { apiClient } from '../api/api';

export async function login(email, password) {
  try {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Login failed.';
    throw new Error(message);
  }
}

export async function register(email, password) {
  try {
    const response = await apiClient.post('/auth/register', { email, password });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Registration failed.';
    throw new Error(message);
  }
}
