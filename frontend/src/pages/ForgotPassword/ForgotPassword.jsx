import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MailCheck } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import Input from '../../components/forms/Input';
import Button from '../../components/common/Button';
import { FormAlert } from '../../components/common/ErrorNotice';
import { authService } from '../../services/authService';
import { isEmail } from '../../utils/validators';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!isEmail(email)) return setError('Enter a valid email address.');
    setLoading(true); setError('');
    try { await authService.forgotPassword(email.trim()); setSent(true); } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <AuthLayout title="Forgot your password?" subtitle="We'll email you a link to choose a new one." footer={<Link to="/login" className="font-semibold text-brand-soft hover:underline">Back to log in</Link>}>
      {sent ? (
        <div className="surface flex flex-col items-center gap-3 p-8 text-center">
          <MailCheck className="text-emerald-300" size={32} />
          <p className="font-semibold">Check your inbox</p>
          <p className="text-sm text-muted">If an account exists for <span className="text-fg">{email}</span>, a reset link is on its way. It expires in 30 minutes.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormAlert>{error}</FormAlert>
          <Input label="Email" type="email" icon={Mail} autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" loading={loading} className="w-full">Send reset link</Button>
        </form>
      )}
    </AuthLayout>
  );
}
