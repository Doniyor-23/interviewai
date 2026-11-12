import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlayCircle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import OptionGroup from '../../components/forms/OptionGroup';
import Button from '../../components/common/Button';
import ConfigSummary from './ConfigSummary';
import { useInterviewConfig } from '../../context/InterviewConfigContext';
import { CAREERS, DIFFICULTIES, DURATIONS, LANGUAGES, LEVELS, TYPES } from '../../utils/careers';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

export default function InterviewSetup() {
  const { t } = useTranslation();
  const { config, setConfig } = useInterviewConfig();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!config.languageExplicit && ['uz', 'en', 'ru'].includes(user?.preferredLanguage)) setConfig({ language: user.preferredLanguage });
  }, [user?.preferredLanguage, config.languageExplicit, setConfig]);

  useEffect(() => {
    const c = params.get('career');
    if (c && CAREERS.some((x) => x.id === c)) setConfig({ career: c });
  }, [params, setConfig]);

  return (
    <>
      <PageHeader title={t('setup.title')} subtitle={t('setup.subtitle')} />
      <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <form className="surface space-y-7 p-6" onSubmit={(e) => { e.preventDefault(); navigate('/interview/room'); }}>
          <OptionGroup label={t('setup.career')} columns={2} value={config.career} onChange={(v) => setConfig({ career: v })} options={CAREERS.map((c) => ({ value: c.id, label: t(`setup.careers.${c.id}`, c.title), color: c.color }))} />
          <OptionGroup label={t('setup.level')} value={config.experienceLevel} onChange={(v) => setConfig({ experienceLevel: v })} options={LEVELS.map((o) => ({ ...o, label: t(`setup.levels.${o.value}`, o.label) }))} />
          <OptionGroup label={t('setup.difficulty')} columns={3} value={config.difficulty} onChange={(v) => setConfig({ difficulty: v })} options={DIFFICULTIES.map((o) => ({ ...o, label: t(`setup.difficulties.${o.value}`, o.label) }))} />
          <OptionGroup label={t('setup.duration')} columns={3} value={config.durationMinutes} onChange={(v) => setConfig({ durationMinutes: v })} options={DURATIONS.map((o) => ({ ...o, label: t(`setup.minutes${o.value}`, o.label) }))} />
          <OptionGroup label={t('setup.language')} columns={3} value={config.language} onChange={(v) => setConfig({ language: v })} options={LANGUAGES} />
          <OptionGroup label={t('setup.type')} value={config.interviewType} onChange={(v) => setConfig({ interviewType: v })} options={TYPES.map((o) => ({ ...o, label: t(`setup.types.${o.value}`, o.label) }))} />
          <Button type="submit" size="lg" icon={PlayCircle} className="w-full sm:w-auto">{t('setup.start')}</Button>
        </form>
        <ConfigSummary config={config} />
      </div>
    </>
  );
}
