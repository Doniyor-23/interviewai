import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', withCredentials: true, timeout: 60000 });

/** Normalises every failure into { status, message, errors, code, retryAfter, email }. */
export const parseError = (err) => {
  const d = err.response?.data;
  return {
    status: err.response?.status,
    message: d?.message || (err.code === 'ERR_NETWORK' ? 'Cannot reach the server. Make sure the backend is running.' : 'Something went wrong. Please try again.'),
    errors: d?.errors || {},
    code: d?.code,
    retryAfter: d?.retryAfter,
    email: d?.email,
    data: d || {},
  };
};

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    if (err.response?.status === 401 && !url.startsWith('/auth/')) window.dispatchEvent(new Event('auth:expired'));
    return Promise.reject(parseError(err));
  }
);

export default api;
