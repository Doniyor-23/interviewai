import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlayCircle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import OptionGroup from '../../components/forms/OptionGroup';
import Button from '../../components/common/Button';
import ConfigSummary from './ConfigSummary';
import { useInterviewConfig } from '../../context/InterviewConfigContext';
import { CAREERS, DIFFICULTIES, DURATIONS, LANGUAGES, LEVELS, TYPES } from '../../utils/careers';

export default function InterviewSetup() {
  const { config, setConfig } = useInterviewConfig();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const c = params.get('career');
    if (c && CAREERS.some((x) => x.id === c)) setConfig({ career: c });
  }, [params, setConfig]);

  return (
    <>
      <PageHeader title="Set up your interview" subtitle="Your choices are saved automatically and used when the interview starts." />
      <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <form className="surface space-y-7 p-6" onSubmit={(e) => { e.preventDefault(); navigate('/interview/room'); }}>
          <OptionGroup label="Career" columns={2} value={config.career} onChange={(v) => setConfig({ career: v })} options={CAREERS.map((c) => ({ value: c.id, label: c.title, color: c.color }))} />
          <OptionGroup label="Experience level" value={config.experienceLevel} onChange={(v) => setConfig({ experienceLevel: v })} options={LEVELS} />
          <OptionGroup label="Difficulty" columns={3} value={config.difficulty} onChange={(v) => setConfig({ difficulty: v })} options={DIFFICULTIES} />
          <OptionGroup label="Duration" columns={3} value={config.durationMinutes} onChange={(v) => setConfig({ durationMinutes: v })} options={DURATIONS} />
          <OptionGroup label="Language" columns={3} value={config.language} onChange={(v) => setConfig({ language: v })} options={LANGUAGES} />
          <OptionGroup label="Interview type" value={config.interviewType} onChange={(v) => setConfig({ interviewType: v })} options={TYPES} />
          <Button type="submit" size="lg" icon={PlayCircle} className="w-full sm:w-auto">Start Interview</Button>
        </form>
        <ConfigSummary config={config} />
      </div>
    </>
  );
}
