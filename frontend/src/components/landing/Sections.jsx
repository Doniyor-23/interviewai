import { ArrowRight, BarChart3, Brain, ChevronDown, Compass, Languages, LineChart, Mic, ShieldCheck, Target, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CAREERS } from '../../utils/careers';
import { useAuth } from '../../context/AuthContext';
import Button from '../common/Button';

export const SectionHead = ({ title, text }) => (
  <div className="mb-12 max-w-2xl"><h2 className="text-3xl font-semibold sm:text-4xl">{title}</h2>{text && <p className="mt-3 text-lg text-muted">{text}</p>}</div>
);

export function Features() {
  const items = [
    [Mic, 'Voice-first practice', 'Answer out loud like you will in the real room. Speaking is a skill and it needs reps.'],
    [Brain, 'Questions that adapt', 'Follow-ups respond to what you actually said, so no two sessions feel scripted.'],
    [Target, 'Role-specific depth', 'Question sets are built around the skills each role is hired for, at your experience level.'],
    [BarChart3, 'Scored feedback', 'See what landed, what was thin and exactly what to say differently next time.'],
    [Languages, 'English and Uzbek', 'Rehearse in the language you will be interviewed in.'],
    [LineChart, 'Progress you can see', 'Track scores across sessions and spot the skills that are improving.'],
  ];
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
      <SectionHead title="Everything you need to rehearse for the real thing" text="Built around one idea: you improve fastest when practice feels like the interview." />
      <div className="grid gap-x-12 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
        {items.map(([Icon, t, d]) => (
          <div key={t} className="border-t border-line pt-5">
            <Icon className="text-brand-soft" size={22} />
            <h3 className="mt-4 text-lg font-semibold">{t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    ['Pick your role', 'Choose a career, experience level, difficulty and how long you want to practice.'],
    ['Interview with AI', 'Answer questions by voice. The interviewer follows up the way a real one would.'],
    ['Get your report', 'Receive scores by skill, strengths, gaps and concrete advice for your next attempt.'],
    ['Repeat and improve', 'Watch your progress over time and target the areas that need the most work.'],
  ];
  return (
    <section id="how" className="scroll-mt-20 border-y border-line bg-ink-950/60 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead title="From first question to final report" />
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
  return (
    <section id="careers" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
      <SectionHead title="Four careers, one practice room" text="Pick the role you are applying for and practice the questions that role actually asks." />
      <div className="grid gap-4 sm:grid-cols-2">
        {CAREERS.map((c) => (
          <Link key={c.id} to={user ? '/careers' : '/register'} style={{ '--c': c.color }} className="group surface tint-border flex gap-5 p-6 transition-colors hover:bg-ink-700/70">
            <span className="tint grid size-12 shrink-0 place-items-center rounded-xl"><c.icon size={22} /></span>
            <div>
              <h3 className="text-lg font-semibold">{c.title}</h3>
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
  const skills = [['Technical depth', 84], ['Communication', 78], ['Problem solving', 88], ['Confidence', 71]];
  return (
    <section className="border-y border-line bg-ink-950/60 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold sm:text-4xl">A report that tells you what to fix</h2>
          <p className="mt-4 text-lg text-muted">Every session ends with a clear breakdown by skill, written feedback on your strongest and weakest answers, and next steps.</p>
          <ul className="mt-6 space-y-3 text-muted">
            {['Overall score and per-skill scores', 'What you did well, in your own words', 'Specific improvements for the next round'].map((t) => <li key={t} className="flex items-center gap-3"><ShieldCheck size={18} className="text-brand-soft" />{t}</li>)}
          </ul>
        </div>
        <div className="surface p-6" style={{ '--c': '#38bdf8' }}>
          <div className="flex items-start justify-between">
            <div><p className="text-xs text-muted">Sample report</p><p className="mt-1 font-display text-lg font-semibold">Frontend Developer · Junior</p></div>
            <div className="text-right"><p className="font-display text-4xl font-semibold text-emerald-300">82</p><p className="text-xs text-muted">overall</p></div>
          </div>
          <div className="mt-6 space-y-4">
            {skills.map(([n, v]) => (
              <div key={n}>
                <div className="mb-1.5 flex justify-between text-sm"><span>{n}</span><span className="text-muted">{v}</span></div>
                <div className="h-2 rounded-full bg-ink-600"><div className="h-2 rounded-full bg-gradient-to-r from-brand-blue to-brand-violet" style={{ width: `${v}%` }} /></div>
              </div>
            ))}
          </div>
          <p className="mt-6 rounded-xl bg-ink-900/70 p-4 text-sm leading-relaxed text-muted">Strong explanation of memoization trade-offs. Next time, lead with how you would measure the problem before proposing a fix.</p>
        </div>
      </div>
    </section>
  );
}

export function Benefits() {
  const items = [[Timer, 'Practice on your schedule', 'Ten minutes before work or a full session on the weekend.'], [Compass, 'Know where you stand', 'Replace vague worry with concrete scores and gaps.'], [Mic, 'Build real fluency', 'Speaking answers out loud is different from knowing them.'], [ShieldCheck, 'Low-pressure reps', 'Fail here as often as you need to, and nobody is watching.']];
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <SectionHead title="Why people practice with InterviewAI" />
      <div className="grid gap-5 sm:grid-cols-2">
        {items.map(([Icon, t, d]) => (
          <div key={t} className="flex gap-4 rounded-2xl bg-ink-800/60 p-6">
            <Icon className="mt-1 shrink-0 text-brand-soft" size={22} />
            <div><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-muted">{d}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Faq() {
  const qs = [
    ['Which roles can I practice for?', 'Frontend Developer, Backend Developer, UI/UX Designer and Marketing Specialist, each at beginner, junior, middle or senior level.'],
    ['Which languages are supported?', 'Interviews can be configured in English or Uzbek.'],
    ['How long does a session take?', 'You choose: 10, 20 or 30 minutes.'],
    ['What kinds of interviews are there?', 'Technical, HR, behavioral, or a mix of all three, with easy, medium or hard difficulty.'],
    ['Is my data private?', 'Your account and interview history are only accessible to you, and you can delete your account and all of its data at any time from Settings.'],
  ];
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-24">
      <h2 className="mb-10 text-3xl font-semibold sm:text-4xl">Frequently asked questions</h2>
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
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24">
      <div className="hero-glow rounded-3xl border border-line bg-ink-800 px-8 py-14 text-center">
        <h2 className="text-3xl font-semibold sm:text-4xl">Ready for your first practice interview?</h2>
        <p className="mx-auto mt-3 max-w-lg text-muted">Create an account, pick a role and be answering questions in minutes.</p>
        <Button to={user ? '/careers' : '/register'} size="lg" className="mt-8" iconRight={ArrowRight}>Start Interview</Button>
      </div>
    </section>
  );
}
