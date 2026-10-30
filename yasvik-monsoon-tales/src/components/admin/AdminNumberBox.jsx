/**
 * Plain numeric entry for admin stock/qty — no spinner / step buttons.
 * Allows empty while typing; callers parse Number on save.
 */
export default function AdminNumberBox({
  value,
  onChange,
  className = '',
  allowDecimal = true,
  ...rest
}) {
  const handleChange = (event) => {
    const raw = event.target.value;
    if (raw === '') {
      onChange('');
      return;
    }
    const pattern = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/;
    if (pattern.test(raw)) onChange(raw);
  };

  return (
    <input
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      autoComplete="off"
      value={value ?? ''}
      onChange={handleChange}
      className={`admin-number-box ${className}`.trim()}
      {...rest}
    />
  );
}
