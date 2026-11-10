import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { EmailVerification } from '../models/EmailVerification.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { clearAuthCookie, generateCode, randomToken, setAuthCookie, sha256 } from '../utils/tokens.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService.js';
import { str } from '../validators/common.js';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_S = 60;
const MAX_ATTEMPTS = 5;
const RESET_TTL_MS = 30 * 60 * 1000;
const normEmail = (e) => str(e).toLowerCase();

async function issueVerificationCode(user) {
  const existing = await EmailVerification.findOne({ userId: user._id });
  if (existing) {
    const wait = Math.ceil(RESEND_COOLDOWN_S - (Date.now() - existing.lastSentAt.getTime()) / 1000);
    if (wait > 0) throw new ApiError(429, `Please wait ${wait}s before requesting another code.`, { retryAfter: wait });
  }
  const code = generateCode();
  await EmailVerification.findOneAndUpdate(
    { userId: user._id },
    { codeHash: await bcrypt.hash(code, 10), expiresAt: new Date(Date.now() + CODE_TTL_MS), lastSentAt: new Date(), attempts: 0 },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  await sendVerificationEmail(user.email, user.firstName, code);
}

export const register = asyncHandler(async (req, res) => {
  const email = normEmail(req.body.email);
  const firstName = str(req.body.firstName);
  const lastName = str(req.body.lastName);
  const hash = await bcrypt.hash(req.body.password, 12);

  let user = await User.findOne({ email }).select('+password');
  if (user?.isEmailVerified) throw new ApiError(409, 'An account with this email already exists.', { errors: { email: 'Email already registered.' } });

  if (user) {
    // Unverified leftover registration: refresh details and re-send a code.
    Object.assign(user, { firstName, lastName, password: hash });
    await user.save();
  } else {
    user = await User.create({ firstName, lastName, email, password: hash });
  }
  await issueVerificationCode(user);
  res.status(201).json({ success: true, message: 'Verification code sent. Check your email.', email, resendAfter: RESEND_COOLDOWN_S });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: normEmail(req.body.email) });
  const invalid = new ApiError(400, 'Invalid or expired code.');
  if (!user) throw invalid;
  if (user.isEmailVerified) throw new ApiError(400, 'This email is already verified. Please log in.');

  const record = await EmailVerification.findOne({ userId: user._id });
  if (!record || record.expiresAt < new Date()) throw new ApiError(400, 'This code has expired. Request a new one.', { code: 'CODE_EXPIRED' });
  if (record.attempts >= MAX_ATTEMPTS) throw new ApiError(429, 'Too many incorrect attempts. Request a new code.', { code: 'TOO_MANY_ATTEMPTS' });

  const ok = await bcrypt.compare(str(req.body.code), record.codeHash);
  if (!ok) {
    record.attempts += 1;
    await record.save();
    const left = MAX_ATTEMPTS - record.attempts;
    throw new ApiError(400, left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many incorrect attempts. Request a new code.');
  }

  user.isEmailVerified = true;
  await user.save();
  await EmailVerification.deleteOne({ _id: record._id });
  setAuthCookie(res, user._id); // auto-login after verification
  res.json({ success: true, message: 'Email verified. Welcome to InterviewAI!', user });
});

export const resendCode = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: normEmail(req.body.email) });
  // Same response whether or not the account exists (no account enumeration).
  if (user && !user.isEmailVerified) await issueVerificationCode(user);
  res.json({ success: true, message: 'If that account needs verification, a new code has been sent.', resendAfter: RESEND_COOLDOWN_S });
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: normEmail(req.body.email) }).select('+password');
  const ok = user ? await bcrypt.compare(req.body.password, user.password) : await bcrypt.compare(req.body.password, '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi');
  if (!user || !ok) throw new ApiError(401, 'Invalid email or password.');
  if (!user.isEmailVerified) throw new ApiError(403, 'Please verify your email before logging in.', { code: 'EMAIL_NOT_VERIFIED', email: user.email });
  setAuthCookie(res, user._id);
  res.json({ success: true, user });
});

export const logout = (_req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out.' });
};

export const me = (req, res) => res.json({ success: true, user: req.user });

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: normEmail(req.body.email) });
  if (user?.isEmailVerified) {
    const token = randomToken();
    user.passwordResetTokenHash = sha256(token);
    user.passwordResetExpires = new Date(Date.now() + RESET_TTL_MS);
    await user.save();
    const link = `${env.clientUrl}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
    await sendPasswordResetEmail(user.email, user.firstName, link);
  }
  res.json({ success: true, message: 'If an account exists for that email, a reset link has been sent.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    email: normEmail(req.body.email),
    passwordResetTokenHash: sha256(req.body.token),
    passwordResetExpires: { $gt: new Date() },
  }).select('+password +passwordResetTokenHash +passwordResetExpires');
  if (!user) throw new ApiError(400, 'This reset link is invalid or has expired.');
  user.password = await bcrypt.hash(req.body.password, 12);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  clearAuthCookie(res);
  res.json({ success: true, message: 'Password updated. You can now log in.' });
});
