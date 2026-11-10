export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-semibold">{title}</h1>{subtitle && <p className="mt-1.5 max-w-xl text-muted">{subtitle}</p>}</div>
      {action}
    </div>
  );
}
