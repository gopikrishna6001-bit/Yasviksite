import { retailClasses } from '@/brand/retailTheme';

/**
 * Customer-selectable combo options — updates presentation via parent state.
 */
export default function ComboOptionSelector({
  bundle,
  selectedChoiceId,
  onSelect,
  className = '',
}) {
  const groups = bundle?.option_groups || [];
  if (!groups.length) return null;

  const group = groups[0];
  const choices = (group.choices || []).filter((row) => row.is_active !== false);
  if (choices.length < 2) return null;

  return (
    <section className={className} aria-labelledby="combo-option-heading">
      <p id="combo-option-heading" className={retailClasses.label}>
        {group.label || 'Choose your combo'}
      </p>
      <div
        className="mt-3 grid gap-2 sm:grid-cols-2"
        role="radiogroup"
        aria-label={group.label || 'Combo options'}
      >
        {choices.map((choice) => {
          const selected = choice.id === selectedChoiceId;
          return (
            <button
              key={choice.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect?.(choice)}
              className={`rounded-2xl border px-4 py-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-canopy/40 ${
                selected
                  ? 'border-forest-canopy bg-forest-canopy/5 shadow-sm'
                  : 'border-soft-border bg-white hover:border-forest-canopy/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    selected ? 'border-forest-canopy' : 'border-deep-forest/25'
                  }`}
                  aria-hidden
                >
                  {selected ? <span className="h-2 w-2 rounded-full bg-forest-canopy" /> : null}
                </span>
                <div className="min-w-0">
                  <p className="font-inter text-sm font-semibold text-deep-forest">
                    {choice.label}
                  </p>
                  {choice.description ? (
                    <p className="mt-1 font-inter text-xs leading-relaxed text-deep-forest/65">
                      {choice.description}
                    </p>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
