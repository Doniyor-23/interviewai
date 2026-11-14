import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import Input from '../../components/forms/Input';
import PasswordStrength from '../../components/forms/PasswordStrength';
import Button from '../../components/common/Button';
import { FormAlert } from '../../components/common/ErrorNotice';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';
import { clean, passwordError } from '../../utils/validators';
import { useTranslation } from 'react-i18next';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const email = params.get('email') || '';
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (!token || !email) {
    return (
      <AuthLayout title={t('pages.auxiliary.invalidLink')} subtitle={t('pages.auxiliary.invalidLinkText')} footer={<Link to="/login" className="font-semibold text-brand-soft hover:underline">{t('pages.auxiliary.backLogin')}</Link>}>
        <Button to="/forgot-password" className="w-full">{t('pages.auxiliary.requestLink')}</Button>
      </AuthLayout>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    const errs = clean({ password: passwordError(form.password, t), confirmPassword: form.password === form.confirmPassword ? '' : t('pages.auxiliary.passwordMismatch') });
    setErrors(errs); setFormError('');
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const r = await authService.resetPassword({ email, token, ...form });
      toast.success(r.message);
      navigate('/login', { replace: true });
    } catch (err) { setFormError(err.message); setErrors(err.errors || {}); } finally { setLoading(false); }
  };

  return (
    <AuthLayout title={t('pages.auxiliary.choosePassword')} subtitle={<>{t('pages.auxiliary.for')} <span className="text-fg">{email}</span></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormAlert>{formError}</FormAlert>
        <Input label={t('pages.auxiliary.newPassword')} type="password" icon={Lock} autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
        <PasswordStrength password={form.password} />
        <Input label={t('pages.auxiliary.confirmPassword')} type="password" icon={Lock} autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
        <Button type="submit" loading={loading} className="w-full">{t('pages.auxiliary.updatePassword')}</Button>
      </form>
    </AuthLayout>
  );
}
