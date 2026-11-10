import { useRef } from 'react';

/** Six-digit one-time code input with paste + backspace support. */
export default function CodeInput({ value, onChange, disabled, error }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');
  const set = (next) => onChange(next.join('').slice(0, 6));

  const handle = (i, e) => {
    const v = e.target.value.replace(/\D/g, '');
    if (!v) return;
    const next = [...digits];
    v.split('').slice(0, 6 - i).forEach((ch, k) => { next[i + k] = ch; });
    set(next);
    refs.current[Math.min(i + v.length, 5)]?.focus();
  };
  const key = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) next[i] = ''; else if (i > 0) { next[i - 1] = ''; refs.current[i - 1]?.focus(); }
      set(next);
    }
    if (e.key === 'ArrowLeft') refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight') refs.current[i + 1]?.focus();
  };
  return (
    <div className="flex justify-between gap-2" role="group" aria-label="Verification code">
      {digits.map((d, i) => (
        <input key={i} ref={(el) => (refs.current[i] = el)} value={d} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={6}
          disabled={disabled} aria-label={`Digit ${i + 1}`} onChange={(e) => handle(i, e)} onKeyDown={(e) => key(i, e)} onFocus={(e) => e.target.select()}
          className={`h-14 w-full min-w-0 rounded-xl border bg-ink-900/70 text-center font-display text-2xl font-semibold focus:border-brand-violet focus:outline-none focus:ring-2 focus:ring-brand-violet/30 ${error ? 'border-red-400/60' : 'border-line'}`} />
      ))}
    </div>
  );
}
