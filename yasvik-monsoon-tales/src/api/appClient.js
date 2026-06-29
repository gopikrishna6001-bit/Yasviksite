import { supabase } from '@/api/supabaseClient';
import { hydrateProductPricingFields } from '@/lib/productPricingMeta';
import { slimProductForList } from '@/lib/productListPayload';
import { prepareUploadFile } from '@/lib/compressUploadImage';
import { buildSeoMediaBaseName, buildSeoMediaFileName } from '@/lib/mediaSeoNaming';
import { normalizeMediaStorageKey } from '@/lib/mediaStorageKey';

const CF_API_BASE = import.meta.env.VITE_CLOUDFLARE_API_BASE_URL || '/api';
const PUBLIC_BUCKET = import.meta.env.VITE_MEDIA_PUBLIC_PREFIX || 'media-assets';
const PRIVATE_BUCKET = import.meta.env.VITE_MEDIA_PRIVATE_PREFIX || 'user-uploads';

const entityTableMap = {
  Product: 'products',
  Journey: 'journeys',
  Story: 'stories',
  Person: 'people',
  Recipe: 'recipes',
  Category: 'categories',
  Region: 'regions',
  Review: 'reviews',
  Order: 'orders',
  UserProfile: 'user_profiles',
  Combo: 'combos',
  Collection: 'collections',
  MediaAsset: 'media_assets',
  HomepageSection: 'homepage_sections',
  AppSettings: 'app_settings',
  PageSettings: 'page_settings',
  PageHero: 'page_heroes',
  Subscription: 'subscriptions',
  UserSubscription: 'user_subscriptions',
  StoryComment: 'story_comments',
  UserAddress: 'addresses',
  LabelPrintJob: 'label_print_jobs',
  LabelItem: 'label_items',
};

const fieldAliases = {
  Product: {
    title: 'name',
    story_description: 'description',
    compare_price: 'discount_price',
    stock: 'stock_quantity',
    hero_image: 'featured_image_url',
  },
  Combo: {
    title: 'name',
    hero_image: 'featured_image_url',
    original_price: 'regular_price',
  },
  Collection: {
    title: 'name',
  },
  Recipe: {
  },
  Journey: {
  },
  Story: {
    body: 'content',
  },
  Person: {
    short_bio: 'bio',
  },
  Category: {
    short_intro: 'description',
  },
  Region: {
    short_description: 'description',
  },
  AppSettings: {
    key: 'setting_key',
    value: 'setting_value',
  },
  PageHero: {
    page_key: 'page_slug',
  },
  HomepageSection: {
    content: 'content_json',
  },
  UserProfile: {
    user_email: 'email',
    full_name: 'display_name',
    phone: 'phone_number',
  },
  UserAddress: {
    pin_code: 'postal_code',
    phone: 'phone_number',
  },
  Order: {
    shipping_address: 'address_snapshot',
  },
  MediaAsset: {
    title: 'name',
    file_url: 'upload_url',
    file_type: 'media_type',
    size_bytes: 'file_size',
    url: 'upload_url',
  },
};

