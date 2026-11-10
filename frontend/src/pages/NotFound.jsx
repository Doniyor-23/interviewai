import Button from '../components/common/Button';
export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="font-display text-7xl font-semibold text-brand-soft">404</p>
        <h1 className="mt-3 text-2xl font-semibold">This page doesn't exist</h1>
        <p className="mt-2 text-muted">The link may be broken or the page may have moved.</p>
        <Button to="/" className="mt-6">Back to home</Button>
      </div>
    </div>
  );
}
