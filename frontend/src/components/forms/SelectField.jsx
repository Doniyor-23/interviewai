import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
export default function SelectField({ label, options, className = '', ...props }) {
  const id = useId();
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fg/90">{label}</label>}
      <div className="relative">
        <select id={id} className="h-11 w-full appearance-none rounded-xl border border-line bg-ink-900/70 pl-3.5 pr-10 text-sm text-fg focus:border-brand-violet focus:outline-none focus:ring-2 focus:ring-brand-violet/30" {...props}>
          {options.map((o) => <option key={o.value} value={o.value} className="bg-ink-800">{o.label}</option>)}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}
