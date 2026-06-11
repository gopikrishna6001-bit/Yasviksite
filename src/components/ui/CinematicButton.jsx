export default function CinematicButton({ children, variant = 'primary', className = '', onClick, disabled }) {
  const base = 'font-inter text-sm tracking-wide rounded-full transition-all active:scale-95 disabled:opacity-50';

  const variants = {
    primary: 'py-3 px-8 bg-wet-earth text-white hover:bg-wet-earth/90',
    outline: 'py-3 px-8 border border-rain-cloud/20 text-rain-cloud hover:bg-rain-cloud/5',
    ghost: 'py-2 px-5 text-rain-cloud/60 hover:text-rain-cloud',
    forest: 'py-3 px-8 bg-forest-canopy text-white hover:bg-forest-canopy/90',
    glass: 'py-3 px-8 bg-white/15 backdrop-blur-sm text-white border border-white/20 hover:bg-white/25',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}