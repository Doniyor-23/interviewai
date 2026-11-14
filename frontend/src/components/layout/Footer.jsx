import { Link } from 'react-router-dom';
import Logo from '../common/Logo';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const cols = [
    [t('landing.footer.product'), [[t('landing.footer.features'), '#features'], [t('landing.footer.how'), '#how'], [t('landing.footer.careers'), '#careers']]],
    [t('landing.footer.account'), user ? [[t('landing.footer.dashboard'), '/dashboard'], [t('landing.footer.interviews'), '/interviews'], [t('landing.footer.settings'), '/settings']] : [[t('landing.footer.login'), '/login'], [t('landing.footer.create'), '/register'], [t('landing.footer.reset'), '/forgot-password']]],
  ];
  return (
    <footer className="border-t border-line bg-ink-950">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div><Logo /><p className="mt-4 max-w-xs text-sm text-muted">{t('landing.footer.text')}</p></div>
        {cols.map(([title, items]) => (
          <div key={title}>
            <h3 className="font-sans text-sm font-semibold">{title}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              {items.map(([l, h]) => <li key={l}>{h.startsWith('#') ? <a href={h} className="hover:text-fg">{l}</a> : <Link to={h} className="hover:text-fg">{l}</Link>}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-muted">© {new Date().getFullYear()} InterviewAI. {t('landing.footer.rights')}</div>
    </footer>
  );
}
