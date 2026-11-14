import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import Input from '../../components/forms/Input';
import PasswordStrength from '../../components/forms/PasswordStrength';
import Button from '../../components/common/Button';
import { FormAlert } from '../../components/common/ErrorNotice';
import { authService } from '../../services/authService';
import { clean, isEmail, passwordError, required } from '../../utils/validators';
import { useTranslation } from 'react-i18next';

export default function Register() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = clean({
      firstName: required(form.firstName, t('auth.firstName'), t), lastName: required(form.lastName, t('auth.lastName'), t),
      email: isEmail(form.email) ? '' : t('auth.invalidEmail'), password: passwordError(form.password, t),
      confirmPassword: form.password === form.confirmPassword ? '' : t('auth.passwordMismatch'),
    });
    setErrors(errs); setFormError('');
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const res = await authService.register(form);
      navigate('/verify-email', { state: { email: res.email, resendAfter: res.resendAfter } });
    } catch (err) {
      setErrors(err.errors || {});
      setFormError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout title={t('auth.createAccount')} subtitle={t('auth.registerSubtitle')} footer={<>{t('auth.haveAccount')} <Link to="/login" className="font-semibold text-brand-soft hover:underline">{t('auth.login')}</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormAlert>{formError}</FormAlert>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t('auth.firstName')} icon={User} autoComplete="given-name" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
          <Input label={t('auth.lastName')} autoComplete="family-name" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
        </div>
        <Input label={t('auth.email')} type="email" icon={Mail} autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} error={errors.email} />
        <Input label={t('auth.password')} type="password" icon={Lock} autoComplete="new-password" hint={t('auth.passwordHint')} value={form.password} onChange={set('password')} error={errors.password} />
        <PasswordStrength password={form.password} />
        <Input label={t('auth.confirmPassword')} type="password" icon={Lock} autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
        <Button type="submit" loading={loading} className="w-full">{t('auth.createAccount')}</Button>
      </form>
    </AuthLayout>
  );
}
