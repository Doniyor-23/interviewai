export default function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between text-sm text-muted">{label}<Icon size={18} className="text-brand-soft" /></div>
      <p className="mt-3 font-display text-4xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
