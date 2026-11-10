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

export default function ResetPassword() {
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
      <AuthLayout title="Reset link invalid" subtitle="This link is missing information. Request a new one." footer={<Link to="/login" className="font-semibold text-brand-soft hover:underline">Back to log in</Link>}>
        <Button to="/forgot-password" className="w-full">Request a new link</Button>
      </AuthLayout>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    const errs = clean({ password: passwordError(form.password), confirmPassword: form.password === form.confirmPassword ? '' : 'Passwords do not match.' });
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
    <AuthLayout title="Choose a new password" subtitle={<>for <span className="text-fg">{email}</span></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormAlert>{formError}</FormAlert>
        <Input label="New password" type="password" icon={Lock} autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
        <PasswordStrength password={form.password} />
        <Input label="Confirm new password" type="password" icon={Lock} autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
        <Button type="submit" loading={loading} className="w-full">Update password</Button>
      </form>
    </AuthLayout>
  );
}
