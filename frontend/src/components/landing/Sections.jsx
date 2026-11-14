import { ArrowRight, BarChart3, Brain, ChevronDown, Compass, Languages, LineChart, Mic, ShieldCheck, Target, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CAREERS } from '../../utils/careers';
import { useAuth } from '../../context/AuthContext';
import Button from '../common/Button';
import { useTranslation } from 'react-i18next';

export const SectionHead = ({ title, text }) => (
  <div className="mb-12 max-w-2xl"><h2 className="text-3xl font-semibold sm:text-4xl">{title}</h2>{text && <p className="mt-3 text-lg text-muted">{text}</p>}</div>
);

export function Features() {
  const { t } = useTranslation();
  const items = t('landing.features.items', { returnObjects: true });
  const icons = [Mic, Brain, Target, BarChart3, Languages, LineChart];
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
      <SectionHead title={t('landing.features.head')} text={t('landing.features.sub')} />
      <div className="grid gap-x-12 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
        {items.map(([title, d], i) => { const Icon = icons[i]; return (
          <div key={title} className="border-t border-line pt-5">
            <Icon className="text-brand-soft" size={22} />
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
          </div>
        ); })}
      </div>
    </section>
  );
}

export function HowItWorks() {
  const { t } = useTranslation();
  const steps = t('landing.how.items', { returnObjects: true });
  return (
    <section id="how" className="scroll-mt-20 border-y border-line bg-ink-950/60 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead title={t('landing.how.head')} />
        <ol className="grid gap-8 md:grid-cols-4">
          {steps.map(([t, d], i) => (
            <li key={t} className="relative">
              <span className="font-display text-5xl font-semibold text-brand-violet/40">{i + 1}</span>
              <h3 className="mt-2 text-lg font-semibold">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function CareerCategories() {
  const { user } = useAuth();
  const { t } = useTranslation();
  return (
    <section id="careers" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
      <SectionHead title={t('landing.careers.head')} text={t('landing.careers.sub')} />
      <div className="grid gap-4 sm:grid-cols-2">
        {CAREERS.map((c) => (
          <Link key={c.id} to={user ? '/careers' : '/register'} style={{ '--c': c.color }} className="group surface tint-border flex gap-5 p-6 transition-colors hover:bg-ink-700/70">
            <span className="tint grid size-12 shrink-0 place-items-center rounded-xl"><c.icon size={22} /></span>
            <div>
              <h3 className="text-lg font-semibold">{t(`setup.careers.${c.id}`, c.title)}</h3>
              <p className="mt-1.5 text-sm text-muted">{c.skills.slice(0, 5).join(', ')}</p>
            </div>
            <ArrowRight size={18} className="ml-auto mt-1 shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-fg" />
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ReportPreview() {
  const { t } = useTranslation();
  const skills = t('landing.report.skills', { returnObjects: true });
  return (
    <section className="border-y border-line bg-ink-950/60 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold sm:text-4xl">{t('landing.report.head')}</h2>
          <p className="mt-4 text-lg text-muted">{t('landing.report.sub')}</p>
          <ul className="mt-6 space-y-3 text-muted">
            {t('landing.report.bullets', { returnObjects: true }).map((line) => <li key={line} className="flex items-center gap-3"><ShieldCheck size={18} className="text-brand-soft" />{line}</li>)}
          </ul>
        </div>
        <div className="surface p-6" style={{ '--c': '#38bdf8' }}>
          <div className="flex items-start justify-between">
            <div><p className="text-xs text-muted">{t('landing.report.sample')}</p><p className="mt-1 font-display text-lg font-semibold">{t('setup.careers.frontend')} · {t('setup.levels.junior')}</p></div>
            <div className="text-right"><p className="font-display text-4xl font-semibold text-emerald-300">82</p><p className="text-xs text-muted">{t('landing.report.overall')}</p></div>
          </div>
          <div className="mt-6 space-y-4">
            {skills.map(([n, v]) => (
              <div key={n}>
                <div className="mb-1.5 flex justify-between text-sm"><span>{n}</span><span className="text-muted">{v}</span></div>
                <div className="h-2 rounded-full bg-ink-600"><div className="h-2 rounded-full bg-gradient-to-r from-brand-blue to-brand-violet" style={{ width: `${v}%` }} /></div>
              </div>
            ))}
          </div>
          <p className="mt-6 rounded-xl bg-ink-900/70 p-4 text-sm leading-relaxed text-muted">{t('landing.report.sampleText')}</p>
        </div>
      </div>
    </section>
  );
}

export function Benefits() {
  const { t } = useTranslation();
  const items = t('landing.benefits.items', { returnObjects: true });
  const icons = [Timer, Compass, Mic, ShieldCheck];
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <SectionHead title={t('landing.benefits.head')} />
      <div className="grid gap-5 sm:grid-cols-2">
        {items.map(([title, d], i) => { const Icon = icons[i]; return (
          <div key={title} className="flex gap-4 rounded-2xl bg-ink-800/60 p-6">
            <Icon className="mt-1 shrink-0 text-brand-soft" size={22} />
            <div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-muted">{d}</p></div>
          </div>
        ); })}
      </div>
    </section>
  );
}

export function Faq() {
  const { t } = useTranslation();
  const qs = t('landing.faq.items', { returnObjects: true });
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-24">
      <h2 className="mb-10 text-3xl font-semibold sm:text-4xl">{t('landing.faq.head')}</h2>
      <div className="divide-y divide-line border-y border-line">
        {qs.map(([q, a]) => (
          <details key={q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-semibold [&::-webkit-details-marker]:hidden">
              {q}<ChevronDown size={18} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 leading-relaxed text-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  const { user } = useAuth();
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24">
      <div className="hero-glow rounded-3xl border border-line bg-ink-800 px-8 py-14 text-center">
        <h2 className="text-3xl font-semibold sm:text-4xl">{t('landing.cta.head')}</h2>
        <p className="mx-auto mt-3 max-w-lg text-muted">{t('landing.cta.sub')}</p>
        <Button to={user ? '/careers' : '/register'} size="lg" className="mt-8" iconRight={ArrowRight}>{t('landing.cta.start')}</Button>
      </div>
    </section>
  );
}
