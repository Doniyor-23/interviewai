import { collect, nameError, passwordError, str } from './common.js';

export const profileRules = (b) => {
  const e = {};
  if (b.firstName !== undefined) e.firstName = nameError(b.firstName, 'First name');
  if (b.lastName !== undefined) e.lastName = nameError(b.lastName, 'Last name');
  if (b.preferredLanguage !== undefined && !['en', 'uz'].includes(b.preferredLanguage)) e.preferredLanguage = 'Unsupported language.';
  if (b.profileImage !== undefined && b.profileImage !== '') {
    if (typeof b.profileImage !== 'string' || !/^data:image\/(png|jpe?g|webp);base64,/.test(b.profileImage)) e.profileImage = 'Profile image must be a PNG, JPEG or WebP image.';
    else if (b.profileImage.length > 400000) e.profileImage = 'Profile image is too large (max ~300 KB).';
  }
  if (b.notifications !== undefined) {
    const n = b.notifications;
    if (typeof n !== 'object' || n === null || Object.values(n).some((v) => typeof v !== 'boolean')) e.notifications = 'Invalid notification settings.';
  }
  return collect(e);
};

export const passwordRules = (b) =>
  collect({
    currentPassword: str(b.currentPassword) ? null : 'Current password is required.',
    newPassword: passwordError(b.newPassword),
    confirmPassword: b.newPassword === b.confirmPassword ? null : 'Passwords do not match.',
  });

export const deleteRules = (b) => collect({ password: str(b.password) ? null : 'Password is required to delete your account.' });
