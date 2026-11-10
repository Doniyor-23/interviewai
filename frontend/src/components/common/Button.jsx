import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-brand-violet text-white hover:bg-[#6d4cf0] shadow-[0_10px_30px_-12px_rgba(124,92,255,0.9)]',
  secondary: 'border border-line bg-ink-700 text-fg hover:bg-ink-600',
  ghost: 'text-muted hover:bg-ink-700 hover:text-fg',
  danger: 'bg-red-500/90 text-white hover:bg-red-500',
  outlineDanger: 'border border-red-400/40 text-red-300 hover:bg-red-500/10',
};
const sizes = { sm: 'h-9 px-3.5 text-sm', md: 'h-11 px-5 text-sm', lg: 'h-12 px-6 text-base' };

export default function Button({ variant = 'primary', size = 'md', loading = false, to, icon: Icon, iconRight: IconR, className = '', children, ...props }) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${variants[variant]} ${sizes[size]} ${className}`;
  const content = (
    <>
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon && <Icon size={16} />}
      {children}
      {IconR && !loading && <IconR size={16} />}
    </>
  );
  if (to) return <Link to={to} className={cls} {...props}>{content}</Link>;
  return <button className={cls} disabled={loading || props.disabled} {...props}>{content}</button>;
}
