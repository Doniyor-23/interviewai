import { useState } from 'react';
import { ArrowRight, ChevronDown, Lightbulb } from 'lucide-react';
import Button from '../common/Button';
import { MiniBar, ScoreRing } from './Visuals';
import { useTranslation } from 'react-i18next';

const List = ({ title, items, tone }) => items?.length ? (
  <div><h4 className={`mb-2 font-sans text-sm font-semibold ${tone}`}>{title}</h4><ul className="space-y-1.5 text-sm text-muted">{items.map((x, i) => <li key={i} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-60" />{x}</li>)}</ul></div>
) : null;

export default function AnswerFeedback({ answer, stageEnding, onContinue, busy, error }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <section className="surface rise p-5 sm:p-6" aria-label={t('feedback.well')}>
      <div className="flex flex-wrap items-center gap-6">
        <ScoreRing value={answer.score} size={104} label={t('feedback.score')} />
        <div className="grid min-w-[220px] flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <MiniBar label={t('feedback.relevance')} value={answer.relevance} /><MiniBar label={t('feedback.accuracy')} value={answer.accuracy} /><MiniBar label={t('feedback.clarity')} value={answer.clarity} />
          <MiniBar label={t('feedback.completeness')} value={answer.completeness} /><MiniBar label={t('feedback.communication')} value={answer.communication} />
        </div>
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <List title={t('feedback.well')} items={answer.strengths} tone="text-emerald-300" />
        <List title={t('feedback.improve')} items={answer.weaknesses} tone="text-amber-300" />
        <List title={t('feedback.corrections')} items={answer.corrections} tone="text-red-300" />
      </div>
      {answer.improvedAnswer && (
        <div className="mt-5 rounded-xl bg-ink-900/60">
          <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold" aria-expanded={open}><span className="flex items-center gap-2"><Lightbulb size={16} className="text-brand-soft" />{t('feedback.stronger')}</span><ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} /></button>
          {open && <p className="px-4 pb-4 text-sm leading-relaxed text-muted">{answer.improvedAnswer}</p>}
        </div>
      )}
      {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
      <div className="mt-6 flex justify-end"><Button onClick={onContinue} loading={busy} iconRight={ArrowRight}>{stageEnding ? t('feedback.finishStage') : t('feedback.nextQuestion')}</Button></div>
    </section>
  );
}
