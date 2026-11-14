import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const BARS = [0.35, 0.6, 0.85, 0.5, 1, 0.7, 0.4, 0.9, 0.55, 0.8, 0.45, 0.95, 0.6, 0.35, 0.75, 0.5, 0.9, 0.4, 0.65, 0.3];

export function Waveform({ active, tone = 'ai', height = 56 }) {
  const grad = tone === 'user' ? 'from-emerald-400 to-sky-400' : 'from-brand-blue to-brand-violet';
  return (
    <div className="flex items-center justify-center gap-1" style={{ height }} aria-hidden="true">
      {BARS.map((h, i) => (
        <span key={i} className={`w-1 rounded-full bg-gradient-to-t ${grad} ${active ? 'wave-bar' : ''}`}
          style={{ height: `${active ? h * 100 : 10}%`, animationDelay: `${i * 70}ms`, opacity: active ? 1 : 0.35, transition: 'height .3s, opacity .3s' }} />
      ))}
    </div>
  );
}

/** The AI interviewer: an orb that breathes when idle, rings when speaking. */
export function AiOrb({ speaking, thinking }) {
  return (
    <div className="relative grid size-28 place-items-center sm:size-32" aria-hidden="true">
      {speaking && <><span className="ring-pulse absolute inset-0 rounded-full bg-brand-violet/40" /><span className="ring-pulse absolute inset-0 rounded-full bg-brand-blue/30 [animation-delay:700ms]" /></>}
      <div className={`relative grid size-20 place-items-center rounded-full bg-gradient-to-br from-brand-violet to-brand-blue shadow-[0_0_50px_-8px_rgba(124,92,255,0.9)] sm:size-24 ${speaking ? '' : 'breathe'}`}>
        <svg width="34" height="34" viewBox="0 0 32 32"><path d="M7 16h2m4-6v12m5-9v6m4-3h2" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" /></svg>
      </div>
      {thinking && <span className="absolute -bottom-1 flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="dot-anim size-1.5 rounded-full bg-brand-soft" style={{ animationDelay: `${i * 200}ms` }} />)}</span>}
    </div>
  );
}

export function ScoreRing({ value, size = 120, stroke = 10, label }) {
  const [v, setV] = useState(0);
  useEffect(() => { const t = setTimeout(() => setV(value ?? 0), 60); return () => clearTimeout(t); }, [value]);
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const color = value == null ? '#8d98c4' : value >= 75 ? '#34d399' : value >= 50 ? '#fbbf24' : '#f87171';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Score ${value ?? 'not available'} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#182450" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.7,.2,1)' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><p className="font-display font-semibold" style={{ fontSize: size * 0.3, lineHeight: 1 }}>{value ?? '—'}</p>{label && <p className="mt-0.5 text-[11px] text-muted">{label}</p>}</div>
      </div>
    </div>
  );
}

export function MiniBar({ label, value }) {
  const color = value == null ? '#8d98c4' : value >= 75 ? '#34d399' : value >= 50 ? '#fbbf24' : '#f87171';
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span className="text-muted">{label}</span><span>{value ?? '—'}</span></div>
      <div className="h-1.5 rounded-full bg-ink-600"><div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${value ?? 0}%`, background: color }} /></div>
    </div>
  );
}

export const STATUS_META = {
  preparing: ['Preparing interview', 'bg-sky-400/12 text-sky-300'],
  speaking: ['AI speaking', 'bg-brand-violet/20 text-brand-soft'],
  waiting: ['Waiting for you', 'bg-amber-400/12 text-amber-300'],
  listening: ['Listening', 'bg-emerald-400/12 text-emerald-300'],
  processing: ['Processing answer', 'bg-sky-400/12 text-sky-300'],
  review: ['Feedback ready', 'bg-emerald-400/12 text-emerald-300'],
  preparing_next: ['Preparing next question', 'bg-sky-400/12 text-sky-300'],
  stage_loading: ['Generating feedback', 'bg-sky-400/12 text-sky-300'],
  stage_feedback: ['Stage complete', 'bg-emerald-400/12 text-emerald-300'],
  completing: ['Building your report', 'bg-sky-400/12 text-sky-300'],
  completed: ['Interview completed', 'bg-emerald-400/12 text-emerald-300'],
};
export function StatusPill({ status, paused }) {
  const { t } = useTranslation();
  const [defaultLabel, cls] = paused ? ['Paused', 'bg-slate-400/15 text-slate-300'] : STATUS_META[status] || ['', ''];
  const label = paused ? t('feedback.status.paused') : t(`feedback.status.${status}`, defaultLabel);
  if (!label) return null;
  return <span role="status" aria-live="polite" className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${cls}`}><span className="size-2 rounded-full bg-current" />{label}</span>;
}
