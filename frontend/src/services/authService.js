import api from './api';
const d = (p) => p.then((r) => r.data);
export const authService = {
  register: (body) => d(api.post('/auth/register', body)),
  verifyEmail: (body) => d(api.post('/auth/verify-email', body)),
  resendCode: (email) => d(api.post('/auth/resend-code', { email })),
  login: (body) => d(api.post('/auth/login', body)),
  logout: () => d(api.post('/auth/logout')),
  me: () => d(api.get('/auth/me')),
  forgotPassword: (email) => d(api.post('/auth/forgot-password', { email })),
  resetPassword: (body) => d(api.post('/auth/reset-password', body)),
};
