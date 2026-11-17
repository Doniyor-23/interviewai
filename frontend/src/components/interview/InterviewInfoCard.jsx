import { Briefcase, BarChart2, Globe, Clock, Layers, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { careerById, labelOf, LEVELS, DIFFICULTIES, DURATIONS, LANGUAGES } from '../../utils/careers';

export default function InterviewInfoCard({ state, config, elapsed, className = '' }) {
  const { t } = useTranslation();
  const cfg = state?.config || config;
  const career = careerById(cfg.career);
  const p = state?.progress;

  const totalQuestions = Math.max(p?.planned || 8, p?.questionNumber || 1);
  const answeredCount = p?.answered || 0;
  const progressPercent = Math.min(100, Math.round((answeredCount / totalQuestions) * 100));

  return (
    <div className={`overflow-hidden rounded-3xl border border-line/80 bg-ink-900/90 p-5 shadow-xl backdrop-blur ${className}`}>
      {/* Career & Role header */}
      <div className="flex items-center gap-3 border-b border-line/60 pb-4">
        <div
          className="grid size-11 place-items-center rounded-2xl border"
          style={{
            backgroundColor: `${career?.color || '#7c5cff'}15`,
            borderColor: `${career?.color || '#7c5cff'}30`,
            color: career?.color || '#7c5cff',
          }}
        >
          {career?.icon && <career.icon size={20} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">
            {career?.title || cfg.career}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>{labelOf(LEVELS, cfg.experienceLevel)}</span>
            <span>•</span>
            <span className="capitalize">{labelOf(DIFFICULTIES, cfg.difficulty)}</span>
          </div>
        </div>
      </div>

      {/* Meta Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl border border-line/50 bg-ink-950/50 p-2.5">
          <div className="flex items-center gap-1.5 text-muted">
            <Globe size={13} className="text-brand-soft" />
            <span>{t('interview.voiceLanguage', 'Language')}</span>
          </div>
          <p className="mt-1 font-medium text-fg uppercase">
            {cfg.language === 'uz' ? "🇺🇿 O'zbek" : cfg.language === 'ru' ? '🇷🇺 Русский' : '🇬🇧 English'}
          </p>
        </div>

        <div className="rounded-xl border border-line/50 bg-ink-950/50 p-2.5">
          <div className="flex items-center gap-1.5 text-muted">
            <Clock size={13} className="text-brand-blue" />
            <span>{t('setup.duration', 'Duration')}</span>
          </div>
          <p className="mt-1 font-medium text-fg">
            {cfg.durationMinutes} {t('common.minutes', 'min')}
          </p>
        </div>
      </div>

      {/* Questions Progress */}
      {p && (
        <div className="mt-4 border-t border-line/60 pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>{t('dashboard.history.progress', 'Progress')}</span>
            </span>
            <span className="font-semibold text-fg">
              {answeredCount} / {totalQuestions} ({progressPercent}%)
            </span>
          </div>

          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-violet to-brand-blue transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
