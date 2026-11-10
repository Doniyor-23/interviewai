import { ArrowRight, BookOpen, ClipboardList } from 'lucide-react';
import Button from '../common/Button';
import { ScoreRing } from './Visuals';

const Card = ({ title, items, tone, empty }) => (
  <div className="surface p-5">
    <h3 className={`font-sans text-sm font-semibold ${tone}`}>{title}</h3>
    {items?.length ? <ul className="mt-3 space-y-2 text-sm text-muted">{items.map((x, i) => <li key={i} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-60" />{x}</li>)}</ul> : <p className="mt-3 text-sm text-muted">{empty}</p>}
  </div>
);

export default function StageFeedback({ fb, stage, isLast, onContinue, onReview, busy, error }) {
  return (
    <div className="rise space-y-5">
      <section className="surface flex flex-wrap items-center gap-6 p-6">
        <ScoreRing value={fb.score} size={120} label="stage score" />
        <div className="min-w-[220px] flex-1">
          <p className="text-sm text-muted">Stage complete</p>
          <h2 className="text-2xl font-semibold">{fb.stageName || stage?.name}</h2>
          <p className="mt-1 text-sm text-muted">{fb.questionCount} question{fb.questionCount === 1 ? '' : 's'} answered</p>
          <p className="mt-3 leading-relaxed text-fg/90">{fb.summary}</p>
        </div>
      </section>
      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Strengths" items={fb.strengths} tone="text-emerald-300" empty="No standout strengths in this stage." />
        <Card title="Weaknesses" items={fb.weaknesses} tone="text-amber-300" empty="No major weaknesses noted." />
        <Card title="Incorrect or incomplete points" items={fb.incorrectPoints} tone="text-red-300" empty="Nothing was clearly incorrect." />
        <Card title="Suggested improvements" items={fb.improvements} tone="text-sky-300" empty="Keep doing what you are doing." />
      </div>
      {fb.improvedAnswers?.length > 0 && (
        <section className="surface p-5"><h3 className="font-sans text-sm font-semibold text-brand-soft">Example improved answers</h3>
          <div className="mt-3 space-y-4">{fb.improvedAnswers.map((x, i) => <div key={i} className="rounded-xl bg-ink-900/60 p-4"><p className="text-sm font-semibold">{x.question}</p><p className="mt-2 text-sm leading-relaxed text-muted">{x.improvedAnswer}</p></div>)}</div></section>
      )}
      {fb.studyTopics?.length > 0 && (
        <section className="surface p-5"><h3 className="flex items-center gap-2 font-sans text-sm font-semibold"><BookOpen size={16} className="text-brand-soft" />Recommended topics to study</h3>
          <ul className="mt-3 flex flex-wrap gap-2">{fb.studyTopics.map((t) => <li key={t} className="rounded-full bg-brand-violet/15 px-3 py-1 text-xs font-medium text-brand-soft">{t}</li>)}</ul></section>
      )}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" icon={ClipboardList} onClick={onReview}>Review My Answers</Button>
        <Button onClick={onContinue} loading={busy} iconRight={ArrowRight}>{isLast ? 'Finish & View Report' : 'Continue to Next Stage'}</Button>
      </div>
    </div>
  );
}
