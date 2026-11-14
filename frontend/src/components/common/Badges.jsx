import { STATUS_LABEL } from '../../utils/format';
import { useTranslation } from 'react-i18next';

const tones = {
  completed: 'bg-emerald-400/12 text-emerald-300',
  in_progress: 'bg-sky-400/12 text-sky-300',
  draft: 'bg-slate-400/12 text-slate-300',
  abandoned: 'bg-red-400/12 text-red-300',
};
export const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[status] || tones.draft}`}>{t(`dashboard.status.${status}`, STATUS_LABEL[status] || status)}</span>;
};
export const ScoreBadge = ({ score }) => {
  if (score == null) return <span className="text-muted">—</span>;
  const tone = score >= 75 ? 'text-emerald-300' : score >= 50 ? 'text-amber-300' : 'text-red-300';
  return <span className={`font-display text-lg font-semibold ${tone}`}>{Math.round(score)}<span className="text-xs font-normal text-muted">/100</span></span>;
};
