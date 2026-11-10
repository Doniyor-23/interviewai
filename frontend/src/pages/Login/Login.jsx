import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import Input from '../../components/forms/Input';
import Button from '../../components/common/Button';
import { FormAlert } from '../../components/common/ErrorNotice';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { clean, isEmail, required } from '../../utils/validators';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = clean({ email: isEmail(form.email) ? '' : 'Enter a valid email address.', password: required(form.password, 'Password') });
    setErrors(errs); setFormError('');
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const { user } = await authService.login(form);
      setUser(user);
      toast.success(`Welcome back, ${user.firstName}!`);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        navigate('/verify-email', { state: { email: err.email || form.email, sendNew: true } });
      } else {
        setErrors(err.errors || {});
        setFormError(err.message);
      }
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to continue practicing." footer={<>New here? <Link to="/register" className="font-semibold text-brand-soft hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormAlert>{formError}</FormAlert>
        <Input label="Email" type="email" icon={Mail} autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} error={errors.email} />
        <Input label="Password" type="password" icon={Lock} autoComplete="current-password" placeholder="Your password" value={form.password} onChange={set('password')} error={errors.password} />
        <div className="text-right"><Link to="/forgot-password" className="text-sm text-muted hover:text-fg">Forgot password?</Link></div>
        <Button type="submit" loading={loading} className="w-full">Log in</Button>
      </form>
    </AuthLayout>
  );
}
