import { Link } from 'react-router-dom';
import { careerById } from '../../utils/careers';
import { formatDate } from '../../utils/format';
import { ScoreBadge, StatusBadge } from '../common/Badges';

export default function RecentHistory({ items }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((i) => {
        const c = careerById(i.career);
        return (
          <li key={i._id}>
            <Link to={`/interviews/${i._id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ink-700/50">
              <span style={{ '--c': c?.color }} className="tint grid size-10 shrink-0 place-items-center rounded-xl">{c && <c.icon size={18} />}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c?.title || i.career}</p>
                <p className="text-xs capitalize text-muted">{formatDate(i.createdAt)} · {i.interviewType} · {i.difficulty}</p>
              </div>
              <StatusBadge status={i.status} />
              <div className="hidden w-20 text-right sm:block"><ScoreBadge score={i.overallScore} /></div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
