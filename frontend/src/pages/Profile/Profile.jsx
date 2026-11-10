import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Input from '../../components/forms/Input';
import Button from '../../components/common/Button';
import { FormAlert } from '../../components/common/ErrorNotice';
import { Avatar } from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/userService';
import { clean, required } from '../../utils/validators';
import { formatDate } from '../../utils/format';

/** Downscale to a 256px square JPEG so it stays well under the 300 KB server limit. */
function resizeImage(file, size = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      canvas.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not a valid image.')); };
    img.src = url;
  });
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);
  const [form, setForm] = useState({ firstName: user.firstName, lastName: user.lastName });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const dirty = form.firstName !== user.firstName || form.lastName !== user.lastName;

  const save = async (e) => {
    e.preventDefault();
    const errs = clean({ firstName: required(form.firstName, 'First name'), lastName: required(form.lastName, 'Last name') });
    setErrors(errs); setFormError('');
    if (Object.keys(errs).length) return;
    setSaving(true);
    try { const r = await userService.updateProfile(form); setUser(r.user); toast.success(r.message); } catch (err) { setFormError(err.message); setErrors(err.errors || {}); } finally { setSaving(false); }
  };

  const setImage = async (image) => {
    setImgBusy(true);
    try { const r = await userService.updateProfile({ profileImage: image }); setUser(r.user); toast.success(image ? 'Profile photo updated.' : 'Profile photo removed.'); } catch (err) { toast.error(err.message); } finally { setImgBusy(false); }
  };
  const pick = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file.');
    try { await setImage(await resizeImage(file)); } catch (err) { toast.error(err.message); }
  };

  return (
    <>
      <PageHeader title="Profile" subtitle="Your personal details." />
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <section className="surface flex flex-col items-center p-6 text-center">
          <Avatar user={user} size={112} />
          <h2 className="mt-4 text-lg font-semibold">{user.firstName} {user.lastName}</h2>
          <p className="text-sm text-muted">Member since {formatDate(user.createdAt)}</p>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={pick} aria-label="Upload profile photo" />
          <div className="mt-5 flex gap-2">
            <Button variant="secondary" size="sm" icon={Camera} loading={imgBusy} onClick={() => fileRef.current?.click()}>Change photo</Button>
            {user.profileImage && <Button variant="ghost" size="sm" icon={Trash2} disabled={imgBusy} onClick={() => setImage('')}>Remove</Button>}
          </div>
        </section>
        <form onSubmit={save} className="surface space-y-4 p-6" noValidate>
          <FormAlert>{formError}</FormAlert>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} error={errors.firstName} />
            <Input label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} error={errors.lastName} />
          </div>
          <Input label="Email" value={user.email} disabled hint="Your email is your login and can't be changed here." readOnly />
          <Input label="Registered" value={formatDate(user.createdAt)} disabled readOnly />
          <Button type="submit" loading={saving} disabled={!dirty}>Save changes</Button>
        </form>
      </div>
    </>
  );
}
