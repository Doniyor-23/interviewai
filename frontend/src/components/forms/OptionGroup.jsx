/** Accessible single-choice segmented control (radio group). */
export default function OptionGroup({ label, options, value, onChange, columns = 4 }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-fg/90">{label}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${columns > 3 ? 120 : 140}px, 1fr))` }}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <label key={o.value} style={o.color ? { '--c': o.color } : undefined}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-violet ${active ? 'border-brand-violet bg-brand-violet/15 text-fg' : 'border-line bg-ink-900/60 text-muted hover:border-brand-violet/50 hover:text-fg'}`}>
              <input type="radio" className="sr-only" name={label} checked={active} onChange={() => onChange(o.value)} />
              {o.color && <span className="size-2 rounded-full bg-(--c)" />}
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
