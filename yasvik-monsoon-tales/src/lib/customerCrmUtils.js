/** Shared CRM display helpers (tags, filters). Server truth lives in refresh_customer_crm(). */

export const AUTO_TAG_LABELS = {
  rice_buyer: 'Rice Buyer',
  honey_buyer: 'Honey Buyer',
  pickle_buyer: 'Pickle Buyer',
  dry_fruit_buyer: 'Dry Fruit Buyer',
  organic_buyer: 'Organic Buyer',
  millet_buyer: 'Millet Buyer',
  high_value: 'High Value Customer',
  repeat: 'Repeat Customer',
  inactive_30: 'Inactive 30d',
  inactive_60: 'Inactive 60d',
  inactive_90: 'Inactive 90d',
};

export const CUSTOMER_FILTERS = [
  { id: 'new', label: 'New Customers' },
  { id: 'repeat', label: 'Repeat Customers' },
  { id: 'one_time', label: 'One-time Customers' },
  { id: 'high_value', label: 'High Value' },
  { id: 'inactive_30', label: 'Inactive 30 days' },
  { id: 'inactive_60', label: 'Inactive 60 days' },
  { id: 'inactive_90', label: 'Inactive 90 days' },
  { id: 'channel_web', label: 'Website Customers' },
  { id: 'channel_pos', label: 'Store Customers' },
  { id: 'channel_whatsapp', label: 'WhatsApp Customers' },
  { id: 'tag_rice_buyer', label: 'Rice Buyer' },
  { id: 'tag_honey_buyer', label: 'Honey Buyer' },
  { id: 'tag_pickle_buyer', label: 'Pickle Buyer' },
  { id: 'tag_dry_fruit_buyer', label: 'Dry Fruit Buyer' },
  { id: 'tag_organic_buyer', label: 'Organic Buyer' },
  { id: 'tag_millet_buyer', label: 'Millet Buyer' },
];

export function customerPhoneDigits(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 10) return '';
  return digits.slice(-10);
}

export function formatTagLabel(tag) {
  return AUTO_TAG_LABELS[tag] || String(tag || '').replace(/_/g, ' ');
}

export function formatPaiseInr(paise) {
  return `₹${Math.round(Number(paise || 0) / 100).toLocaleString('en-IN')}`;
}

export function customersToCsv(rows = []) {
  const headers = [
    'phone', 'name', 'email', 'order_count', 'lifetime_spend_inr', 'avg_order_inr',
    'preferred_channel', 'preferred_payment', 'first_order', 'last_order',
    'auto_tags', 'manual_tags', 'marketing_consent', 'notes',
  ];
  const escape = (v) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(',')];
  for (const c of rows) {
    lines.push([
      c.phone_digits,
      c.name,
      c.email,
      c.order_count,
      Math.round(Number(c.lifetime_spend_paise || 0) / 100),
      Math.round(Number(c.avg_order_value_paise || 0) / 100),
      c.preferred_channel,
      c.preferred_payment_method,
      c.first_order_at,
      c.last_order_at,
      (c.auto_tags || []).join('|'),
      (c.manual_tags || []).join('|'),
      c.marketing_consent ? 'yes' : 'no',
      c.notes,
    ].map(escape).join(','));
  }
  return lines.join('\n');
}
