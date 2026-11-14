import { Award, CheckCircle2, ListChecks, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/dashboard/StatCard';
import ErrorNotice from '../../components/common/ErrorNotice';
import { PageLoader } from '../../components/common/Spinner';
import Button from '../../components/common/Button';
import { useFetch } from '../../hooks/useFetch';
import { progressService } from '../../services/progressService';
import { CAREERS, careerLabel } from '../../utils/careers';
import { scoreText } from '../../utils/format';
import { useTranslation } from 'react-i18next';

const axis = { stroke: '#8d98c4', fontSize: 12, tickLine: false, axisLine: false };
const tip = { contentStyle: { background: '#0b1229', border: '1px solid #222e60', borderRadius: 12, color: '#e8ecff' }, cursor: { fill: 'rgba(124,92,255,0.08)' } };

function ChartCard({ title, subtitle, empty, children, emptyText }) {
  return (
    <section className="surface p-5">
      <h2 className="text-lg font-semibold">{title}</h2><p className="text-xs text-muted">{subtitle}</p>
      <div className="relative mt-4 h-64">
        {empty ? <div className="grid h-full place-items-center rounded-xl border border-dashed border-line text-center text-sm text-muted"><p className="max-w-[16rem]">{emptyText}</p></div> : children}
      </div>
    </section>
  );
}

export default function Progress() {
  const { t, i18n } = useTranslation();
  const ov = useFetch(progressService.overview, []);
  const an = useFetch(progressService.analytics, []);
  if (ov.loading || an.loading) return <PageLoader />;
  if (ov.error || an.error) return <ErrorNotice error={ov.error || an.error} onRetry={() => { ov.reload(); an.reload(); }} />;
  const o = ov.data, a = an.data;

  const timeline = a.performanceOverTime.map((p) => ({ label: new Date(p.date).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' }), score: p.score }));
  const careerBars = CAREERS.map((c) => ({ name: c.short, score: a.careerPerformance.find((x) => x.career === c.id)?.averageScore ?? 0, fill: c.color }));
  const skills = a.skillPerformance.map((x) => ({ skill: x.skill, score: x.averageScore }));
  const weak = a.commonWeaknesses.map((w) => ({ topic: w.topic, count: w.count }));
  const imp = a.improvement;

  return (
    <>
      <PageHeader title={t('pages.progress.title')} subtitle={t('pages.progress.subtitle')} />
      {o.totalInterviews === 0 && <div className="surface mb-6 flex flex-wrap items-center justify-between gap-3 p-5"><p className="text-sm text-muted">{t('pages.progress.empty')}</p><Button to="/careers" size="sm">{t('pages.progress.start')}</Button></div>}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Award} label={t('pages.progress.average')} value={scoreText(o.averageScore)} />
        <StatCard icon={ListChecks} label={t('pages.progress.count')} value={o.totalInterviews} />
        <StatCard icon={CheckCircle2} label={t('pages.progress.best')} value={scoreText(o.bestScore)} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title={t('pages.progress.performance')} subtitle={t('pages.progress.perInterview')} emptyText={t('pages.progress.noData')} empty={!timeline.length}>
          <ResponsiveContainer><LineChart data={timeline}><CartesianGrid stroke="#222e60" vertical={false} /><XAxis dataKey="label" {...axis} /><YAxis domain={[0, 100]} {...axis} /><Tooltip {...tip} /><Line type="monotone" dataKey="score" stroke="#7c5cff" strokeWidth={3} dot={{ r: 4, fill: '#7c5cff' }} /></LineChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title={t('pages.progress.perMonth')} subtitle={t('pages.progress.sessions')} emptyText={t('pages.progress.noData')} empty={!a.interviewsPerMonth.length}>
          <ResponsiveContainer><BarChart data={a.interviewsPerMonth}><CartesianGrid stroke="#222e60" vertical={false} /><XAxis dataKey="month" {...axis} /><YAxis allowDecimals={false} {...axis} /><Tooltip {...tip} /><Bar dataKey="count" name={t('charts.interviews')} fill="#3b82f6" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title={t('pages.progress.byCareer')} subtitle={t('pages.progress.completedOnly')} emptyText={t('pages.progress.noData')} empty={!a.careerPerformance.length}>
          <ResponsiveContainer><BarChart data={careerBars}><CartesianGrid stroke="#222e60" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis domain={[0, 100]} {...axis} /><Tooltip {...tip} /><Bar dataKey="score" name={t('charts.averageScore')} radius={[8, 8, 0, 0]}>{careerBars.map((b) => <Cell key={b.name} fill={b.fill} />)}</Bar></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title={t('pages.progress.skills')} subtitle={t('pages.progress.skillAverage')} emptyText={t('pages.progress.noData')} empty={skills.length < 3}>
          <ResponsiveContainer><RadarChart data={skills}><PolarGrid stroke="#222e60" /><PolarAngleAxis dataKey="skill" tick={{ fill: '#8d98c4', fontSize: 12 }} /><Radar dataKey="score" stroke="#7c5cff" fill="#7c5cff" fillOpacity={0.35} /><Tooltip {...tip} /></RadarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title={t('pages.progress.weaknesses')} subtitle={t('pages.progress.weaknessText')} emptyText={t('pages.progress.noData')} empty={!weak.length}>
          <ResponsiveContainer><BarChart data={weak} layout="vertical" margin={{ left: 24 }}><CartesianGrid stroke="#222e60" horizontal={false} /><XAxis type="number" allowDecimals={false} {...axis} /><YAxis type="category" dataKey="topic" width={110} {...axis} /><Tooltip {...tip} /><Bar dataKey="count" name="Times flagged" fill="#f59e0b" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <section className="surface p-5">
          <h2 className="text-lg font-semibold">{t('pages.progress.improvement')}</h2><p className="text-xs text-muted">{t('pages.progress.firstLatest')}</p>
          {imp ? (
            <div className="mt-5 space-y-4">
              <div className="flex items-end gap-4"><p className="font-display text-5xl font-semibold" style={{ color: imp.change >= 0 ? '#34d399' : '#f87171' }}>{imp.change > 0 ? '+' : ''}{imp.change}</p><p className="pb-1.5 text-sm text-muted">{t('pages.progress.points', { first: imp.firstScore, latest: imp.latestScore })}</p></div>
              <p className="text-sm text-muted">{t('pages.progress.lastThree')} <span className="text-fg">{imp.recentAverage}</span>{imp.previousAverage != null && <> {t('pages.progress.compared')} <span className="text-fg">{imp.previousAverage}</span> {t('pages.progress.previous')}</>}</p>
            </div>
          ) : <p className="mt-6 text-sm text-muted">{t('pages.progress.two')}</p>}
        </section>
      </div>
    </>
  );
}
