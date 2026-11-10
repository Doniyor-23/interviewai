const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isEmail = (v) => typeof v === 'string' && v.length <= 254 && EMAIL_RE.test(v.trim());
export const str = (v) => (typeof v === 'string' ? v.trim() : '');

export function passwordError(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'Password must be at least 8 characters.';
  if (pw.length > 72) return 'Password must be at most 72 characters.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password must contain at least one letter and one number.';
  return null;
}

export function nameError(v, label) {
  const s = str(v);
  if (!s) return `${label} is required.`;
  if (s.length > 50) return `${label} must be at most 50 characters.`;
  return null;
}

/** Build an errors object from { field: message|null } pairs; returns undefined if clean. */
export function collect(pairs) {
  const errors = Object.fromEntries(Object.entries(pairs).filter(([, m]) => m));
  return Object.keys(errors).length ? errors : undefined;
}
