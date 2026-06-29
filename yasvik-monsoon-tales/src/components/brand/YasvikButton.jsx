import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { trackWhatsAppClick } from '@/lib/analytics';

const VARIANTS = {
  primary: 'yasvik-harvest-cta yasvik-pressable px-6 py-3 text-sm',
  outline: 'yasvik-btn-outline yasvik-pressable px-6 py-3 text-sm',
  whatsapp: 'yasvik-btn-whatsapp yasvik-pressable px-6 py-3 text-sm',
  ghost: 'inline-flex items-center justify-center rounded-full px-4 py-2 font-inter text-sm font-bold text-deep-forest transition-colors hover:bg-deep-forest/6',
};

export default function YasvikButton({
  variant = 'primary',
  to,
  href,
  className = '',
  children,
  ...props
}) {
  const classes = clsx(VARIANTS[variant] || VARIANTS.primary, className);

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  if (href) {
    const handleClick = (event) => {
      if (variant === 'whatsapp' || String(href).includes('wa.me')) {
        trackWhatsAppClick(props['data-analytics-source'] || variant || 'link');
      }
      props.onClick?.(event);
    };
    const { onClick, ...anchorProps } = props;
    return (
      <a href={href} className={classes} onClick={handleClick} {...anchorProps}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
