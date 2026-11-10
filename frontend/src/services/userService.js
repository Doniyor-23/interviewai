import api from './api';
const d = (p) => p.then((r) => r.data);
export const userService = {
  getProfile: () => d(api.get('/users/profile')),
  updateProfile: (body) => d(api.put('/users/profile', body)),
  changePassword: (body) => d(api.put('/users/password', body)),
  deleteAccount: (password) => d(api.delete('/users/account', { data: { password } })),
};
