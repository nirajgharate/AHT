import { apiClient } from '../api/api';

export async function fetchDocuments() {
  try {
    const response = await apiClient.get('/documents');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to load documents.';
    throw new Error(message);
  }
}

export async function deleteDocument(docId) {
  try {
    const response = await apiClient.delete(`/documents/${docId}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Unable to delete document.';
    throw new Error(message);
  }
}

export async function extractTextFromFile(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/extract-text', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to extract text from document.';
    throw new Error(message);
  }
}

export async function summarizeStream(payload) {
  try {
    const response = await apiClient.post('/summarize/stream', payload, {
      responseType: 'stream',
      adapter: 'fetch',
    });
    return response;
  } catch (error) {
    // If the stream failed to start, parse error message if available
    const message = error.response?.data?.message || 'Unable to summarize text.';
    throw new Error(message);
  }
}
