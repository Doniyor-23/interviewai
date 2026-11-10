import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Input({ label, error, hint, icon: Icon, type = 'text', className = '', ...props }) {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fg/90">{label}</label>}
      <div className="relative">
        {Icon && <Icon size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />}
        <input
          id={id}
          type={isPw && show ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-e` : undefined}
          className={`h-11 w-full rounded-xl border bg-ink-900/70 text-sm text-fg transition-colors placeholder:text-[#5b678f] focus:border-brand-violet focus:outline-none focus:ring-2 focus:ring-brand-violet/30 disabled:opacity-60 ${Icon ? 'pl-10' : 'pl-3.5'} ${isPw ? 'pr-11' : 'pr-3.5'} ${error ? 'border-red-400/60' : 'border-line'}`}
          {...props}
        />
        {isPw && (
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg">
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
      {error ? <p id={`${id}-e`} className="mt-1.5 text-xs text-red-300">{error}</p> : hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
