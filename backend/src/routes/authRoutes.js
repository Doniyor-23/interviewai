import { Router } from 'express';
import * as c from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, codeLimiter, resetLimiter } from '../middleware/rateLimit.js';
import { emailRules, loginRules, registerRules, resetRules, verifyRules } from '../validators/authValidators.js';

const r = Router();
r.post('/register', authLimiter, validate(registerRules), c.register);
r.post('/verify-email', codeLimiter, validate(verifyRules), c.verifyEmail);
r.post('/resend-code', codeLimiter, validate(emailRules), c.resendCode);
r.post('/login', authLimiter, validate(loginRules), c.login);
r.post('/logout', c.logout);
r.get('/me', protect, c.me);
r.post('/forgot-password', resetLimiter, validate(emailRules), c.forgotPassword);
r.post('/reset-password', resetLimiter, validate(resetRules), c.resetPassword);
export default r;
