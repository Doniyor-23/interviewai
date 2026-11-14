import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Input from '../../components/forms/Input';
import PasswordStrength from '../../components/forms/PasswordStrength';
import Toggle from '../../components/forms/Toggle';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { FormAlert } from '../../components/common/ErrorNotice';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/userService';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import { clean, passwordError, required } from '../../utils/validators';
import { useTranslation } from 'react-i18next';

const Section = ({ title, text, children }) => (
  <section className="surface p-6"><h2 className="text-lg font-semibold">{title}</h2>{text && <p className="mt-1 text-sm text-muted">{text}</p>}<div className="mt-5">{children}</div></section>
);

function PasswordForm() {
  const { t } = useTranslation();
  const toast = useToast();
  const empty = { currentPassword: '', newPassword: '', confirmPassword: '' };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    const errs = clean({ currentPassword: required(form.currentPassword, t('pages.settings.current'), t), newPassword: passwordError(form.newPassword, t), confirmPassword: form.newPassword === form.confirmPassword ? '' : t('pages.settings.mismatch') });
    setErrors(errs); setFormError('');
    if (Object.keys(errs).length) return;
    setLoading(true);
    try { const r = await userService.changePassword(form); toast.success(r.message); setForm(empty); } catch (err) { setErrors(err.errors || {}); setFormError(err.message); } finally { setLoading(false); }
  };
  return (
    <form onSubmit={submit} className="max-w-md space-y-4" noValidate>
      <FormAlert>{formError}</FormAlert>
      <Input label={t('pages.settings.current')} type="password" icon={Lock} autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} />
      <Input label={t('pages.settings.new')} type="password" icon={Lock} autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} error={errors.newPassword} />
      <PasswordStrength password={form.newPassword} />
      <Input label={t('pages.settings.confirm')} type="password" icon={Lock} autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
      <Button type="submit" loading={loading}>{t('pages.settings.update')}</Button>
    </form>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const { user, setUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [delOpen, setDelOpen] = useState(false);
  const [delPw, setDelPw] = useState('');
  const [delErr, setDelErr] = useState('');
  const [deleting, setDeleting] = useState(false);

  const update = async (patch, okMsg) => {
    try { const r = await userService.updateProfile(patch); setUser(r.user); toast.success(okMsg); } catch (err) { toast.error(err.message); }
  };
  const setNotif = (k) => (v) => update({ notifications: { ...user.notifications, [k]: v } }, t('pages.settings.save'));

  const remove = async () => {
    if (!delPw) return setDelErr(t('pages.settings.enterPassword'));
    setDeleting(true); setDelErr('');
    try { await userService.deleteAccount(delPw); await logout().catch(() => {}); toast.success(t('pages.settings.deleted')); navigate('/', { replace: true }); } catch (err) { setDelErr(err.message); } finally { setDeleting(false); }
  };

  return (
    <>
      <PageHeader title={t('pages.settings.title')} subtitle={t('pages.settings.subtitle')} />
      <div className="max-w-3xl space-y-6">
        <Section title={t('pages.settings.password')}><PasswordForm /></Section>
        <Section title={t('pages.settings.preferred')} text={t('pages.settings.preferredText')}>
          <LanguageSwitcher />
        </Section>
        <Section title={t('pages.settings.notifications')}>
          <div className="divide-y divide-line">
            <Toggle label={t('pages.settings.email')} description={t('pages.settings.emailText')} checked={user.notifications?.email ?? true} onChange={setNotif('email')} />
            <Toggle label={t('pages.settings.reminders')} description={t('pages.settings.remindersText')} checked={user.notifications?.practiceReminders ?? true} onChange={setNotif('practiceReminders')} />
            <Toggle label={t('pages.settings.updates')} description={t('pages.settings.updatesText')} checked={user.notifications?.productUpdates ?? false} onChange={setNotif('productUpdates')} />
          </div>
        </Section>
        <section className="rounded-2xl border border-red-400/30 bg-red-500/5 p-6">
          <h2 className="text-lg font-semibold text-red-200">{t('pages.settings.delete')}</h2>
          <p className="mt-1 text-sm text-muted">{t('pages.settings.deleteText')}</p>
          <Button variant="outlineDanger" className="mt-5" onClick={() => setDelOpen(true)}>{t('pages.settings.deleteMy')}</Button>
        </section>
      </div>
      <Modal open={delOpen} onClose={() => setDelOpen(false)} title={t('pages.settings.deleteTitle')}>
        <p className="text-sm text-muted">{t('pages.settings.deleteConfirm')}</p>
        <div className="mt-4 space-y-3">
          <FormAlert>{delErr}</FormAlert>
          <Input type="password" aria-label="Password" placeholder="Your password" autoComplete="current-password" value={delPw} onChange={(e) => setDelPw(e.target.value)} />
        </div>
        <div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setDelOpen(false)}>{t('pages.settings.cancel')}</Button><Button variant="danger" loading={deleting} onClick={remove}>{t('pages.settings.forever')}</Button></div>
      </Modal>
    </>
  );
}
