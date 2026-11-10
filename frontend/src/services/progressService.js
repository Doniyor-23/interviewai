import api from './api';
const d = (p) => p.then((r) => r.data);
export const progressService = {
  overview: () => d(api.get('/progress/overview')),
  analytics: () => d(api.get('/progress/analytics')),
};
