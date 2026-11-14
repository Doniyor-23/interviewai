import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, LayoutDashboard, Play, Repeat, TrendingDown, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useFetch } from '../../hooks/useFetch';
import { interviewService } from '../../services/interviewService';
import ErrorNotice from '../../components/common/ErrorNotice';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import { PageLoader } from '../../components/common/Spinner';
import { StatusBadge } from '../../components/common/Badges';
import { MiniBar, ScoreRing } from '../../components/interview/Visuals';
import { careerById, DIFFICULTIES, DURATIONS, LANGUAGES, LEVELS, TYPES, labelOf } from '../../utils/careers';
import { formatDate } from '../../utils/format';
import { METRIC_LABELS } from './metricLabels';
import { useTranslation } from 'react-i18next';

const axis = { stroke: '#8d98c4', fontSize: 12, tickLine: false, axisLine: false };
const tip = { contentStyle: { background: '#0b1229', border: '1px solid #222e60', borderRadius: 12, color: '#e8ecff' }, cursor: { fill: 'rgba(124,92,255,0.08)' } };
const scoreColor = (v) => (v >= 75 ? '#34d399' : v >= 50 ? '#fbbf24' : '#f87171');
const mmss = (s) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;

const Panel = ({ title, children, className = '' }) => <section className={`surface p-5 sm:p-6 ${className}`}><h2 className="mb-4 text-lg font-semibold">{title}</h2>{children}</section>;
const Bullets = ({ items, empty }) => { const { t } = useTranslation(); return items?.length ? <ul className="space-y-2 text-sm text-muted">{items.map((x, i) => <li key={i} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-soft" />{x}</li>)}</ul> : <p className="text-sm text-muted">{empty || t('pages.report.nothing')}</p>; };
const Collapse = ({ title, right, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-line bg-ink-900/40">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"><span className="text-sm font-semibold">{title}</span><span className="flex items-center gap-3">{right}<ChevronDown size={16} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} /></span></button>
      {open && <div className="border-t border-line px-4 py-4">{children}</div>}
    </div>
  );
};

async function loadAll(id) {
  const base = await interviewService.get(id);
  if (base.interview.status !== 'completed') return { interview: base.interview, report: null };
  const rep = await interviewService.report(id);
  return { interview: rep.interview, report: rep.report };
}

export default function InterviewReport() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch(() => loadAll(id), [id]);
  if (loading) return <PageLoader />;
  if (error) return <ErrorNotice error={error} onRetry={error.status === 404 ? undefined : reload} />;
  const { interview: i, report } = data;
  const c = careerById(i.career);
  const back = <Link to="/interviews" className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-fg"><ArrowLeft size={16} />{t('pages.report.back')}</Link>;
  const meta = [[t('pages.report.level'), t(`setup.levels.${i.experienceLevel}`, labelOf(LEVELS, i.experienceLevel))], [t('pages.report.difficulty'), t(`setup.difficulties.${i.difficulty}`, labelOf(DIFFICULTIES, i.difficulty))], [t('pages.report.type'), t(`setup.types.${i.interviewType}`, labelOf(TYPES, i.interviewType))], [t('pages.report.language'), t(`language.${i.language}`, labelOf(LANGUAGES, i.language))], [t('pages.report.planned'), t(`setup.minutes${i.durationMinutes}`, labelOf(DURATIONS, i.durationMinutes))], [t('pages.report.date'), formatDate(i.completedAt || i.createdAt, i18n.language)]];
  const header = (
    <div className="surface tint-border p-6" style={{ '--c': c?.color }}>
      <div className="flex flex-wrap items-center gap-4"><span className="tint grid size-12 place-items-center rounded-xl">{c && <c.icon size={22} />}</span><div><h1 className="text-2xl font-semibold">{t(`setup.careers.${i.career}`, c?.title)} {t('pages.report.interview')}</h1><div className="mt-1"><StatusBadge status={i.status} /></div></div></div>
      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-6">{meta.map(([k, v]) => <div key={k}><dt className="text-muted">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>)}</dl>
    </div>
  );

  if (!report) {
    return (
      <>{back}{header}
        <div className="surface mt-6">
          {i.status === 'in_progress'
            ? <EmptyState icon={Play} title={t('pages.report.notFinished')} text={t('pages.report.resumeText', { count: i.answers.filter((a) => a.evaluationStatus === 'done').length })} action={<Button to={`/interview/room/${i._id}`} icon={Play}>{t('pages.report.resume')}</Button>} />
            : <EmptyState title={i.status === 'abandoned' ? t('pages.report.abandoned') : t('pages.report.noReport')} text={t('pages.report.reportAfter')} action={<Button to="/careers">{t('pages.report.newInterview')}</Button>} />}
        </div>
      </>
    );
  }

  const m = report.metrics;
  const radar = Object.entries(METRIC_LABELS).filter(([k]) => m[k] != null).map(([k]) => ({ skill: t(`metrics.${k}`), score: m[k] }));
  const stageData = report.stageScores.map((s) => ({ name: t(`feedback.stages.${s.key}`, s.name.replace(' Questions', '').replace(' Knowledge', '')), score: s.score }));
  const answers = i.questions.map((q) => ({ q, a: i.answers.find((x) => String(x.questionId) === String(q._id)) })).filter((x) => x.a?.evaluationStatus === 'done');
  const perQ = answers.map((x, n) => ({ name: `Q${n + 1}`, score: x.a.score }));

  return (
    <div className="space-y-6">
      {back}{header}
      <section className="surface flex flex-wrap items-center gap-8 p-6">
        <ScoreRing value={report.overallScore} size={150} stroke={12} label="overall" />
        <div className="min-w-[260px] flex-1">
          <p className="text-sm text-muted">{t('pages.report.performance')}</p>
          <h2 className="text-3xl font-semibold">{t(`reportDynamic.performance.${String(report.performanceLevel).toLowerCase().replaceAll(' ', '_')}`, report.performanceLevel)}</h2>
          <p className="mt-3 leading-relaxed text-fg/90">{report.summary}</p>
          <p className="mt-3 text-sm text-muted">{report.answeredCount} {t('pages.report.answers')} · {mmss(i.timeSpentSeconds || 0)}{report.early ? ` · ${t('pages.report.endedEarly')}` : ''}</p>
        </div>
      </section>

      <Panel title={t('pages.report.readiness')}><p className="leading-relaxed text-fg/90">{report.careerReadiness.assessment}</p></Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={t('pages.report.skills')}>
          {radar.length >= 3 ? <div className="h-64"><ResponsiveContainer><RadarChart data={radar}><PolarGrid stroke="#222e60" /><PolarAngleAxis dataKey="skill" tick={{ fill: '#8d98c4', fontSize: 11 }} /><Radar dataKey="score" stroke="#7c5cff" fill="#7c5cff" fillOpacity={0.35} /><Tooltip {...tip} /></RadarChart></ResponsiveContainer></div> : null}
          <div className={`grid gap-x-6 gap-y-3 sm:grid-cols-2 ${radar.length >= 3 ? 'mt-4' : ''}`}>{Object.entries(METRIC_LABELS).map(([k]) => { const label = t(`metrics.${k}`); return <MiniBar key={k} label={m[k] == null ? `${label} (${t('pages.report.notAssessed')})` : label} value={m[k]} />; })}</div>
        </Panel>
        <div className="space-y-6">
          <Panel title={t('pages.report.stageScores')}><div className="h-56"><ResponsiveContainer><BarChart data={stageData}><CartesianGrid stroke="#222e60" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis domain={[0, 100]} {...axis} /><Tooltip {...tip} /><Bar dataKey="score" radius={[8, 8, 0, 0]}>{stageData.map((d) => <Cell key={d.name} fill={scoreColor(d.score)} />)}</Bar></BarChart></ResponsiveContainer></div></Panel>
          <Panel title={t('pages.report.questionScores')}><div className="h-44"><ResponsiveContainer><BarChart data={perQ}><CartesianGrid stroke="#222e60" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis domain={[0, 100]} {...axis} /><Tooltip {...tip} /><Bar dataKey="score" radius={[6, 6, 0, 0]}>{perQ.map((d, n) => <Cell key={n} fill={scoreColor(d.score)} />)}</Bar></BarChart></ResponsiveContainer></div></Panel>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title={t('pages.report.strongest')}>{report.strongestSkills.length ? <ul className="space-y-3">{report.strongestSkills.map((s) => <li key={s.key} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><TrendingUp size={16} className="text-emerald-300" />{s.name}</span><span className="font-semibold">{s.score}</span></li>)}</ul> : <Bullets items={[]} empty={t('pages.report.nothing')} />}</Panel>
        <Panel title={t('pages.report.weakest')}>{report.weakestSkills.length ? <ul className="space-y-3">{report.weakestSkills.map((s) => <li key={s.key} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><TrendingDown size={16} className="text-amber-300" />{s.name}</span><span className="font-semibold">{s.score}</span></li>)}</ul> : <Bullets items={[]} empty={t('pages.report.nothing')} />}</Panel>
        <Panel title={t('pages.report.well')}><Bullets items={report.strengths} empty={t('pages.report.nothing')} /></Panel>
        <Panel title={t('pages.report.mistakes')}><Bullets items={report.keyMistakes} empty={t('pages.report.noMistakes')} /></Panel>
      </div>

      {report.improvedAnswers.length > 0 && (
        <Panel title={t('pages.report.improved')}><div className="space-y-3">{report.improvedAnswers.map((x, n) => (
          <Collapse key={n} title={x.question} right={<span className="text-xs text-muted">{x.score}/100</span>}>
            <p className="text-xs font-semibold text-muted">{t('pages.report.yourAnswer')}</p><p className="mt-1 text-sm text-muted">{x.yourAnswer}</p>
            <p className="mt-4 text-xs font-semibold text-emerald-300">{t('pages.report.stronger')}</p><p className="mt-1 text-sm leading-relaxed">{x.improvedAnswer}</p>
          </Collapse>))}</div></Panel>
      )}

      <Panel title={t('pages.report.learning')}>
        <div className="grid gap-4 md:grid-cols-2">{report.learningPlan.map((p, n) => (
          <div key={n} className="rounded-xl bg-ink-900/60 p-4">
            <div className="flex items-start justify-between gap-3"><h3 className="font-sans text-sm font-semibold">{p.title}</h3><span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.priority === 'high' ? 'bg-red-400/15 text-red-300' : p.priority === 'medium' ? 'bg-amber-400/15 text-amber-300' : 'bg-slate-400/15 text-slate-300'}`}>{t(`reportDynamic.priority.${p.priority}`, p.priority)}</span></div>
            <p className="mt-2 text-sm text-muted">{p.description}</p>
            {p.topics?.length > 0 && <ul className="mt-3 flex flex-wrap gap-1.5">{p.topics.map((t) => <li key={t} className="rounded-full bg-brand-violet/15 px-2.5 py-1 text-xs text-brand-soft">{t}</li>)}</ul>}
          </div>))}</div>
      </Panel>

      <Panel title={t('pages.report.stageFeedback')}><div className="space-y-3">{i.stageResults.length ? i.stageResults.map((s) => (
        <Collapse key={s.stage} title={t(`feedback.stages.${s.stage}`, s.stageName || s.stage)} right={<span className="text-sm font-semibold" style={{ color: scoreColor(s.score) }}>{s.score}/100</span>}>
          <p className="text-sm leading-relaxed">{s.summary}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><h4 className="mb-2 font-sans text-xs font-semibold text-emerald-300">{t('pages.report.strengths')}</h4><Bullets items={s.strengths} /></div><div><h4 className="mb-2 font-sans text-xs font-semibold text-amber-300">{t('pages.report.weaknesses')}</h4><Bullets items={s.weaknesses} /></div><div><h4 className="mb-2 font-sans text-xs font-semibold text-red-300">{t('pages.report.incorrect')}</h4><Bullets items={s.incorrectPoints} /></div><div><h4 className="mb-2 font-sans text-xs font-semibold text-sky-300">{t('pages.report.improvements')}</h4><Bullets items={s.improvements} /></div></div>
          {s.studyTopics?.length > 0 && <p className="mt-4 text-xs text-muted">{t('pages.report.study')} {s.studyTopics.join(', ')}</p>}
        </Collapse>)) : <p className="text-sm text-muted">{t('pages.report.noStageFeedback')}</p>}</div></Panel>

      <Panel title={t('pages.report.allQA')}><div className="space-y-3">{answers.map(({ q, a }, n) => (
        <Collapse key={q._id} title={`${n + 1}. ${q.text}`} right={<span className="text-sm font-semibold" style={{ color: scoreColor(a.score) }}>{a.score}</span>}>
          <p className="text-xs font-semibold text-muted">{t('pages.report.yourAnswer')}</p><p className="mt-1 text-sm">{a.transcript}</p>
          <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-3"><MiniBar label={t('pages.report.relevance')} value={a.relevance} /><MiniBar label={t('pages.report.accuracy')} value={a.accuracy} /><MiniBar label={t('pages.report.clarity')} value={a.clarity} /><MiniBar label={t('pages.report.completeness')} value={a.completeness} /><MiniBar label={t('pages.report.communication')} value={a.communication} /></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><h4 className="mb-2 font-sans text-xs font-semibold text-emerald-300">{t('pages.report.strengths')}</h4><Bullets items={a.strengths} /></div><div><h4 className="mb-2 font-sans text-xs font-semibold text-amber-300">{t('pages.report.toImprove')}</h4><Bullets items={a.weaknesses} /></div></div>
          {a.corrections?.length > 0 && <div className="mt-4"><h4 className="mb-2 font-sans text-xs font-semibold text-red-300">{t('pages.report.corrections')}</h4><Bullets items={a.corrections} /></div>}
          {a.improvedAnswer && <div className="mt-4"><h4 className="mb-1 font-sans text-xs font-semibold text-brand-soft">{t('pages.report.stronger')}</h4><p className="text-sm leading-relaxed text-muted">{a.improvedAnswer}</p></div>}
        </Collapse>))}</div></Panel>

      <div className="flex flex-wrap justify-end gap-3 pb-6"><Button to="/dashboard" variant="secondary" icon={LayoutDashboard}>{t('pages.report.return')}</Button><Button to="/careers" icon={Repeat}>{t('pages.report.startAnother')}</Button></div>
    </div>
  );
}
