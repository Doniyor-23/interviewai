import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';

const names = { uz: 'O‘zbekcha', en: 'English', ru: 'Русский' };
export default function LanguageSwitcher({ className = '' }) {
  const { i18n, t } = useTranslation();
  const { user, setUser } = useAuth();
  useEffect(() => {
    if (user?.preferredLanguage && user.preferredLanguage !== i18n.language) {
      i18n.changeLanguage(user.preferredLanguage);
      try { localStorage.setItem('interviewai:language', user.preferredLanguage); } catch { /* storage unavailable */ }
    }
  }, [user?.preferredLanguage]);
  const change = async (event) => {
    const language = event.target.value;
    i18n.changeLanguage(language);
    try { localStorage.setItem('interviewai:language', language); } catch { /* storage unavailable */ }
    if (user && user.preferredLanguage !== language) {
      try { const result = await userService.updateProfile({ preferredLanguage: language }); setUser(result.user); } catch { /* local preference still applies */ }
    }
  };
  return <label className={`inline-flex items-center gap-2 text-sm text-muted ${className}`}>
    <span className="sr-only">{t('language.label')}</span>
    <select aria-label={t('language.label')} value={['uz', 'en', 'ru'].includes(i18n.language) ? i18n.language : 'uz'} onChange={change} className="rounded-lg border border-line bg-ink-800 px-2.5 py-2 text-fg focus:outline-none focus:ring-2 focus:ring-brand-violet/50">
      {Object.entries(names).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
  </label>;
}
