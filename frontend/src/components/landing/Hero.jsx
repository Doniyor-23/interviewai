import { ArrowRight, Mic } from 'lucide-react';
import Button from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

const bars = [0.5, 0.9, 0.4, 1, 0.65, 0.85, 0.35, 0.95, 0.55, 0.8, 0.45, 0.7, 0.3, 0.9, 0.6];

export default function Hero() {
  const { user } = useAuth();
  const { t } = useTranslation();
  return (
    <section className="hero-glow relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-16 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
        <div className="rise">
          <h1 className="text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">{t('landing.hero.title')}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{t('landing.hero.text')}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button to={user ? '/careers' : '/register'} size="lg" iconRight={ArrowRight}>{t('landing.hero.start')}</Button>
            <Button size="lg" variant="secondary" onClick={() => { document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>{t('landing.hero.features')}</Button>
          </div>
          <p className="mt-6 text-sm text-muted">{t('landing.hero.roles')}</p>
        </div>

        {/* The memorable moment: a live-feeling interview exchange */}
        <div className="rise relative [animation-delay:150ms]" aria-hidden="true">
          <div className="absolute -inset-6 rounded-[2rem] bg-brand-violet/10 blur-3xl" />
          <div className="relative rounded-3xl border border-line bg-ink-800/90 p-6 shadow-2xl">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{t('landing.hero.role')}</span><span className="rounded-full bg-emerald-400/12 px-2.5 py-1 font-semibold text-emerald-300">{t('landing.hero.live')}</span>
            </div>
            <p className="mt-5 text-xs text-muted">{t('landing.hero.interviewer')}</p>
            <p className="mt-1 font-display text-xl leading-snug">{t('landing.hero.question')}</p>
            <div className="mt-6 flex h-20 items-center justify-center gap-1.5 rounded-2xl bg-ink-900/80 px-4">
              {bars.map((h, i) => <span key={i} className="wave-bar w-1.5 rounded-full bg-gradient-to-t from-brand-blue to-brand-violet" style={{ height: `${h * 100}%`, animationDelay: `${i * 90}ms` }} />)}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted"><span className="grid size-9 place-items-center rounded-full bg-brand-violet text-white"><Mic size={16} /></span>{t('landing.hero.listening')}</div>
              <span className="font-display text-sm text-muted">02:14</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
