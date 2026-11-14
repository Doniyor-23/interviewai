import { Award, CheckCircle2, ListChecks, PlayCircle, Sparkles, Timer, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { progressService } from '../../services/progressService';
import StatCard from '../../components/dashboard/StatCard';
import RecentHistory from '../../components/dashboard/RecentHistory';
import EmptyState from '../../components/common/EmptyState';
import ErrorNotice from '../../components/common/ErrorNotice';
import Button from '../../components/common/Button';
import { PageLoader } from '../../components/common/Spinner';
import { CAREERS, careerLabel } from '../../utils/careers';
import { scoreText, timeAgo } from '../../utils/format';
import { useTranslation } from 'react-i18next';

function nextAction(o, t) {
  if (o.activeInterview) return { title: t('dashboard.pickupTitle', { career: t(`setup.careers.${o.activeInterview.career}`) }), text: t('dashboard.inProgress'), to: `/interview/room/${o.activeInterview._id}`, cta: t('dashboard.continue') };
  if (o.totalInterviews === 0) return { title: t('dashboard.firstTitle'), text: t('dashboard.firstText'), to: '/careers', cta: t('dashboard.chooseCareer') };
  if (o.averageScore != null && o.averageScore < 60) return { title: t('dashboard.reviewTitle'), text: t('dashboard.reviewText'), to: '/interviews', cta: t('dashboard.openInterviews') };
  return { title: t('dashboard.raiseTitle'), text: t('dashboard.raiseText'), to: '/careers', cta: t('dashboard.startAnother') };
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(progressService.overview, []);
  if (loading) return <PageLoader />;
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  const next = nextAction(data, t);
  const byCareer = Object.fromEntries(data.careerBreakdown.map((c) => [c.career, c]));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-semibold">{t('dashboard.welcome', { name: user.firstName })}</h1><p className="mt-1.5 text-muted">{t('dashboard.subtitle')}</p></div>
        <Button to="/careers" icon={PlayCircle}>{t('setup.start')}</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ListChecks} label={t('dashboard.totalInterviews')} value={data.totalInterviews} />
        <StatCard icon={Award} label={t('dashboard.averageScore')} value={scoreText(data.averageScore)} hint={data.averageScore == null ? t('dashboard.completeForScore') : t('dashboard.completedAverage')} />
        <StatCard icon={CheckCircle2} label={t('dashboard.completed')} value={data.completedInterviews} />
        <StatCard icon={Timer} label={t('dashboard.practiceTime')} value={`${data.totalPracticeMinutes}m`} />
      </div>

      <div className="surface flex flex-wrap items-center justify-between gap-4 border-brand-violet/40 bg-brand-violet/8 p-6">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-violet/20 text-brand-soft"><Sparkles size={20} /></span>
          <div><p className="text-xs text-muted">{t('dashboard.recommended')}</p><h2 className="text-lg font-semibold">{next.title}</h2><p className="mt-0.5 text-sm text-muted">{next.text}</p></div>
        </div>
        <Button to={next.to} iconRight={ArrowRight}>{next.cta}</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="surface overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5"><h2 className="text-lg font-semibold">{t('dashboard.recentInterviews')}</h2>{data.recentInterviews.length > 0 && <Link to="/interviews" className="text-sm text-brand-soft hover:underline">{t('dashboard.viewAll')}</Link>}</div>
          {data.recentInterviews.length ? <div className="mt-3"><RecentHistory items={data.recentInterviews} /></div> : (
            <EmptyState icon={PlayCircle} title={t('dashboard.noInterviews')} text={t('dashboard.emptyHistory')} action={<Button to="/careers" size="sm">{t('dashboard.firstTitle')}</Button>} />
          )}
        </section>

        <div className="space-y-6">
          <section className="surface p-5">
            <h2 className="text-lg font-semibold">{t('dashboard.careerProgress')}</h2>
            <div className="mt-4 space-y-4">
              {CAREERS.map((c) => {
                const s = byCareer[c.id];
                return (
                  <div key={c.id} style={{ '--c': c.color }}>
                    <div className="mb-1.5 flex justify-between text-sm"><span>{c.short}</span><span className="text-muted">{s ? `${s.count} ${t(s.count === 1 ? 'dashboard.session' : 'dashboard.sessions')}${s.averageScore != null ? ` · ${t('dashboard.avg')} ${Math.round(s.averageScore)}` : ''}` : t('dashboard.notStarted')}</span></div>
                    <div className="h-2 rounded-full bg-ink-600"><div className="h-2 rounded-full bg-(--c) transition-all" style={{ width: `${s?.averageScore ?? 0}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="surface p-5">
            <h2 className="text-lg font-semibold">{t('dashboard.recentActivity')}</h2>
            {data.recentInterviews.length ? (
              <ul className="mt-4 space-y-3.5">
                {data.recentInterviews.slice(0, 4).map((i) => (
                  <li key={i._id} className="flex items-start gap-3 text-sm"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-violet" /><span><span className="capitalize">{t(`dashboard.status.${i.status}`, i.status.replace('_', ' '))}</span> · {t(`setup.careers.${i.career}`, careerLabel(i.career))}<span className="block text-xs text-muted">{timeAgo(i.completedAt || i.createdAt, i18n.language)}</span></span></li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-muted">{t('dashboard.noActivity')}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
