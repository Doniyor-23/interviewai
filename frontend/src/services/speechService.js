import api from './api';

export async function getAzureSpeechToken() {
  const response = await api.get('/speech/token');
  return response.data;
}
