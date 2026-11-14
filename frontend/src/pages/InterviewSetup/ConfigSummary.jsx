import { CAREERS, DIFFICULTIES, DURATIONS, LANGUAGES, LEVELS, TYPES, careerById, labelOf } from '../../utils/careers';
import { useTranslation } from 'react-i18next';

export default function ConfigSummary({ config }) {
  const { t } = useTranslation();
  const c = careerById(config.career);
  const rows = [
    [t('setup.level'), t(`setup.levels.${config.experienceLevel}`, labelOf(LEVELS, config.experienceLevel))], [t('setup.difficulty'), t(`setup.difficulties.${config.difficulty}`, labelOf(DIFFICULTIES, config.difficulty))],
    [t('setup.duration'), t(`setup.minutes${config.durationMinutes}`, labelOf(DURATIONS, config.durationMinutes))], [t('setup.language'), t(`language.${config.language}`, labelOf(LANGUAGES, config.language))], [t('setup.type'), t(`setup.types.${config.interviewType}`, labelOf(TYPES, config.interviewType))],
  ];
  return (
    <aside className="surface tint-border p-6 lg:sticky lg:top-8" style={{ '--c': c?.color }}>
      <span className="tint grid size-12 place-items-center rounded-xl">{c && <c.icon size={22} />}</span>
      <h2 className="mt-4 text-xl font-semibold">{t(`setup.careers.${config.career}`, c?.title)}</h2>
      <dl className="mt-5 divide-y divide-line text-sm">
        {rows.map(([k, v]) => <div key={k} className="flex justify-between py-2.5"><dt className="text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>)}
      </dl>
      <p className="mt-4 text-xs text-muted">{t('pages.careers.skills')}: {c?.skills.join(', ')}</p>
    </aside>
  );
}