const writeFieldAllowlist = {
  Person: new Set([
    'name',
    'slug',
    'bio',
    'image_url',
    'portrait_image',
    'role',
    'specialties',
    'location_label',
    'short_bio',
    'long_story',
    'quote',
    'is_published',
    'is_featured',
    'sort_order',
  ]),
  Journey: new Set([
    'title',
    'slug',
    'description',
    'featured_image_url',
    'cover_image',
    'location_label',
    'tagline',
    'long_narrative',
    'hero_video',
    'is_published',
    'is_featured',
    'sort_order',
  ]),
  Story: new Set([
    'title',
    'slug',
    'content',
    'body',
    'cover_image',
    'featured_image_url',
    'excerpt',
    'read_time_minutes',
    'journey_id',
    'person_id',
    'is_published',
    'is_featured',
    'sort_order',
    'seo_title',
    'seo_description',
    'seo_keywords',
  ]),
  Category: new Set([
    'name',
    'slug',
    'description',
    'short_intro',
    'icon_url',
    'cover_image',
    'color_hex',
    'color_accent',
    'emotional_title',
    'sort_order',
    'is_active',
  ]),
  Region: new Set([
    'name',
    'code',
    'state',
    'description',
    'short_description',
    'emotional_label',
    'cover_image',
    'sort_order',
  ]),
  Collection: new Set([
    'name',
    'title',
    'slug',
    'description',
    'cover_image',
    'is_active',
    'is_featured',
    'sort_order',
  ]),
  Combo: new Set([
    'name',
    'slug',
    'description',
    'combo_price',
    'regular_price',
    'discount_percentage',
    'featured_image_url',
    'is_published',
    'sort_order',
    'product_ids',
  ]),
  LabelPrintJob: new Set([
    'print_job_no',
    'product_id',
    'variant_id',
    'product_name_en',
    'product_name_te',
    'weight',
    'mrp',
    'selling_price',
    'packed_date',
    'batch_no',
    'quantity',
    'generated_by',
    'status',
  ]),
  LabelItem: new Set([
    'print_job_id',
    'product_id',
    'variant_id',
    'batch_no',
    'serial_no',
    'barcode_value',
    'printed_at',
    'sold_at',
    'inventory_deducted_at',
    'status',
  ]),
  HomepageSection: new Set([
    'title',
    'description',
    'subtitle',
    'body_text',
    'section_type',
    'sort_order',
    'is_active',
    'content_json',
    'content',
    'cta_label',
    'cta_url',
    'media_url',
    'media_type',
    'background_style',
  ]),
  PageHero: new Set([
    'page_slug',
    'page_key',
    'label',
    'title',
    'subtitle',
    'image_url',
    'media_url',
    'media_type',
    'hero_mode',
    'hero_video',
    'hero_video_poster',
    'slide_urls',
    'slideshow_interval_ms',
    'background_style',
    'cta_text',
    'cta_link',
    'cta_label',
    'cta_url',
    'is_active',
    'sort_order',
  ]),
  Recipe: new Set([
    'title',
    'slug',
    'description',
    'external_recipe_id',
    'recipe_category',
    'linked_product_slugs',
    'linked_product_titles',
    'ingredients',
    'instructions',
    'prep_time_minutes',
    'cook_time_minutes',
    'servings',
    'difficulty_level',
    'person_id',
    'featured_image_url',
    'hero_image',
    'is_published',
    'is_featured',
    'sort_order',
  ]),
  Product: new Set([
    'product_code',
    'name',
    'slug',
    'description',
    'short_description',
    'local_name',
    'sku',
    'category_id',
    'journey_id',
    'person_id',
    'region_id',
    'processing_method',
    'best_for',
    'storage_note',
    'yasvik_mark',
    'delivery_card',
    'pack_info_card',
    'sourcing_card',
    'recipe_ids',
    'recipe_titles',
    'recipe_links',
    'inventory_group',
    'stock_measure_type',
    'shared_stock_kg',
    'price',
    'currency',
    'discount_price',
    'harvest_date',
    'batch_tested_at',
    'hover_media',
    'quick_variants',
    'purity_badges',
    'is_published',
    'is_featured',
    'featured_in_hero',
    'hero_video',
    'sort_order',
    'product_group',
    'group_sort_order',
    'stock_quantity',
    'featured_image_url',
    'seo_title',
    'seo_description',
    'seo_keywords',
  ]),
  AppSettings: new Set([
    'setting_key',
    'setting_value',
    'key',
    'value',
    'label',
    'description',
    'data_type',
  ]),
  UserAddress: new Set([
    'user_id',
    'user_email',
    'label',
    'type',
    'name',
    'building_name',
    'street',
    'landmark',
    'area',
    'city',
    'district',
    'state',
    'pin_code',
    'postal_code',
    'phone',
    'phone_number',
    'address_line_1',
    'address_line_2',
    'country',
    'is_default',
  ]),
  UserProfile: new Set([
    'display_name',
    'full_name',
    'avatar_url',
    'phone',
    'phone_number',
  ]),
  Order: new Set([
    'status',
    'payment_status',
    'payment_method',
    'amount_paise',
    'subtotal_paise',
    'delivery_fee_paise',
    'receipt_id',
    'razorpay_order_id',
    'razorpay_payment_id',
    'items_snapshot',
    'timeline',
    'customer_name',
    'customer_email',
    'customer_phone',
    'address_snapshot',
    'delivery_instructions',
    'delivery_slot',
    'eta_label',
    'admin_notes',
    'tracking_id',
    'carrier',
    'rider_name',
    'rider_phone',
    'order_channel',
    'total_amount',
    'subtotal',
    'shipping_cost',
    'notes',
  ]),
};

