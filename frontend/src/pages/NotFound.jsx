import Button from '../components/common/Button';
import { useTranslation } from 'react-i18next';
export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="font-display text-7xl font-semibold text-brand-soft">404</p>
        <h1 className="mt-3 text-2xl font-semibold">{t('pages.auxiliary.notFound')}</h1>
        <p className="mt-2 text-muted">{t('pages.auxiliary.notFoundText')}</p>
        <Button to="/" className="mt-6">{t('pages.auxiliary.home')}</Button>
      </div>
    </div>
  );
}
