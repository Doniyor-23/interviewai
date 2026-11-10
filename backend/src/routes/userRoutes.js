import { Router } from 'express';
import * as c from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { deleteRules, passwordRules, profileRules } from '../validators/userValidators.js';

const r = Router();
r.use(protect);
r.get('/profile', c.getProfile);
r.put('/profile', validate(profileRules), c.updateProfile);
r.put('/password', authLimiter, validate(passwordRules), c.changePassword);
r.delete('/account', authLimiter, validate(deleteRules), c.deleteAccount);
export default r;
