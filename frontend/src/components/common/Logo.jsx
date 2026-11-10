import { Link } from 'react-router-dom';

export function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="url(#lg)" />
      <path d="M7 16h2m4-6v12m5-9v6m4-3h2" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <defs><linearGradient id="lg" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#7c5cff" /><stop offset="1" stopColor="#3b82f6" /></linearGradient></defs>
    </svg>
  );
}

export default function Logo({ to = '/', className = '' }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-2.5 ${className}`} aria-label="InterviewAI home">
      <LogoMark />
      <span className="font-display text-lg font-semibold tracking-tight">Interview<span className="text-brand-soft">AI</span></span>
    </Link>
  );
}