const productWriteStripKeys = new Set([
  'compare_price_per_kg',
  'selling_price_per_kg',
  'price_inflate_percent',
  'small_pack_margin_rs',
  'variants',
  'images',
  'stock',
  'low_stock_threshold',
  'weight_grams',
]);

function mapToDb(name, payload = {}) {
  const aliases = fieldAliases[name] || {};
  const effective = { ...(payload || {}) };

  if (name === 'Product') {
    if (effective.stock !== undefined && effective.stock_quantity === undefined) {
      effective.stock_quantity = effective.stock;
    }
    productWriteStripKeys.forEach((key) => delete effective[key]);
  }

  if (name === 'UserAddress') {
    const building = String(effective.building_name || '').trim();
    const street = String(effective.street || '').trim();
    const area = String(effective.area || '').trim();
    const landmark = String(effective.landmark || '').trim();
    const line1 = [building, street].filter(Boolean).join(', ') || street || building;
    if (line1) effective.address_line_1 = line1;
    const line2 = [area, landmark].filter(Boolean).join(' · ');
    if (line2) effective.address_line_2 = line2;
    if (effective.pin_code) effective.postal_code = effective.pin_code;
    if (effective.phone) effective.phone_number = effective.phone;
    if (effective.label) effective.type = effective.type || effective.label;
    if (!effective.name && effective.label) effective.name = effective.label;
    if (!effective.country) effective.country = 'India';
  }

  // App-layer fields (e.g. title) map onto DB columns (e.g. name). When both
  // are present after spreading a hydrated record, the stale DB key must not
  // overwrite the editor value.
  Object.entries(aliases).forEach(([appKey, dbKey]) => {
    if (effective[appKey] !== undefined) {
      delete effective[dbKey];
    }
  });

  const out = {};
  const blockedKeys = new Set([
    'id',
    'created_date',
    'updated_date',
    'modified_date',
    'created_at',
    'updated_at',
  ]);
  Object.entries(effective).forEach(([key, value]) => {
    if (value === undefined) return;
    if (blockedKeys.has(key)) return;
    const mappedKey = aliases[key] || key;
    if (blockedKeys.has(mappedKey)) return;
    const allow = writeFieldAllowlist[name];
    if (allow && !allow.has(mappedKey)) return;
    out[mappedKey] = value;
  });
  return out;
}

