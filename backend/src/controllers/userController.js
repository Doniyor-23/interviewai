import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { Interview } from '../models/Interview.js';
import { EmailVerification } from '../models/EmailVerification.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { clearAuthCookie } from '../utils/tokens.js';
import { str } from '../validators/common.js';

export const getProfile = (req, res) => res.json({ success: true, user: req.user });

export const updateProfile = asyncHandler(async (req, res) => {
  const b = req.body;
  const user = req.user;
  if (b.firstName !== undefined) user.firstName = str(b.firstName);
  if (b.lastName !== undefined) user.lastName = str(b.lastName);
  if (b.preferredLanguage !== undefined) user.preferredLanguage = b.preferredLanguage;
  if (b.profileImage !== undefined) user.profileImage = b.profileImage;
  if (b.notifications) {
    for (const k of ['email', 'practiceReminders', 'productUpdates']) {
      if (typeof b.notifications[k] === 'boolean') user.notifications[k] = b.notifications[k];
    }
  }
  await user.save();
  res.json({ success: true, message: 'Profile updated.', user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await bcrypt.compare(req.body.currentPassword, user.password))) {
    throw new ApiError(400, 'Current password is incorrect.', { errors: { currentPassword: 'Incorrect password.' } });
  }
  user.password = await bcrypt.hash(req.body.newPassword, 12);
  await user.save();
  res.json({ success: true, message: 'Password changed.' });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await bcrypt.compare(req.body.password, user.password))) {
    throw new ApiError(400, 'Password is incorrect.', { errors: { password: 'Incorrect password.' } });
  }
  await Promise.all([Interview.deleteMany({ userId: user._id }), EmailVerification.deleteMany({ userId: user._id }), User.deleteOne({ _id: user._id })]);
  clearAuthCookie(res);
  res.json({ success: true, message: 'Your account and data were deleted.' });
});
