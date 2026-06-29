import { apiClient } from '../api/api';

export async function checkHealth() {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    throw new Error('Health check failed.');
  }
}
