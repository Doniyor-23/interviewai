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

const statuses = [{ value: '', label: 'All statuses' }, { value: 'completed', label: 'Completed' }, { value: 'in_progress', label: 'In progress' }, { value: 'draft', label: 'Draft' }, { value: 'abandoned', label: 'Abandoned' }];
const careers = [{ value: '', label: 'All careers' }, ...CAREERS.map((c) => ({ value: c.id, label: c.title }))];
const sorts = [{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }, { value: 'score_desc', label: 'Highest score' }, { value: 'score_asc', label: 'Lowest score' }];

export default function Interviews() {
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
  const change = (setter) => (e) => { setter(e.target.value); setPage(1); };

  const confirmDelete = async () => {
    setDeleting(true);
    try { await interviewService.remove(toDelete._id); toast.success('Interview deleted.'); setToDelete(null); reload(); } catch (e) { toast.error(e.message); } finally { setDeleting(false); }
  };

  return (
    <>
      <PageHeader title="My interviews" subtitle="Every session you have started, in one place." action={<Button to="/careers">New interview</Button>} />
      <div className="surface mb-5 grid gap-3 p-4 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <Input icon={Search} placeholder="Search career, type, difficulty…" aria-label="Search interviews" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <SelectField aria-label="Filter by status" options={statuses} value={status} onChange={change(setStatus)} />
        <SelectField aria-label="Filter by career" options={careers} value={career} onChange={change(setCareer)} />
        <SelectField aria-label="Sort" options={sorts} value={sort} onChange={change(setSort)} />
      </div>

      {error ? <ErrorNotice error={error} onRetry={reload} /> : (
        <div className="surface overflow-hidden">
          {loading && !data ? <div className="grid place-items-center py-16"><Spinner size={28} /></div> : data.items.length === 0 ? (
            <EmptyState icon={History} title={filtered ? 'No interviews match your filters' : 'No interviews yet'} text={filtered ? 'Try a different search or clear the filters.' : 'Once you start an interview, it will be listed here with its score and report.'}
              action={filtered ? <Button variant="secondary" size="sm" onClick={() => { setQ(''); setStatus(''); setCareer(''); setPage(1); }}>Clear filters</Button> : <Button to="/careers" size="sm">Start your first interview</Button>} />
          ) : (
            <>
              <div className="hidden grid-cols-[2fr_1fr_.7fr_.8fr_1fr_auto] gap-4 border-b border-line px-5 py-3 text-xs text-muted md:grid"><span>Career</span><span>Date</span><span>Duration</span><span>Score</span><span>Status</span><span className="w-[148px]" /></div>
              <ul className={`divide-y divide-line ${loading ? 'opacity-60' : ''}`}>
                {data.items.map((i) => {
                  const c = careerById(i.career);
                  const mins = i.timeSpentSeconds ? Math.max(1, Math.round(i.timeSpentSeconds / 60)) : i.durationMinutes;
                  return (
                    <li key={i._id} className="grid items-center gap-3 px-5 py-4 md:grid-cols-[2fr_1fr_.7fr_.8fr_1fr_auto] md:gap-4">
                      <div className="flex items-center gap-3">
                        <span style={{ '--c': c?.color }} className="tint grid size-10 shrink-0 place-items-center rounded-xl">{c && <c.icon size={18} />}</span>
                        <div><p className="font-semibold">{c?.title}</p><p className="text-xs capitalize text-muted">{i.interviewType} · {i.difficulty} · {i.experienceLevel}</p></div>
                      </div>
                      <span className="text-sm text-muted">{formatDate(i.completedAt || i.createdAt)}</span>
                      <span className="text-sm text-muted">{mins} min</span>
                      <ScoreBadge score={i.overallScore} />
                      <div><StatusBadge status={i.status} /></div>
                      <div className="flex gap-2">
                        {i.status === 'in_progress' ? <Button to={`/interview/room/${i._id}`} size="sm">Resume</Button> : <Button to={`/interviews/${i._id}`} variant="secondary" size="sm">View report</Button>}
                        <button onClick={() => setToDelete(i)} aria-label="Delete interview" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-red-500/10 hover:text-red-300"><Trash2 size={16} /></button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm text-muted">
                <span>{data.pagination.total} interview{data.pagination.total !== 1 && 's'}</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft size={16} /></Button>
                  <span>Page {data.pagination.page} of {data.pagination.pages}</span>
                  <Button variant="ghost" size="sm" disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight size={16} /></Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete this interview?">
        <p className="text-sm text-muted">This permanently removes the interview and its report. This cannot be undone.</p>
        <div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setToDelete(null)}>Cancel</Button><Button variant="danger" loading={deleting} onClick={confirmDelete}>Delete</Button></div>
      </Modal>
    </>
  );
}
