import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

const WEEK = 7 * 24 * 60 * 60 * 1000;

export const signToken = (userId) => jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: '7d' });

const cookieOpts = () => ({ httpOnly: true, secure: env.isProd, sameSite: 'lax', path: '/' });

export const setAuthCookie = (res, userId) => res.cookie('token', signToken(userId), { ...cookieOpts(), maxAge: WEEK });
export const clearAuthCookie = (res) => res.clearCookie('token', cookieOpts());

export const generateCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
export const randomToken = () => crypto.randomBytes(32).toString('hex');
export const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
