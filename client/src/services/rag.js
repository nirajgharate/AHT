import { apiClient } from '../api/api';

export async function askStream(payload) {
  try {
    const response = await apiClient.post('/ask/stream', payload, {
      responseType: 'stream',
      adapter: 'fetch',
    });
    return response;
  } catch (error) {
    const message = error.response?.data?.message || 'Unable to get answer.';
    throw new Error(message);
  }
}
