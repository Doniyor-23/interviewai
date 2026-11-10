import { Loader2 } from 'lucide-react';
export default function Spinner({ size = 22, className = '' }) {
  return <Loader2 size={size} className={`animate-spin text-brand-soft ${className}`} aria-label="Loading" />;
}
export const PageLoader = () => <div className="grid min-h-[60vh] place-items-center"><Spinner size={32} /></div>;
export const FullPageLoader = () => <div className="grid min-h-screen place-items-center bg-ink-900"><Spinner size={34} /></div>;
