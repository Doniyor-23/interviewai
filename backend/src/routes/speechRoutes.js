import { Router } from 'express';
import { env } from '../config/env.js';
import { protect } from '../middleware/auth.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

const r = Router();

// Issue a short-lived Azure Speech token. The subscription key never leaves the backend.
r.get('/token', protect, asyncHandler(async (_req, res) => {
  if (!env.azureSpeechFreeTierOnly || !env.azureSpeechKey || !env.azureSpeechRegion) {
    throw new ApiError(503, 'Azure Speech is not configured. You can still type your answer or use the browser voice.');
  }
  const response = await fetch(`https://${env.azureSpeechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': env.azureSpeechKey, 'Content-Length': '0' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new ApiError(503, 'Azure Speech is temporarily unavailable. Type your answer instead.');
  res.set('Cache-Control', 'no-store');
  res.json({ token: await response.text(), region: env.azureSpeechRegion });
}));

export default r;
