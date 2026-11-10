export const fullName = (u) => (u ? `${u.firstName} ${u.lastName}`.trim() : '');
export const initials = (u) => (u ? `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() : '');
export const formatDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
export function timeAgo(d) {
  if (!d) return '';
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  const steps = [[31536000, 'year'], [2592000, 'month'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
  for (const [sec, name] of steps) if (s >= sec) { const n = Math.floor(s / sec); return `${n} ${name}${n > 1 ? 's' : ''} ago`; }
  return 'just now';
}
export const STATUS_LABEL = { draft: 'Draft', in_progress: 'In progress', completed: 'Completed', abandoned: 'Abandoned' };
export const scoreText = (s) => (s == null ? '—' : `${Math.round(s)}`);
