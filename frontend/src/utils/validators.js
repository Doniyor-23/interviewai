export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || '').trim());
export function passwordError(pw, t) {
  if (!pw || pw.length < 8) return t ? t('validation.passwordMin') : 'Use at least 8 characters.';
  if (pw.length > 72) return t ? t('validation.passwordMax') : 'Use at most 72 characters.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return t ? t('validation.passwordMix') : 'Include at least one letter and one number.';
  return '';
}
export const required = (v, label, t) => (v && v.trim() ? '' : t ? t('validation.required', { field: label }) : `${label} is required.`);
export const clean = (errs) => Object.fromEntries(Object.entries(errs).filter(([, v]) => v));

export function passwordScore(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s; // 0-4
}
