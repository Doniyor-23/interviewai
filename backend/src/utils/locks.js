import { ApiError } from './ApiError.js';
// In-process per-key mutex. Rejects (409) instead of queueing, so a double-click can never run two AI calls.
const held = new Set();
export async function withLock(key, fn) {
  if (held.has(key)) throw new ApiError(409, 'This interview is already processing a request. Please wait.', { code: 'BUSY' });
  held.add(key);
  try { return await fn(); } finally { held.delete(key); }
}
