import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

export const protect = asyncHandler(async (req, _res, next) => {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) throw new ApiError(401, 'Not authenticated.');
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new ApiError(401, 'Session expired. Please log in again.');
  }
  const user = await User.findById(payload.id);
  if (!user || !user.isEmailVerified) throw new ApiError(401, 'Not authenticated.');
  req.user = user;
  next();
});