function mapFromDb(name, payload = {}) {
  const aliases = fieldAliases[name] || {};
  const reverse = Object.fromEntries(Object.entries(aliases).map(([legacy, db]) => [db, legacy]));
  const out = {};
  Object.entries(payload || {}).forEach(([key, value]) => {
    out[reverse[key] || key] = value;
  });
  if (name === 'AppSettings') {
    // Prefer canonical settings columns when both legacy and canonical fields exist.
    const sourceKey = payload?.setting_key ?? payload?.key;
    const sourceValue = payload?.setting_value ?? payload?.value;
    if (out.key === undefined || out.key === null || out.key === '') out.key = sourceKey;
    if (out.value === undefined || out.value === null || out.value === '') out.value = sourceValue;
    out.setting_key = sourceKey;
    out.setting_value = sourceValue;
    out.label = out.label || out.key || '';
  }
  if (name === 'MediaAsset') {
    const resolvedUrl = out.file_url || out.upload_url || out.url || null;
    out.file_url = resolvedUrl;
    out.upload_url = resolvedUrl;
    out.url = resolvedUrl;
    out.title = out.title || out.name || '';
    out.file_type = out.file_type || out.media_type || 'image';
    out.media_type = out.file_type;
    out.size_bytes = out.size_bytes ?? out.file_size ?? null;
    out.folder = out.entity_type || 'general';
  }
  if (name === 'Product') {
    out.title = out.title || out.name || '';
    out.name = out.name || out.title || '';
    out.story_description = out.story_description || out.description || '';
    out.description = out.description || out.story_description || '';
    out.stock = out.stock ?? out.stock_quantity ?? 0;
    out.stock_quantity = out.stock_quantity ?? out.stock ?? 0;
    out.hero_image = out.hero_image || out.featured_image_url || '';
    out.featured_image_url = out.featured_image_url || out.hero_image || '';
    out.compare_price = out.compare_price ?? out.discount_price ?? null;
    out.discount_price = out.discount_price ?? out.compare_price ?? null;
    out.hover_media = out.hover_media ?? [];
    out.quick_variants = out.quick_variants ?? out.variants ?? [];
    const pricingFields = hydrateProductPricingFields(out);
    out.selling_price_per_kg = pricingFields.selling_price_per_kg;
    out.price_inflate_percent = pricingFields.price_inflate_percent;
    out.small_pack_margin_rs = pricingFields.small_pack_margin_rs;
    out.purity_badges = out.purity_badges ?? out.certifications ?? [];
    out.recipe_links = out.recipe_links ?? [];
  }
  if (name === 'Journey') {
    out.cover_image = out.cover_image || out.featured_image_url || '';
    out.featured_image_url = out.featured_image_url || out.cover_image || '';
    out.tagline = out.tagline || out.title || '';
  }
  if (name === 'Story') {
    out.cover_image = out.cover_image || out.featured_image_url || '';
    out.featured_image_url = out.featured_image_url || out.cover_image || '';
    out.body = out.body || out.content || '';
    out.content = out.content || out.body || '';
    out.excerpt = out.excerpt || out.short_description || '';
  }
  if (name === 'Person') {
    out.portrait_image = out.portrait_image || out.image_url || '';
    out.image_url = out.image_url || out.portrait_image || '';
    out.short_bio = out.short_bio || out.bio || '';
    out.bio = out.bio || out.short_bio || '';
  }
  if (name === 'Recipe') {
    out.hero_image = out.hero_image || out.featured_image_url || '';
    out.featured_image_url = out.featured_image_url || out.hero_image || '';
    out.ingredients = parseJsonList(out.ingredients);
    out.linked_product_slugs = parseJsonList(out.linked_product_slugs);
    out.linked_product_titles = parseJsonList(out.linked_product_titles);
  }
  if (name === 'Category') {
    out.cover_image = out.cover_image || '';
    out.icon_url = out.icon_url || '';
    out.short_intro = out.short_intro || out.description || '';
  }
  if (name === 'Collection') {
    out.title = out.title || out.name || '';
    out.name = out.name || out.title || '';
  }
  if (name === 'Combo') {
    out.title = out.title || out.name || '';
    out.name = out.name || out.title || '';
    out.hero_image = out.hero_image || out.featured_image_url || '';
    out.featured_image_url = out.featured_image_url || out.hero_image || '';
    out.original_price = out.original_price ?? out.regular_price ?? null;
    out.regular_price = out.regular_price ?? out.original_price ?? null;
    out.product_ids = parseJsonList(out.product_ids);
  }
  if (name === 'Region') {
    out.short_description = out.short_description || out.description || '';
  }
  if (name === 'UserAddress') {
    out.pin_code = out.pin_code || out.postal_code || '';
    out.postal_code = out.postal_code || out.pin_code || '';
    out.phone = out.phone || out.phone_number || '';
    out.phone_number = out.phone_number || out.phone || '';
    out.label = out.label || out.type || '';
    if (!out.street && out.address_line_1) out.street = out.address_line_1;
    if (!out.building_name && out.name && out.name !== out.label) out.building_name = out.name;
    if (!out.area && out.address_line_2) out.area = out.address_line_2;
  }
  if (name === 'Order') {
    out.shipping_address = out.shipping_address || out.address_snapshot || null;
    if (!out.shipping_address && typeof payload?.shipping_address === 'string' && payload.shipping_address) {
      out.shipping_address = { street: payload.shipping_address };
    }
    out.amount_paise = out.amount_paise ?? (payload?.total_amount != null ? Math.round(Number(payload.total_amount) * 100) : 0);
    out.items_snapshot = Array.isArray(out.items_snapshot) ? out.items_snapshot : [];
    out.timeline = Array.isArray(out.timeline) ? out.timeline : [];
    out.receipt_id = out.receipt_id || out.order_number || null;
  }
  return out;
}

