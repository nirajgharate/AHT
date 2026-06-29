import { apiClient } from '../api/api';

export async function fetchYoutubeTranscript(url) {
  try {
    const response = await apiClient.post('/youtube/transcript', { url });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to fetch transcript.';
    throw new Error(message);
  }
}
