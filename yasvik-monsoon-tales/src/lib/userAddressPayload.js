/** Map profile/checkout address fields → Supabase `addresses` row shape. */
export function buildAddressDbPayload(form = {}, { userEmail = '', userId = '' } = {}) {
  const building = String(form.building_name || '').trim();
  const street = String(form.street || '').trim();
  const area = String(form.area || '').trim();
  const landmark = String(form.landmark || '').trim();
  const label = String(form.label || form.name || 'Home').trim() || 'Home';

  const addressLine1 = [building, street].filter(Boolean).join(', ')
    || street
    || building;

  const addressLine2 = [area, landmark].filter(Boolean).join(' · ') || null;

  const pin = String(form.pin_code || form.pincode || form.postal_code || '').trim();
  const phone = String(form.phone || form.phone_number || '').replace(/\D/g, '').slice(-10);

  return {
    user_id: userId || form.user_id || null,
    user_email: userEmail || form.user_email || '',
    label,
    type: label,
    name: form.name || label,
    building_name: building || null,
    street: street || addressLine1,
    landmark: landmark || null,
    area: area || null,
    city: String(form.city || '').trim(),
    district: form.district || null,
    state: String(form.state || 'Telangana').trim(),
    pin_code: pin,
    postal_code: pin,
    phone,
    phone_number: phone,
    address_line_1: addressLine1,
    address_line_2: addressLine2,
    country: form.country || 'India',
    is_default: Boolean(form.is_default),
  };
}

export function checkoutAddressToProfilePayload(checkoutAddress = {}, user = {}) {
  const street = String(checkoutAddress.street || '').trim();
  return buildAddressDbPayload({
    label: 'Home',
    building_name: '',
    street,
    area: '',
    city: checkoutAddress.city,
    state: checkoutAddress.state || 'Telangana',
    pin_code: checkoutAddress.pincode,
    phone: checkoutAddress.phone,
    name: checkoutAddress.name,
    is_default: true,
  }, { userEmail: user.email, userId: user.id });
}