const normalizeRow = (row) => {
  if (!row || typeof row !== 'object') return row;
  const normalized = {
    ...row,
    created_date: row.created_date ?? row.created_at ?? null,
    updated_date: row.updated_date ?? row.updated_at ?? null,
    modified_date: row.modified_date ?? row.updated_at ?? null,
  };
  return normalized;
};

const normalizeRows = (rows = []) => rows.map(normalizeRow);

function parseJsonList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function applyFilters(query, filters = {}) {
  let q = query;
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value === null) q = q.is(key, null);
    else if (Array.isArray(value)) q = q.in(key, value);
    else q = q.eq(key, value);
  });
  return q;
}

function applySort(query, sort = '-created_date') {
  if (!sort) return query;
  const desc = sort.startsWith('-');
  const requestedField = desc ? sort.slice(1) : sort;
  const fieldMap = {
    created_date: 'created_at',
    updated_date: 'updated_at',
    modified_date: 'updated_at',
  };
  const field = fieldMap[requestedField] || requestedField;
  return query.order(field, { ascending: !desc, nullsFirst: false });
}

function normalizeSortForEntity(name, sort) {
  const requested = sort || (name === 'AppSettings' ? '-updated_date' : '-created_date');
  if (name !== 'AppSettings') return requested;
  if (requested === 'created_date') return 'updated_date';
  if (requested === '-created_date') return '-updated_date';
  if (requested === 'modified_date') return 'updated_date';
  if (requested === '-modified_date') return '-updated_date';
  return requested;
}

function applyLimit(query, limit) {
  if (!limit || Number.isNaN(Number(limit))) return query;
  return query.limit(Number(limit));
}

async function attachProductImages(rows = [], { primaryOnly = false } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const productIds = rows.map((r) => r.id).filter(Boolean);
  if (productIds.length === 0) return rows;

  const { data: imageRows, error } = await supabase
    .from('product_images')
    .select('product_id,image_url,sort_order,is_primary')
    .in('product_id', productIds)
    .order('sort_order', { ascending: true, nullsFirst: false });
  if (error) return rows;

  const byProductId = new Map();
  (imageRows || []).forEach((img) => {
    const arr = byProductId.get(img.product_id) || [];
    arr.push({
      url: img.image_url,
      is_primary: !!img.is_primary,
      sort_order: img.sort_order ?? 0,
    });
    byProductId.set(img.product_id, arr);
  });

  return rows.map((row) => {
    const imageRowsForProduct = byProductId.get(row.id) || [];
    const primaryImage =
      imageRowsForProduct.find((i) => i.is_primary)?.url ||
      imageRowsForProduct[0]?.url ||
      '';
    const hero_image = primaryImage || row.hero_image || row.featured_image_url || '';

    const hydrated = {
      ...row,
      hero_image,
      featured_image_url: hero_image || row.featured_image_url || '',
      images: primaryOnly
        ? (hero_image ? [hero_image] : [])
        : imageRowsForProduct.map((i) => i.url).filter(Boolean),
    };

    return primaryOnly ? slimProductForList(hydrated) : hydrated;
  });
}

async function syncComboItems(comboId, productIds = []) {
  if (!comboId) return;
  const ids = (Array.isArray(productIds) ? productIds : []).map((id) => String(id || '').trim()).filter(Boolean);
  const { error: deleteError } = await supabase.from('combo_items').delete().eq('combo_id', comboId);
  if (deleteError) throw deleteError;
  if (ids.length === 0) return;

  const rows = ids.map((productId, index) => ({
    combo_id: comboId,
    product_id: productId,
    quantity: 1,
    sort_order: index,
  }));
  const { error } = await supabase.from('combo_items').insert(rows);
  if (error) throw error;
}

