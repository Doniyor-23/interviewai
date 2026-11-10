import rateLimit from 'express-rate-limit';

const make = (windowMin, max, message) =>
  rateLimit({
    windowMs: windowMin * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
  });

export const generalLimiter = make(15, 600, 'Too many requests. Please slow down.');
export const authLimiter = make(15, 30, 'Too many attempts. Please try again in a few minutes.');
export const codeLimiter = make(10, 12, 'Too many code requests. Please try again later.');
export const resetLimiter = make(60, 8, 'Too many reset requests. Please try again later.');
// Protects the Gemini quota: per-IP cap on AI-backed calls.
export const aiLimiter = make(10, 120, 'Too many AI requests. Please slow down for a few minutes.');
