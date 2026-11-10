import { Router } from 'express';
import * as c from '../controllers/progressController.js';
import { protect } from '../middleware/auth.js';

const r = Router();
r.use(protect);
r.get('/overview', c.overview);
r.get('/analytics', c.analytics);
export default r;