async function attachComboProductIds(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const comboIds = rows.map((row) => row.id).filter(Boolean);
  if (comboIds.length === 0) return rows;

  const { data, error } = await supabase
    .from('combo_items')
    .select('combo_id,product_id,quantity,sort_order')
    .in('combo_id', comboIds)
    .order('sort_order', { ascending: true });
  if (error) return rows;

  const byComboId = new Map();
  (data || []).forEach((item) => {
    const list = byComboId.get(item.combo_id) || [];
    const qty = Math.max(1, Number(item.quantity) || 1);
    for (let i = 0; i < qty; i += 1) list.push(item.product_id);
    byComboId.set(item.combo_id, list);
  });

  return rows.map((row) => {
    const fromItems = byComboId.get(row.id) || [];
    const fromColumn = parseJsonList(row.product_ids);
    return {
      ...row,
      product_ids: fromColumn.length ? fromColumn : fromItems,
    };
  });
}

function prepareComboWritePayload(name, payload = {}) {
  const mappedPayload = mapToDb(name, payload);
  delete mappedPayload.product_ids;
  if (!mappedPayload.slug && mappedPayload.name) {
    mappedPayload.slug = String(mappedPayload.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || `combo-${Date.now().toString(36)}`;
  }
  return mappedPayload;
}

async function syncProductImages(productId, images = [], heroImage = '') {
  if (!productId) return;
  if (!Array.isArray(images)) return;

  const hero = String(heroImage || '').trim();
  const gallery = [...new Set(images.map((u) => String(u || '').trim()).filter(Boolean))];
  const withoutHero = gallery.filter((url) => url !== hero);
  const desiredImages = hero ? [hero, ...withoutHero] : gallery;

  const { error: deleteError } = await supabase.from('product_images').delete().eq('product_id', productId);
  if (deleteError) throw deleteError;
  if (desiredImages.length === 0) return;

  const rows = desiredImages.map((url, index) => ({
    product_id: productId,
    image_url: url,
    sort_order: index,
    is_primary: index === 0,
  }));
  const { error: insertError } = await supabase.from('product_images').insert(rows);
  if (insertError) throw insertError;
}

function makeEntity(name) {
  const table = entityTableMap[name];
  if (!table) {
    throw new Error(`No Supabase table mapping found for entity: ${name}`);
  }

  return {
    async list(sort = '-created_date', limit = 20) {
      let query = supabase.from(table).select('*');
      sort = normalizeSortForEntity(name, sort);
      if (sort) {
        const desc = sort.startsWith('-');
        const s = desc ? sort.slice(1) : sort;
        const mappedSort = (fieldAliases[name] || {})[s] || s;
        sort = desc ? `-${mappedSort}` : mappedSort;
      }
      query = applySort(query, sort);
      query = applyLimit(query, limit);
      const { data, error } = await query;
      if (error) throw error;
      const mappedRows = normalizeRows(data).map((row) => mapFromDb(name, row));
      if (name === 'Product') return attachProductImages(mappedRows, { primaryOnly: true });
      if (name === 'Combo') return attachComboProductIds(mappedRows);
      return mappedRows;
    },
    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) throw error;
      const mapped = mapFromDb(name, normalizeRow(data));
      if (name === 'Product') {
        const [hydrated] = await attachProductImages([mapped]);
        return hydrated || mapped;
      }
      if (name === 'Combo') {
        const [hydrated] = await attachComboProductIds([mapped]);
        return hydrated || mapped;
      }
      return mapped;
    },
    async filter(filters = {}, sort = '-created_date', limit = 20) {
      let query = supabase.from(table).select('*');
      const mappedFilters = mapToDb(name, filters);
      sort = normalizeSortForEntity(name, sort);
      if (sort) {
        const desc = sort.startsWith('-');
        const s = desc ? sort.slice(1) : sort;
        const mappedSort = (fieldAliases[name] || {})[s] || s;
        sort = desc ? `-${mappedSort}` : mappedSort;
      }
      query = applyFilters(query, mappedFilters);
      query = applySort(query, sort);
      query = applyLimit(query, limit);
      const { data, error } = await query;
      if (error) throw error;
      const mappedRows = normalizeRows(data).map((row) => mapFromDb(name, row));
      if (name === 'Product') return attachProductImages(mappedRows, { primaryOnly: true });
      if (name === 'Combo') return attachComboProductIds(mappedRows);
      return mappedRows;
    },
    async create(payload) {
      const productIds = name === 'Combo' ? parseJsonList(payload?.product_ids) : [];
      const mappedPayload = name === 'Combo' ? prepareComboWritePayload(name, payload) : mapToDb(name, payload);
      const { data, error } = await supabase.from(table).insert(mappedPayload).select('*').single();
      if (error) throw error;
      const mapped = mapFromDb(name, normalizeRow(data));
      if (name === 'Product') {
        await syncProductImages(mapped.id, payload?.images || [], payload?.hero_image || mapped.hero_image || '');
        const [hydrated] = await attachProductImages([mapped]);
        return hydrated || mapped;
      }
      if (name === 'Combo') {
        await syncComboItems(mapped.id, productIds);
        const [hydrated] = await attachComboProductIds([{ ...mapped, product_ids: productIds }]);
        return hydrated || mapped;
      }
      return mapped;
    },
    async update(id, payload) {
      const productIds = name === 'Combo' ? parseJsonList(payload?.product_ids) : [];
      const mappedPayload = name === 'Combo' ? prepareComboWritePayload(name, payload) : mapToDb(name, payload);
      const { data, error } = await supabase.from(table).update(mappedPayload).eq('id', id).select('*').single();
      if (error) throw error;
      const mapped = mapFromDb(name, normalizeRow(data));
      if (name === 'Product') {
        await syncProductImages(id, payload?.images || [], payload?.hero_image || mapped.hero_image || '');
        const [hydrated] = await attachProductImages([mapped]);
        return hydrated || mapped;
      }
      if (name === 'Combo') {
        await syncComboItems(id, productIds);
        const [hydrated] = await attachComboProductIds([{ ...mapped, product_ids: productIds }]);
        return hydrated || mapped;
      }
      return mapped;
    },
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },
  };
}

