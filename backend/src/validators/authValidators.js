import { collect, isEmail, nameError, passwordError, str } from './common.js';

export const registerRules = (b) =>
  collect({
    firstName: nameError(b.firstName, 'First name'),
    lastName: nameError(b.lastName, 'Last name'),
    email: isEmail(b.email) ? null : 'Enter a valid email address.',
    password: passwordError(b.password),
    confirmPassword: b.password === b.confirmPassword ? null : 'Passwords do not match.',
  });

export const verifyRules = (b) =>
  collect({
    email: isEmail(b.email) ? null : 'Enter a valid email address.',
    code: /^\d{6}$/.test(str(b.code)) ? null : 'Enter the 6-digit code.',
  });

export const emailRules = (b) => collect({ email: isEmail(b.email) ? null : 'Enter a valid email address.' });

export const loginRules = (b) =>
  collect({
    email: isEmail(b.email) ? null : 'Enter a valid email address.',
    password: str(b.password) ? null : 'Password is required.',
  });

export const resetRules = (b) =>
  collect({
    email: isEmail(b.email) ? null : 'Enter a valid email address.',
    token: /^[a-f0-9]{64}$/.test(str(b.token)) ? null : 'Reset link is invalid.',
    password: passwordError(b.password),
    confirmPassword: b.password === b.confirmPassword ? null : 'Passwords do not match.',
  });
