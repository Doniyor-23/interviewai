import api from './api';

export async function getAzureSpeechToken() {
  try {
    const response = await api.get('/speech/token');
    return response.data || { configured: false, token: null, region: null };
  } catch (err) {
    return { configured: false, token: null, region: null, message: err?.message || 'Azure Speech unavailable' };
  }
}
