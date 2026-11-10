import { Link } from 'react-router-dom';
import Logo from '../common/Logo';
import { useAuth } from '../../context/AuthContext';

export default function Footer() {
  const { user } = useAuth();
  const cols = [
    ['Product', [['Features', '#features'], ['How it works', '#how'], ['Careers', '#careers']]],
    ['Account', user ? [['Dashboard', '/dashboard'], ['My interviews', '/interviews'], ['Settings', '/settings']] : [['Log in', '/login'], ['Create account', '/register'], ['Reset password', '/forgot-password']]],
  ];
  return (
    <footer className="border-t border-line bg-ink-950">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div><Logo /><p className="mt-4 max-w-xs text-sm text-muted">Practice real-world job interviews with AI and walk into the room prepared.</p></div>
        {cols.map(([title, items]) => (
          <div key={title}>
            <h3 className="font-sans text-sm font-semibold">{title}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              {items.map(([l, h]) => <li key={l}>{h.startsWith('#') ? <a href={h} className="hover:text-fg">{l}</a> : <Link to={h} className="hover:text-fg">{l}</Link>}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-muted">© {new Date().getFullYear()} InterviewAI. All rights reserved.</div>
    </footer>
  );
}
