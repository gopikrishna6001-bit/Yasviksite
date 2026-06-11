import { supabase } from '@/api/supabaseClient';

const CF_API_BASE = import.meta.env.VITE_CLOUDFLARE_API_BASE_URL || '/api';
const PUBLIC_BUCKET = import.meta.env.VITE_SUPABASE_PUBLIC_BUCKET || 'media-assets';
const PRIVATE_BUCKET = import.meta.env.VITE_SUPABASE_PRIVATE_BUCKET || 'user-uploads';

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
    'title',
    'slug',
    'description',
    'combo_price',
    'regular_price',
    'original_price',
    'discount_percentage',
    'featured_image_url',
    'hero_image',
    'is_published',
    'is_featured',
    'sort_order',
    'product_ids',
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
    'name',
    'slug',
    'description',
    'short_description',
    'sku',
    'category_id',
    'journey_id',
    'person_id',
    'region_id',
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
};

function mapToDb(name, payload = {}) {
  const aliases = fieldAliases[name] || {};
  const out = {};
  const blockedKeys = new Set([
    'id',
    'created_date',
    'updated_date',
    'modified_date',
    'created_at',
    'updated_at',
  ]);
  Object.entries(payload || {}).forEach(([key, value]) => {
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
    out.purity_badges = out.purity_badges ?? out.certifications ?? [];
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
  }
  if (name === 'Category') {
    out.cover_image = out.cover_image || out.icon_url || '';
    out.icon_url = out.icon_url || out.cover_image || '';
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
  }
  if (name === 'Region') {
    out.short_description = out.short_description || out.description || '';
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

async function attachProductImages(rows = []) {
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
    const images = imageRowsForProduct.map((i) => i.url).filter(Boolean);
    const primaryImage =
      imageRowsForProduct.find((i) => i.is_primary)?.url ||
      imageRowsForProduct[0]?.url ||
      '';
    const hero_image = primaryImage || row.hero_image || row.featured_image_url || '';
    return {
      ...row,
      images,
      hero_image,
      featured_image_url: hero_image || row.featured_image_url || '',
    };
  });
}

async function syncProductImages(productId, images = [], heroImage = '') {
  if (!productId) return;
  if (!Array.isArray(images)) return;

  const uniqueImages = [...new Set(images.map((u) => String(u || '').trim()).filter(Boolean))];
  const desiredImages = uniqueImages.length > 0
    ? [...uniqueImages]
    : (heroImage ? [heroImage] : []);

  await supabase.from('product_images').delete().eq('product_id', productId);
  if (desiredImages.length === 0) return;

  const rows = desiredImages.map((url, index) => ({
    product_id: productId,
    image_url: url,
    sort_order: index,
    is_primary: index === 0,
  }));
  await supabase.from('product_images').insert(rows);
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
      if (name === 'Product') return attachProductImages(mappedRows);
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
      if (name === 'Product') return attachProductImages(mappedRows);
      return mappedRows;
    },
    async create(payload) {
      const mappedPayload = mapToDb(name, payload);
      const { data, error } = await supabase.from(table).insert(mappedPayload).select('*').single();
      if (error) throw error;
      const mapped = mapFromDb(name, normalizeRow(data));
      if (name === 'Product') {
        await syncProductImages(mapped.id, payload?.images || [], payload?.hero_image || mapped.hero_image || '');
        const [hydrated] = await attachProductImages([mapped]);
        return hydrated || mapped;
      }
      return mapped;
    },
    async update(id, payload) {
      const mappedPayload = mapToDb(name, payload);
      const { data, error } = await supabase.from(table).update(mappedPayload).eq('id', id).select('*').single();
      if (error) throw error;
      const mapped = mapFromDb(name, normalizeRow(data));
      if (name === 'Product') {
        await syncProductImages(id, payload?.images || [], payload?.hero_image || mapped.hero_image || '');
        const [hydrated] = await attachProductImages([mapped]);
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

async function uploadToBucket(bucket, file, isPrivate = false) {
  const fileExt = file?.name?.split('.').pop() || 'bin';
  const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
  const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  if (isPrivate) {
    return { file_uri: `${bucket}/${filePath}` };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  const fileUrl = data.publicUrl;

  // Keep admin media manager populated with uploaded files.
  try {
    await supabase.from('media_assets').insert({
      name: file?.name || filePath,
      slug: filePath.replace(/\W+/g, '-').toLowerCase(),
      file_path: `${bucket}/${filePath}`,
      file_size: file?.size || null,
      mime_type: file?.type || null,
      media_type: (file?.type || '').startsWith('video/') ? 'video' : 'image',
      upload_url: fileUrl,
      is_active: true,
    });
  } catch {
    // Non-blocking: upload succeeded even if indexing row fails.
  }

  return { file_url: fileUrl };
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
        return {
          ...baseUser,
          ...mapFromDb('UserProfile', normalizeRow(profile)),
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
      const redirectTo = `${window.location.origin}${redirectPath}`;
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
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
      UploadFile: (arg) => uploadToBucket(PUBLIC_BUCKET, arg.file, false),
      UploadPrivateFile: (arg) => uploadToBucket(PRIVATE_BUCKET, arg.file, true),
      async CreateFileSignedUrl({ file_uri, expires_in = 300 }) {
        const [bucket, ...rest] = String(file_uri).split('/');
        const path = rest.join('/');
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expires_in);
        if (error) throw error;
        return { signed_url: data.signedUrl };
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
