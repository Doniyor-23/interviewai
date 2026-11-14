import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import Logo from '../components/common/Logo';
import { useTranslation } from 'react-i18next';

export default function AuthLayout({ title, subtitle, children, footer }) {
  const { t } = useTranslation();
  const points = t('authLayout.points', { returnObjects: true });
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <aside className="hero-glow relative hidden flex-col justify-between border-r border-line bg-ink-950 p-12 lg:flex">
        <Logo />
        <div className="max-w-md">
          <h2 className="text-4xl font-semibold leading-tight">{t('authLayout.headline')}</h2>
          <ul className="mt-8 space-y-4">
            {points.map((p) => (
              <li key={p} className="flex gap-3 text-muted"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-violet/20 text-brand-soft"><Check size={12} /></span>{p}</li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-muted">© {new Date().getFullYear()} InterviewAI</p>
      </aside>
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden"><Logo /></div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <p className="mt-6 text-center text-sm text-muted">{footer}</p>}
        </div>
        <Link to="/" className="mx-auto text-xs text-muted hover:text-fg">← {t('authLayout.back')}</Link>
      </main>
    </div>
  );
}