async function invokeCloudflare(name, payload = {}) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  const res = await fetch(`${CF_API_BASE}/functions/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Function ${name} failed`);
  return { data };
}

async function uploadToBucket(bucket, file, isPrivate = false, meta = {}) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error('Sign in required to upload files');

  const prepared = await prepareUploadFile(file);
  const folder = String(meta.folder || meta.entityType || 'general').trim().toLowerCase();
  const seoName = String(meta.seoName || meta.entitySlug || meta.label || '').trim();
  const assetRole = String(meta.assetRole || meta.asset_role || '').trim();
  const seoBase = buildSeoMediaBaseName({
    seoName,
    assetRole,
    folder,
    entityTitle: meta.entityTitle || '',
    fallbackName: file?.name || prepared?.name || '',
  });
  const uploadExt = (prepared?.name || file?.name || '').includes('.')
    ? (prepared?.name || file?.name || '').split('.').pop()
    : 'webp';

  const form = new FormData();
  form.append('file', prepared);
  form.append('bucket', bucket);
  form.append('folder', folder);
  if (seoName) form.append('seo_name', seoName);
  if (assetRole) form.append('asset_role', assetRole);
  if (isPrivate) form.append('private', '1');

  const res = await fetch(`${CF_API_BASE}/media/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Upload failed');

  if (isPrivate) {
    return { file_uri: data.file_uri };
  }

  const fileUrl = data.file_url;

  try {
    const { data: existing } = await supabase
      .from('media_assets')
      .select('id, upload_url, file_path')
      .eq('file_path', data.file_path)
      .maybeSingle();

    if (existing?.upload_url) {
      return {
        file_url: existing.upload_url,
        file_path: existing.file_path,
        folder: data.folder || folder,
        reused: true,
      };
    }

    await supabase.from('media_assets').insert({
      name: meta.label || `${seoBase}.${uploadExt}` || file?.name || data.original_name || data.file_path,
      slug: seoBase,
      file_path: data.file_path,
      file_size: data.file_size ?? prepared?.size ?? file?.size ?? null,
      mime_type: data.mime_type ?? prepared?.type ?? file?.type ?? null,
      media_type: (file?.type || '').startsWith('video/') ? 'video' : 'image',
      entity_type: data.folder || folder,
      entity_id: meta.entityId || null,
      upload_url: fileUrl,
      is_active: true,
    });
  } catch {
    // Non-blocking: upload succeeded even if indexing row fails.
  }

  return { file_url: fileUrl, file_path: data.file_path, folder: data.folder || folder };
}

async function deleteFromBucket(filePathOrUrl) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error('Sign in required to delete files');

  const file_path = normalizeMediaStorageKey(filePathOrUrl);
  if (!file_path) throw new Error('Missing file path');

  const res = await fetch(`${CF_API_BASE}/media/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ file_path }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Delete failed');
  return data;
}

