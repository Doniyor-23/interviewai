import { CAREERS, DIFFICULTIES, DURATIONS, LANGUAGES, LEVELS, TYPES, careerById, labelOf } from '../../utils/careers';

export default function ConfigSummary({ config }) {
  const c = careerById(config.career);
  const rows = [
    ['Level', labelOf(LEVELS, config.experienceLevel)], ['Difficulty', labelOf(DIFFICULTIES, config.difficulty)],
    ['Duration', labelOf(DURATIONS, config.durationMinutes)], ['Language', labelOf(LANGUAGES, config.language)], ['Type', labelOf(TYPES, config.interviewType)],
  ];
  return (
    <aside className="surface tint-border p-6 lg:sticky lg:top-8" style={{ '--c': c?.color }}>
      <span className="tint grid size-12 place-items-center rounded-xl">{c && <c.icon size={22} />}</span>
      <h2 className="mt-4 text-xl font-semibold">{c?.title}</h2>
      <dl className="mt-5 divide-y divide-line text-sm">
        {rows.map(([k, v]) => <div key={k} className="flex justify-between py-2.5"><dt className="text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>)}
      </dl>
      <p className="mt-4 text-xs text-muted">Skills covered: {c?.skills.join(', ')}</p>
    </aside>
  );
}
