import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, History, Search, Trash2 } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Input from '../../components/forms/Input';
import SelectField from '../../components/forms/SelectField';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import ErrorNotice from '../../components/common/ErrorNotice';
import Modal from '../../components/common/Modal';
import Spinner from '../../components/common/Spinner';
import { ScoreBadge, StatusBadge } from '../../components/common/Badges';
import { useFetch } from '../../hooks/useFetch';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../context/ToastContext';
import { interviewService } from '../../services/interviewService';
import { CAREERS, careerById } from '../../utils/careers';
import { formatDate } from '../../utils/format';
import { useTranslation } from 'react-i18next';

export default function Interviews() {
  const { t, i18n } = useTranslation();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [career, setCareer] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();
  const dq = useDebounce(q);
  const { data, loading, error, reload } = useFetch(() => interviewService.list({ q: dq, status, career, sort, page, limit: 8 }), [dq, status, career, sort, page]);
  const filtered = !!(dq || status || career);
  const statuses = [{ value: '', label: t('pages.interviews.allStatuses') }, { value: 'completed', label: t('pages.interviews.completed') }, { value: 'in_progress', label: t('pages.interviews.inProgress') }, { value: 'draft', label: t('pages.interviews.draft') }, { value: 'abandoned', label: t('pages.interviews.abandoned') }];
  const careers = [{ value: '', label: t('pages.interviews.allCareers') }, ...CAREERS.map((c) => ({ value: c.id, label: t(`setup.careers.${c.id}`, c.title) }))];
  const sorts = [{ value: 'newest', label: t('pages.interviews.newest') }, { value: 'oldest', label: t('pages.interviews.oldest') }, { value: 'score_desc', label: t('pages.interviews.highest') }, { value: 'score_asc', label: t('pages.interviews.lowest') }];
  const change = (setter) => (e) => { setter(e.target.value); setPage(1); };

  const confirmDelete = async () => {
    setDeleting(true);
    try { await interviewService.remove(toDelete._id); toast.success(t('pages.interviews.deleted')); setToDelete(null); reload(); } catch (e) { toast.error(e.message); } finally { setDeleting(false); }
  };

  return (
    <>
      <PageHeader title={t('pages.interviews.title')} subtitle={t('pages.interviews.subtitle')} action={<Button to="/careers">{t('pages.interviews.new')}</Button>} />
      <div className="surface mb-5 grid gap-3 p-4 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <Input icon={Search} placeholder={t('pages.interviews.search')} aria-label={t('pages.interviews.search')} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <SelectField aria-label={t('pages.interviews.status')} options={statuses} value={status} onChange={change(setStatus)} />
        <SelectField aria-label={t('pages.interviews.career')} options={careers} value={career} onChange={change(setCareer)} />
        <SelectField aria-label={t('pages.interviews.newest')} options={sorts} value={sort} onChange={change(setSort)} />
      </div>

      {error ? <ErrorNotice error={error} onRetry={reload} /> : (
        <div className="surface overflow-hidden">
          {loading && !data ? <div className="grid place-items-center py-16"><Spinner size={28} /></div> : data.items.length === 0 ? (
            <EmptyState icon={History} title={filtered ? t('pages.interviews.emptyFiltered') : t('pages.interviews.empty')} text={filtered ? t('pages.interviews.tryFilters') : t('pages.interviews.emptyText')}
              action={filtered ? <Button variant="secondary" size="sm" onClick={() => { setQ(''); setStatus(''); setCareer(''); setPage(1); }}>{t('pages.interviews.clear')}</Button> : <Button to="/careers" size="sm">{t('pages.interviews.startFirst')}</Button>} />
          ) : (
            <>
              <div className="hidden grid-cols-[2fr_1fr_.7fr_.8fr_1fr_auto] gap-4 border-b border-line px-5 py-3 text-xs text-muted md:grid"><span>{t('pages.interviews.career')}</span><span>{t('pages.interviews.date')}</span><span>{t('pages.interviews.duration')}</span><span>{t('pages.interviews.score')}</span><span>{t('pages.interviews.status')}</span><span className="w-[148px]" /></div>
              <ul className={`divide-y divide-line ${loading ? 'opacity-60' : ''}`}>
                {data.items.map((i) => {
                  const c = careerById(i.career);
                  const mins = i.timeSpentSeconds ? Math.max(1, Math.round(i.timeSpentSeconds / 60)) : i.durationMinutes;
                  return (
                    <li key={i._id} className="grid items-center gap-3 px-5 py-4 md:grid-cols-[2fr_1fr_.7fr_.8fr_1fr_auto] md:gap-4">
                      <div className="flex items-center gap-3">
                        <span style={{ '--c': c?.color }} className="tint grid size-10 shrink-0 place-items-center rounded-xl">{c && <c.icon size={18} />}</span>
                        <div><p className="font-semibold">{t(`setup.careers.${i.career}`, c?.title)}</p><p className="text-xs capitalize text-muted">{t(`setup.types.${i.interviewType}`, i.interviewType)} · {t(`setup.difficulties.${i.difficulty}`, i.difficulty)} · {t(`setup.levels.${i.experienceLevel}`, i.experienceLevel)}</p></div>
                      </div>
                      <span className="text-sm text-muted">{formatDate(i.completedAt || i.createdAt, i18n.language)}</span>
                      <span className="text-sm text-muted">{t('setup.minutes', { count: mins, defaultValue: `${mins} min` })}</span>
                      <ScoreBadge score={i.overallScore} />
                      <div><StatusBadge status={i.status} /></div>
                      <div className="flex gap-2">
                        {i.status === 'in_progress' ? <Button to={`/interview/room/${i._id}`} size="sm">{t('pages.interviews.resume')}</Button> : <Button to={`/interviews/${i._id}`} variant="secondary" size="sm">{t('pages.interviews.report')}</Button>}
                        <button onClick={() => setToDelete(i)} aria-label={t('pages.interviews.delete')} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-red-500/10 hover:text-red-300"><Trash2 size={16} /></button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm text-muted">
                <span>{t('pages.interviews.count', { count: data.pagination.total })}</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft size={16} /></Button>
                  <span>{t('pages.interviews.page', { page: data.pagination.page, pages: data.pagination.pages })}</span>
                  <Button variant="ghost" size="sm" disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight size={16} /></Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title={t('pages.interviews.deleteTitle')}>
        <p className="text-sm text-muted">{t('pages.interviews.deleteText')}</p>
        <div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setToDelete(null)}>{t('pages.interviews.cancel')}</Button><Button variant="danger" loading={deleting} onClick={confirmDelete}>{t('pages.interviews.deleteAction')}</Button></div>
      </Modal>
    </>
  );
}
