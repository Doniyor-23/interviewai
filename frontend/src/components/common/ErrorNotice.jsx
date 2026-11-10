import { AlertCircle } from 'lucide-react';
import Button from './Button';
export default function ErrorNotice({ error, onRetry }) {
  return (
    <div className="surface flex flex-col items-center gap-3 p-8 text-center" role="alert">
      <AlertCircle className="text-red-300" />
      <p className="text-sm text-muted">{error?.message || 'Something went wrong.'}</p>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
export const FormAlert = ({ children, tone = 'error' }) =>
  children ? (
    <div role="alert" className={`rounded-xl border px-4 py-3 text-sm ${tone === 'error' ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'}`}>{children}</div>
  ) : null;