export const appClient = {
  auth: {
    async me() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) throw error || new Error('Not authenticated');
      const baseUser = {
        id: data.user.id,
        email: data.user.email,
        ...data.user.user_metadata,
      };

      // Pull role/profile from DB (legacy UI depends on role/user profile fields).
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile) {
        const mapped = mapFromDb('UserProfile', normalizeRow(profile));
        const avatar_url = mapped.avatar_url || data.user.user_metadata?.avatar_url || null;
        return {
          ...baseUser,
          ...mapped,
          avatar_url,
        };
      }

      // Best-effort bootstrap for old projects where profile row may be missing.
      const fallbackProfile = {
        id: data.user.id,
        email: data.user.email,
        display_name:
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          (data.user.email || '').split('@')[0],
        role: 'customer',
        is_active: true,
      };
      const { data: created } = await supabase
        .from('user_profiles')
        .upsert(fallbackProfile)
        .select('*')
        .maybeSingle();

      return {
        ...baseUser,
        ...(created ? mapFromDb('UserProfile', normalizeRow(created)) : {}),
      };
    },
    async loginViaEmailPassword(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    async loginWithProvider(provider, redirectPath = '/') {
      const path = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;
      const redirectTo = `${window.location.origin}${path}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
    },
    async register({ email, password }) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    },
    async verifyOtp({ email, otpCode }) {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'email' });
      if (error) throw error;
      return { access_token: data.session?.access_token };
    },
    async resendOtp(email) {
      const { data, error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      return data;
    },
    async setToken(accessToken) {
      if (!accessToken) return;
      localStorage.setItem('supabase_access_token', accessToken);
    },
    async resetPasswordRequest(email) {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return data;
    },
    async resetPassword({ resetToken, newPassword }) {
      if (resetToken) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token: resetToken,
          type: 'recovery',
        });
        if (verifyError) throw verifyError;
      }
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return data;
    },
    async updateMe(payload) {
      const { data, error } = await supabase.auth.updateUser({ data: payload });
      if (error) throw error;

      const userId = data.user?.id;
      if (userId && payload && Object.keys(payload).length > 0) {
        const dbPayload = mapToDb('UserProfile', payload);
        if (Object.keys(dbPayload).length > 0) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({ id: userId, email: data.user.email, ...dbPayload });
          if (profileError) throw profileError;
        }
      }

      return data.user;
    },
    async logout(redirectUrl) {
      await supabase.auth.signOut();
      if (redirectUrl) window.location.href = redirectUrl;
    },
    redirectToLogin(nextUrl = '/') {
      const encoded = encodeURIComponent(nextUrl);
      window.location.href = `/login?next=${encoded}`;
    },
  },
  entities: new Proxy(
    {},
    {
      get(_target, entityName) {
        return makeEntity(entityName);
      },
    }
  ),
  functions: {
    invoke: invokeCloudflare,
  },
  integrations: {
    Core: {
      UploadFile: (arg) => uploadToBucket(PUBLIC_BUCKET, arg.file, false, arg),
      UploadPrivateFile: (arg) => uploadToBucket(PRIVATE_BUCKET, arg.file, true),
      DeleteFile: ({ file_path, file_url } = {}) => deleteFromBucket(file_path || file_url),
      async CreateFileSignedUrl({ file_uri, expires_in = 300 }) {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const res = await fetch(`${CF_API_BASE}/media/signed-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ file_uri, expires_in }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Signed URL failed');
        return { signed_url: data.signed_url };
      },
      async SendEmail(payload) {
        return invokeCloudflare('sendEmail', payload).then((res) => res.data);
      },
      async GenerateImage(payload) {
        return invokeCloudflare('generateImage', payload).then((res) => res.data);
      },
    },
  },
};
