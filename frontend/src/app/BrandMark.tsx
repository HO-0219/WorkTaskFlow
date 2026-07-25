export function BrandMark({ className = '' }: { className?: string }) {
  return <svg
    className={className}
    viewBox="0 0 48 48"
    role="img"
    aria-label="Work Task Flow"
  >
    <path d="M13 14h16c5 0 8 3 8 8s-3 8-8 8H19" />
    <path d="m24 25-6 5 6 5" />
    <circle cx="11" cy="14" r="4" />
    <circle cx="37" cy="22" r="4" />
    <circle cx="17" cy="30" r="4" />
  </svg>;
}
