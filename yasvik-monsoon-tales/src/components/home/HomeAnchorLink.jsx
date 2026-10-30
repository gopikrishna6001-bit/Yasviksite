import { Link, useLocation } from 'react-router-dom';

export function scrollToHomeSection(id) {
  if (!id || typeof window === 'undefined') return false;
  const el = document.getElementById(id);
  if (!el) return false;

  const headerPx = Number.parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--yasvik-site-header-h') || '92',
    10,
  ) || 92;
  const y = el.getBoundingClientRect().top + window.scrollY - headerPx - 12;
  window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  return true;
}

export default function HomeAnchorLink({ to, className, children, onClick, ...props }) {
  const { pathname } = useLocation();
  const hashMatch = String(to).match(/^\/#([\w-]+)$/);

  if (hashMatch && pathname === '/') {
    return (
      <a
        href={to}
        className={className}
        onClick={(event) => {
          event.preventDefault();
          scrollToHomeSection(hashMatch[1]);
          onClick?.(event);
        }}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link to={to} className={className} onClick={onClick} {...props}>
      {children}
    </Link>
  );
}
