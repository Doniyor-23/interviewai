import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import CodeInput from '../../components/forms/CodeInput';
import Input from '../../components/forms/Input';
import Button from '../../components/common/Button';
import { FormAlert } from '../../components/common/ErrorNotice';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useCountdown } from '../../hooks/useCountdown';
import { isEmail } from '../../utils/validators';

const KEY = 'interviewai:pendingEmail';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState(() => location.state?.email || sessionStorage.getItem(KEY) || '');
  const [emailDraft, setEmailDraft] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useCountdown(location.state?.resendAfter || 0);
  const autoSent = useRef(false);

  useEffect(() => { if (email) sessionStorage.setItem(KEY, email); }, [email]);

  const resend = async (silent = false) => {
    setResending(true); setError('');
    try {
      const r = await authService.resendCode(email);
      setCooldown(r.resendAfter || 60);
      setCode('');
      if (!silent) toast.success('A new code is on its way.');
      setInfo('We sent a new 6-digit code to your email.');
    } catch (err) {
      if (err.retryAfter) setCooldown(err.retryAfter);
      setError(err.message);
    } finally { setResending(false); }
  };

  useEffect(() => {
    if (location.state?.sendNew && email && !autoSent.current) { autoSent.current = true; resend(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = async (e) => {
    e?.preventDefault();
    if (code.length !== 6) return setError('Enter the 6-digit code.');
    setLoading(true); setError('');
    try {
      const r = await authService.verifyEmail({ email, code });
      sessionStorage.removeItem(KEY);
      setUser(r.user);
      toast.success(r.message);
      navigate('/dashboard', { replace: true });
    } catch (err) { setError(err.message); setCode(''); } finally { setLoading(false); }
  };

  if (!email) {
    return (
      <AuthLayout title="Verify your email" subtitle="Enter the email you registered with.">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); isEmail(emailDraft) ? setEmail(emailDraft.trim().toLowerCase()) : setError('Enter a valid email address.'); }}>
          <FormAlert>{error}</FormAlert>
          <Input label="Email" type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} />
          <Button type="submit" className="w-full">Continue</Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Check your email" subtitle={<>We sent a 6-digit code to <span className="font-semibold text-fg">{email}</span>. It expires in 10 minutes.</>}
      footer={<>Wrong email? <Link to="/register" className="font-semibold text-brand-soft hover:underline">Start over</Link></>}>
      <form onSubmit={verify} className="space-y-5">
        <div className="grid size-12 place-items-center rounded-xl bg-brand-violet/15 text-brand-soft"><MailCheck /></div>
        <FormAlert>{error}</FormAlert>
        <FormAlert tone="success">{info}</FormAlert>
        <CodeInput value={code} onChange={setCode} disabled={loading} error={!!error} />
        <Button type="submit" loading={loading} disabled={code.length !== 6} className="w-full">Verify email</Button>
        <p className="text-center text-sm text-muted">
          Didn't get it?{' '}
          <button type="button" disabled={cooldown > 0 || resending} onClick={() => resend()} className="font-semibold text-brand-soft hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline">
            {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending…' : 'Resend code'}
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
