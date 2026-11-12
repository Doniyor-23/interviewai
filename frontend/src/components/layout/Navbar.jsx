import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../common/Logo';
import Button from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../common/LanguageSwitcher';

const links = [['Features', '#features'], ['How it works', '#how'], ['Careers', '#careers'], ['FAQ', '#faq']];

export default function Navbar() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ink-900/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {links.map(([l, h], i) => <a key={h} href={h} className="text-sm text-muted transition-colors hover:text-fg">{[t('nav.features'), t('nav.how'), t('nav.careers'), t('nav.faq')][i]}</a>)}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher className="mr-2" />
          {user ? <Button to="/dashboard" size="sm">{t('nav.dashboard')}</Button> : (
            <>
              <Link to="/login" className="px-3 text-sm font-medium text-muted hover:text-fg">{t('nav.login')}</Link>
              <Button to="/register" size="sm">{t('nav.start')}</Button>
            </>
          )}
        </div>
        <button className="grid size-10 place-items-center rounded-lg text-muted hover:bg-ink-700 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && (
        <div className="border-t border-line bg-ink-900 px-5 pb-5 pt-3 md:hidden">
          {links.map(([l, h], i) => <a key={h} href={h} onClick={() => setOpen(false)} className="block py-2.5 text-muted hover:text-fg">{[t('nav.features'), t('nav.how'), t('nav.careers'), t('nav.faq')][i]}</a>)}
          <LanguageSwitcher className="mt-2" />
          <div className="mt-3 flex gap-2">
            {user ? <Button to="/dashboard" className="flex-1">{t('nav.dashboard')}</Button> : (<><Button to="/login" variant="secondary" className="flex-1">{t('nav.login')}</Button><Button to="/register" className="flex-1">{t('nav.start')}</Button></>)}
          </div>
        </div>
      )}
    </header>
  );
}
