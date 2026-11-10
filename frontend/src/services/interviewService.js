import api from './api';
const d = (p) => p.then((r) => r.data);
export const interviewService = {
  list: (params) => d(api.get('/interviews', { params })),
  get: (id) => d(api.get(`/interviews/${id}`)),
  start: (body) => d(api.post('/interviews/start', body)),
  answer: (id, body) => d(api.post(`/interviews/${id}/answer`, body)),
  nextQuestion: (id, body = {}) => d(api.post(`/interviews/${id}/next-question`, body)),
  stageFeedback: (id, body = {}) => d(api.post(`/interviews/${id}/stage-feedback`, body)),
  complete: (id, body = {}) => d(api.post(`/interviews/${id}/complete`, body, { timeout: 90000 })),
  report: (id) => d(api.get(`/interviews/${id}/report`)),
  remove: (id) => d(api.delete(`/interviews/${id}`)),
};
