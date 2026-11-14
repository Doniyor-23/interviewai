export const fullName = (u) => (u ? `${u.firstName} ${u.lastName}`.trim() : '');
export const initials = (u) => (u ? `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() : '');
export const formatDate = (d, locale = 'uz') => (d ? new Date(d).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
export function timeAgo(d, locale = 'uz') {
  if (!d) return '';
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  const steps = [[31536000, 'year'], [2592000, 'month'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [sec, unit] of steps) if (s >= sec) return rtf.format(-Math.floor(s / sec), unit);
  return rtf.format(0, 'second');
}
export const STATUS_LABEL = { draft: 'Draft', in_progress: 'In progress', completed: 'Completed', abandoned: 'Abandoned' };
export const scoreText = (s) => (s == null ? '—' : `${Math.round(s)}`);
