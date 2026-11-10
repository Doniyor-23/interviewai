import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { History, LayoutDashboard, LogOut, Menu, PlayCircle, Settings, TrendingUp, UserRound, X } from 'lucide-react';
import Logo from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';
import { fullName, initials } from '../utils/format';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/careers', label: 'Start Interview', icon: PlayCircle },
  { to: '/interviews', label: 'My Interviews', icon: History },
  { to: '/progress', label: 'My Progress', icon: TrendingUp },
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Avatar({ user, size = 36 }) {
  return user?.profileImage ? (
    <img src={user.profileImage} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid place-items-center rounded-full bg-brand-violet/25 font-semibold text-brand-soft" style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials(user)}</span>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => setOpen(false), [pathname]);

  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6"><Logo to="/dashboard" /></div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Main">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-brand-violet/18 text-fg ring-1 ring-brand-violet/40' : 'text-muted hover:bg-ink-700 hover:text-fg'}`}>
            <Icon size={18} />{label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar user={user} />
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{fullName(user)}</p><p className="truncate text-xs text-muted">{user?.email}</p></div>
        </div>
        <button onClick={handleLogout} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted hover:bg-red-500/10 hover:text-red-300"><LogOut size={18} />Logout</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-ink-950 lg:block">{sidebar}</aside>
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-ink-900/90 px-4 backdrop-blur lg:hidden">
        <Logo to="/dashboard" />
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="grid size-10 place-items-center rounded-lg text-muted hover:bg-ink-700"><Menu size={22} /></button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/80" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line bg-ink-950">
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-5 text-muted"><X size={20} /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8"><Outlet /></main>
    </div>
  );
}
