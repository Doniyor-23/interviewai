import { Router } from 'express';
import { env } from '../config/env.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/ApiError.js';

const r = Router();

// Check if Azure Speech is configured and issue a short-lived token if available.
// If Azure Speech is not configured, return configured: false (200 OK) rather than throwing 503,
// so backend error logs are not polluted, and the frontend skips Azure Speech gracefully.
r.get('/token', protect, asyncHandler(async (_req, res) => {
  if (!env.azureSpeechKey || !env.azureSpeechRegion) {
    return res.json({
      configured: false,
      token: null,
      region: null,
      message: 'Azure Speech is not configured. Using browser speech recognition and manual text input.',
    });
  }

  try {
    const response = await fetch(`https://${env.azureSpeechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': env.azureSpeechKey, 'Content-Length': '0' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.warn('[speech] Azure Speech token issuance returned status:', response.status);
      return res.json({
        configured: false,
        token: null,
        region: env.azureSpeechRegion,
        message: 'Azure Speech is temporarily unavailable. Falling back to browser speech.',
      });
    }

    const token = await response.text();
    res.set('Cache-Control', 'no-store');
    return res.json({ configured: true, token, region: env.azureSpeechRegion });
  } catch (err) {
    console.warn('[speech] Azure Speech service unreachable:', err.message);
    return res.json({
      configured: false,
      token: null,
      region: env.azureSpeechRegion,
      message: 'Azure Speech is unreachable. Falling back to browser speech.',
    });
  }
}));

export default r;
