import { passwordScore } from '../../utils/validators';
const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
const colors = ['bg-red-400', 'bg-red-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-400'];
export default function PasswordStrength({ password }) {
  if (!password) return null;
  const s = passwordScore(password);
  return (
    <div className="-mt-1 flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-1 flex-1 rounded-full ${i < s ? colors[s] : 'bg-ink-600'}`} />)}</div>
      <span className="w-16 text-right text-xs text-muted">{labels[s]}</span>
    </div>
  );
}
