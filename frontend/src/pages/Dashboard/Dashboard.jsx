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

function nextAction(o) {
  if (o.activeInterview) return { title: `Pick up your ${careerLabel(o.activeInterview.career)} interview`, text: 'You have a session in progress.', to: `/interview/room/${o.activeInterview._id}`, cta: 'Continue' };
  if (o.totalInterviews === 0) return { title: 'Take your first practice interview', text: 'Choose a role and set up a session. It takes about a minute.', to: '/careers', cta: 'Choose a career' };
  if (o.averageScore != null && o.averageScore < 60) return { title: 'Review your latest feedback', text: 'Your average is below 60. Reading your reports shows where to focus.', to: '/interviews', cta: 'Open my interviews' };
  return { title: 'Raise the difficulty', text: 'You are scoring well. Try a harder session or a different role.', to: '/careers', cta: 'Start another interview' };
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(progressService.overview, []);
  if (loading) return <PageLoader />;
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  const next = nextAction(data);
  const byCareer = Object.fromEntries(data.careerBreakdown.map((c) => [c.career, c]));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-semibold">Welcome back, {user.firstName}</h1><p className="mt-1.5 text-muted">Here is where your interview practice stands.</p></div>
        <Button to="/careers" icon={PlayCircle}>Start Interview</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ListChecks} label="Total interviews" value={data.totalInterviews} />
        <StatCard icon={Award} label="Average score" value={scoreText(data.averageScore)} hint={data.averageScore == null ? 'Complete an interview to get a score' : 'Across completed interviews'} />
        <StatCard icon={CheckCircle2} label="Completed" value={data.completedInterviews} />
        <StatCard icon={Timer} label="Practice time" value={`${data.totalPracticeMinutes}m`} />
      </div>

      <div className="surface flex flex-wrap items-center justify-between gap-4 border-brand-violet/40 bg-brand-violet/8 p-6">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-violet/20 text-brand-soft"><Sparkles size={20} /></span>
          <div><p className="text-xs text-muted">Recommended next</p><h2 className="text-lg font-semibold">{next.title}</h2><p className="mt-0.5 text-sm text-muted">{next.text}</p></div>
        </div>
        <Button to={next.to} iconRight={ArrowRight}>{next.cta}</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="surface overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5"><h2 className="text-lg font-semibold">Recent interviews</h2>{data.recentInterviews.length > 0 && <Link to="/interviews" className="text-sm text-brand-soft hover:underline">View all</Link>}</div>
          {data.recentInterviews.length ? <div className="mt-3"><RecentHistory items={data.recentInterviews} /></div> : (
            <EmptyState icon={PlayCircle} title="No interviews yet" text="Your completed and in-progress sessions will show up here." action={<Button to="/careers" size="sm">Start your first interview</Button>} />
          )}
        </section>

        <div className="space-y-6">
          <section className="surface p-5">
            <h2 className="text-lg font-semibold">Career progress</h2>
            <div className="mt-4 space-y-4">
              {CAREERS.map((c) => {
                const s = byCareer[c.id];
                return (
                  <div key={c.id} style={{ '--c': c.color }}>
                    <div className="mb-1.5 flex justify-between text-sm"><span>{c.short}</span><span className="text-muted">{s ? `${s.count} session${s.count > 1 ? 's' : ''}${s.averageScore != null ? ` · avg ${Math.round(s.averageScore)}` : ''}` : 'Not started'}</span></div>
                    <div className="h-2 rounded-full bg-ink-600"><div className="h-2 rounded-full bg-(--c) transition-all" style={{ width: `${s?.averageScore ?? 0}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="surface p-5">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            {data.recentInterviews.length ? (
              <ul className="mt-4 space-y-3.5">
                {data.recentInterviews.slice(0, 4).map((i) => (
                  <li key={i._id} className="flex items-start gap-3 text-sm"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-violet" /><span><span className="capitalize">{i.status.replace('_', ' ')}</span> · {careerLabel(i.career)}<span className="block text-xs text-muted">{timeAgo(i.completedAt || i.createdAt)}</span></span></li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-muted">Nothing yet. Activity appears after your first session.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
