/**
 * Checkout delivery slot options (Hyderabad / IST).
 */

const SLOT_WINDOWS = [
  { id: 'morning', label: 'Morning (9 AM – 12 PM)' },
  { id: 'afternoon', label: 'Afternoon (12 – 4 PM)' },
  { id: 'evening', label: 'Evening (5 – 8 PM)' },
];

function getISTParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
  return {
    hour: Number(map.hour) || 0,
    weekday: map.weekday,
    month: map.month,
    day: Number(map.day) || 1,
  };
}

function dayLabel(offset, baseDate = new Date()) {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  const future = new Date(baseDate);
  future.setDate(future.getDate() + offset);
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).formatToParts(future);
  const map = Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
  return `${map.weekday}, ${map.day} ${map.month}`;
}

/**
 * @param {object|null} zone delivery zone row
 * @param {Date} [now]
 * @returns {{ value: string, label: string }[]}
 */
export function buildDeliverySlotOptions(zone, now = new Date()) {
  const ist = getISTParts(now);
  const cutoff = Number(zone?.same_day_cutoff_hour) || 14;
  const tier = zone?.zone_tier || 'standard';
  const canSameDay = tier === 'express' && ist.hour < cutoff;
  const dayOffsets = canSameDay ? [0, 1, 2] : [1, 2, 3];
  const options = [];

  for (const offset of dayOffsets) {
    const prefix = dayLabel(offset, now);
    for (const slot of SLOT_WINDOWS) {
      const label = `${prefix} · ${slot.label}`;
      options.push({ value: label, label });
    }
  }

  if (tier === 'express' && zone?.express_eta_label && canSameDay) {
    options.unshift({
      value: `Today · ${zone.express_eta_label}`,
      label: `Today · ${zone.express_eta_label}`,
    });
  }

  return options;
}

export function defaultDeliverySlot(zone, now = new Date()) {
  const options = buildDeliverySlotOptions(zone, now);
  return options[0]?.value || null;
}
