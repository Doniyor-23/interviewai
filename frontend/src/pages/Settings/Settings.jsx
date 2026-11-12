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

const Section = ({ title, text, children }) => (
  <section className="surface p-6"><h2 className="text-lg font-semibold">{title}</h2>{text && <p className="mt-1 text-sm text-muted">{text}</p>}<div className="mt-5">{children}</div></section>
);

function PasswordForm() {
  const toast = useToast();
  const empty = { currentPassword: '', newPassword: '', confirmPassword: '' };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    const errs = clean({ currentPassword: required(form.currentPassword, 'Current password'), newPassword: passwordError(form.newPassword), confirmPassword: form.newPassword === form.confirmPassword ? '' : 'Passwords do not match.' });
    setErrors(errs); setFormError('');
    if (Object.keys(errs).length) return;
    setLoading(true);
    try { const r = await userService.changePassword(form); toast.success(r.message); setForm(empty); } catch (err) { setErrors(err.errors || {}); setFormError(err.message); } finally { setLoading(false); }
  };
  return (
    <form onSubmit={submit} className="max-w-md space-y-4" noValidate>
      <FormAlert>{formError}</FormAlert>
      <Input label="Current password" type="password" icon={Lock} autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} />
      <Input label="New password" type="password" icon={Lock} autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} error={errors.newPassword} />
      <PasswordStrength password={form.newPassword} />
      <Input label="Confirm new password" type="password" icon={Lock} autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
      <Button type="submit" loading={loading}>Update password</Button>
    </form>
  );
}

export default function Settings() {
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
  const setNotif = (k) => (v) => update({ notifications: { ...user.notifications, [k]: v } }, 'Preferences saved.');

  const remove = async () => {
    if (!delPw) return setDelErr('Enter your password to confirm.');
    setDeleting(true); setDelErr('');
    try { await userService.deleteAccount(delPw); await logout().catch(() => {}); toast.success('Your account was deleted.'); navigate('/', { replace: true }); } catch (err) { setDelErr(err.message); } finally { setDeleting(false); }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Security, language and notifications." />
      <div className="max-w-3xl space-y-6">
        <Section title="Change password"><PasswordForm /></Section>
        <Section title="Preferred language" text="Changes the website language and your default language for interviews.">
          <LanguageSwitcher />
        </Section>
        <Section title="Notifications">
          <div className="divide-y divide-line">
            <Toggle label="Email notifications" description="Account and security emails." checked={user.notifications?.email ?? true} onChange={setNotif('email')} />
            <Toggle label="Practice reminders" description="Occasional nudges to keep your streak going." checked={user.notifications?.practiceReminders ?? true} onChange={setNotif('practiceReminders')} />
            <Toggle label="Product updates" description="News about new features." checked={user.notifications?.productUpdates ?? false} onChange={setNotif('productUpdates')} />
          </div>
        </Section>
        <section className="rounded-2xl border border-red-400/30 bg-red-500/5 p-6">
          <h2 className="text-lg font-semibold text-red-200">Delete account</h2>
          <p className="mt-1 text-sm text-muted">Permanently deletes your account and all interview history. This cannot be undone.</p>
          <Button variant="outlineDanger" className="mt-5" onClick={() => setDelOpen(true)}>Delete my account</Button>
        </section>
      </div>
      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Delete your account?">
        <p className="text-sm text-muted">Enter your password to permanently delete your account and all of your data.</p>
        <div className="mt-4 space-y-3">
          <FormAlert>{delErr}</FormAlert>
          <Input type="password" aria-label="Password" placeholder="Your password" autoComplete="current-password" value={delPw} onChange={(e) => setDelPw(e.target.value)} />
        </div>
        <div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setDelOpen(false)}>Cancel</Button><Button variant="danger" loading={deleting} onClick={remove}>Delete forever</Button></div>
      </Modal>
    </>
  );
}
