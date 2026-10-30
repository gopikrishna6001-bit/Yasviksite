export default function RetailBadge({ children, className = '' }) {
  return (
    <span className={`inline-block rounded bg-neon-paddy/15 px-2 py-0.5 font-inter text-[9px] font-bold uppercase tracking-wider text-neon-paddy ${className}`}>
      {children}
    </span>
  );
}
