import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import { CAREERS } from '../../utils/careers';
import { useInterviewConfig } from '../../context/InterviewConfigContext';

export default function Careers() {
  const { setConfig } = useInterviewConfig();
  const navigate = useNavigate();
  const start = (id) => { setConfig({ career: id }); navigate('/interview/setup'); };
  return (
    <>
      <PageHeader title="Choose your career" subtitle="Pick the role you are preparing for. You will fine-tune the details on the next step." />
      <div className="grid gap-5 md:grid-cols-2">
        {CAREERS.map((c) => (
          <article key={c.id} style={{ '--c': c.color }} className="surface tint-border glow-c flex flex-col p-6">
            <div className="flex items-center gap-4">
              <span className="tint grid size-14 place-items-center rounded-2xl"><c.icon size={26} /></span>
              <h2 className="text-xl font-semibold">{c.title}</h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">{c.description}</p>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Skills included">
              {c.skills.map((s) => <li key={s} className="tint rounded-full px-3 py-1 text-xs font-medium">{s}</li>)}
            </ul>
            <Button onClick={() => start(c.id)} iconRight={ArrowRight} className="mt-6 self-start !bg-(--c) !text-ink-950 !shadow-none hover:brightness-110">Start Interview</Button>
          </article>
        ))}
      </div>
    </>
  );
}
