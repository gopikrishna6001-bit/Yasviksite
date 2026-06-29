/**
 * services/api.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized service layer — abstracts all backend interactions.
 * Delegates to a Supabase-backed app client adapter.
 * Implementations can be swapped here without changing UI components.
 *
 * Structure:
 *   api.auth.*        — user authentication & session
 *   api.entities.*    — all entity CRUD operations
 *   api.functions.*   — backend function invocations
 *   api.integrations.*— file uploads and other integrations
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { appClient } from '@/api/appClient';
import { sortCatalogProducts, sortFeaturedProducts } from '@/lib/productSortUtils';
import { getSampleCoreValueStory } from '@/content/coreValueStories';
import { isProductUuid } from '@/lib/productUrls';
import { countMediaReferences } from '@/lib/mediaReferences';
import { normalizeMediaStorageKey } from '@/lib/mediaStorageKey';

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const auth = {
  /** Returns the currently authenticated user, or throws if not authed. */
  me: () => appClient.auth.me(),

  /** Logs out the current user, optionally redirecting. */
  logout: (redirectUrl) => appClient.auth.logout(redirectUrl),

  /** Redirects to login page, with optional post-login return URL. */
  redirectToLogin: (nextUrl) => appClient.auth.redirectToLogin(nextUrl),

  /** Updates the current user's editable fields. */
  updateMe: (data) => appClient.auth.updateMe(data),
};

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

export const products = {
  list: (sort = '-created_date', limit = 20) =>
    appClient.entities.Product.list(sort, limit),

  get: (id) => appClient.entities.Product.get(id),

  async getBySlugOrId(param) {
    const key = String(param || '').trim();
    if (!key) return null;

    if (isProductUuid(key)) {
      try {
        return await appClient.entities.Product.get(key);
      } catch {
        // Fall through to slug lookup below.
      }
    }

    const bySlug = await appClient.entities.Product.filter({ slug: key, is_published: true }, '-created_date', 1);
    if (bySlug?.[0]) return bySlug[0];

    if (isProductUuid(key)) return null;

    try {
      return await appClient.entities.Product.get(key);
    } catch {
      const all = await appClient.entities.Product.filter({ is_published: true }, '-created_date', 300);
      return all.find((product) => product.slug === key || product.id === key) || null;
    }
  },

  filter: (filters, sort = '-created_date', limit = 20) =>
    appClient.entities.Product.filter(filters, sort, limit),

  listPublished: async (sort = 'sort_order', limit = 20) => {
    const rows = await appClient.entities.Product.filter({ is_published: true }, sort, limit);
    return sortCatalogProducts(rows);
  },

  listFeatured: async (limit = 6) => {
    const rows = await appClient.entities.Product.filter({ is_published: true, is_featured: true }, 'sort_order', limit);
    return sortFeaturedProducts(rows);
  },

  listFeaturedInHero: async (limit = 8) => {
    const rows = await appClient.entities.Product.filter({ is_published: true, featured_in_hero: true }, 'sort_order', limit);
    return sortFeaturedProducts(rows);
  },

  listByCategory: async (categoryId, limit = 200) => {
    const rows = await appClient.entities.Product.filter({ is_published: true, category_id: categoryId }, 'sort_order', limit);
    return sortCatalogProducts(rows);
  },

  listByJourney: (journeyId, limit = 6) =>
    appClient.entities.Product.filter({ is_published: true, journey_id: journeyId }, '-created_date', limit),

  listByPerson: (personId, limit = 6) =>
    appClient.entities.Product.filter({ is_published: true, person_id: personId }, '-created_date', limit),

  listByRegion: (regionId, limit = 6) =>
    appClient.entities.Product.filter({ is_published: true, region_id: regionId }, '-created_date', limit),

  create: (data) => appClient.entities.Product.create(data),
  update: (id, data) => appClient.entities.Product.update(id, data),
  delete: (id) => appClient.entities.Product.delete(id),
};

// ─── JOURNEYS ────────────────────────────────────────────────────────────────

export const journeys = {
  list: (sort = 'sort_order', limit = 20) =>
    appClient.entities.Journey.list(sort, limit),

  get: (id) => appClient.entities.Journey.get(id),

  filter: (filters, sort = 'sort_order', limit = 20) =>
    appClient.entities.Journey.filter(filters, sort, limit),

  listPublished: (limit = 20) =>
    appClient.entities.Journey.filter({ is_published: true }, 'sort_order', limit),

  listFeatured: (limit = 3) =>
    appClient.entities.Journey.filter({ is_published: true, is_featured: true }, '-created_date', limit),

  create: (data) => appClient.entities.Journey.create(data),
  update: (id, data) => appClient.entities.Journey.update(id, data),
  delete: (id) => appClient.entities.Journey.delete(id),
};

// ─── STORIES ─────────────────────────────────────────────────────────────────

export const stories = {
  list: (sort = '-created_date', limit = 20) =>
    appClient.entities.Story.list(sort, limit),

  get: async (id) => {
    const sample = getSampleCoreValueStory(id);
    if (sample) return sample;
    return appClient.entities.Story.get(id);
  },

  filter: (filters, sort = '-created_date', limit = 20) =>
    appClient.entities.Story.filter(filters, sort, limit),

  listPublished: (limit = 20) =>
    appClient.entities.Story.filter({ is_published: true }, '-created_date', limit),

  listFeatured: (limit = 8) =>
    appClient.entities.Story.filter({ is_published: true, is_featured: true }, '-created_date', limit),

  create: (data) => appClient.entities.Story.create(data),
  update: (id, data) => appClient.entities.Story.update(id, data),
  delete: (id) => appClient.entities.Story.delete(id),
};

// ─── PEOPLE ──────────────────────────────────────────────────────────────────

export const people = {
  list: (sort = '-created_date', limit = 20) =>
    appClient.entities.Person.list(sort, limit),

  get: (id) => appClient.entities.Person.get(id),

  filter: (filters, sort = '-created_date', limit = 20) =>
    appClient.entities.Person.filter(filters, sort, limit),

  listPublished: (limit = 20) =>
    appClient.entities.Person.filter({ is_published: true }, '-created_date', limit),

  listFeatured: (limit = 6) =>
    appClient.entities.Person.filter({ is_published: true, is_featured: true }, '-created_date', limit),

  create: (data) => appClient.entities.Person.create(data),
  update: (id, data) => appClient.entities.Person.update(id, data),
  delete: (id) => appClient.entities.Person.delete(id),
};

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

export const categories = {
  list: (sort = 'sort_order', limit = 20) =>
    appClient.entities.Category.list(sort, limit),

  get: (id) => appClient.entities.Category.get(id),

  filter: (filters, sort = 'sort_order', limit = 20) =>
    appClient.entities.Category.filter(filters, sort, limit),

  listActive: (limit = 20) =>
    appClient.entities.Category.filter({ is_active: true }, 'sort_order', limit),

  create: (data) => appClient.entities.Category.create(data),
  update: (id, data) => appClient.entities.Category.update(id, data),
  delete: (id) => appClient.entities.Category.delete(id),
};

// ─── REGIONS ─────────────────────────────────────────────────────────────────

export const regions = {
  list: (sort = 'name', limit = 50) =>
    appClient.entities.Region.list(sort, limit),

  get: (id) => appClient.entities.Region.get(id),

  filter: (filters, sort = 'name', limit = 50) =>
    appClient.entities.Region.filter(filters, sort, limit),

  create: (data) => appClient.entities.Region.create(data),
  update: (id, data) => appClient.entities.Region.update(id, data),
  delete: (id) => appClient.entities.Region.delete(id),
};

// ─── REVIEWS ─────────────────────────────────────────────────────────────────

export const reviews = {
  list: (sort = '-created_date', limit = 50) =>
    appClient.entities.Review.list(sort, limit),

  filter: (filters, sort = '-created_date', limit = 50) =>
    appClient.entities.Review.filter(filters, sort, limit),

  create: (data) => appClient.entities.Review.create(data),
  update: (id, data) => appClient.entities.Review.update(id, data),
  delete: (id) => appClient.entities.Review.delete(id),
};

// ─── ORDERS ──────────────────────────────────────────────────────────────────

export const orders = {
  list: (sort = '-created_date', limit = 50) =>
    appClient.entities.Order.list(sort, limit),

  get: (id) => appClient.entities.Order.get(id),

  filter: (filters, sort = '-created_date', limit = 20) =>
    appClient.entities.Order.filter(filters, sort, limit),

  listByUser: (userId, limit = 20) =>
    appClient.entities.Order.filter({ user_id: userId }, '-created_date', limit),

  create: (data) => appClient.entities.Order.create(data),
  update: (id, data) => appClient.entities.Order.update(id, data),
  delete: (id) => appClient.entities.Order.delete(id),
};

// ─── USER PROFILES ───────────────────────────────────────────────────────────

export const userProfiles = {
  filter: (filters, sort = '-created_date', limit = 1) =>
    appClient.entities.UserProfile.filter(filters, sort, limit),

  getByEmail: (email) =>
    appClient.entities.UserProfile.filter({ user_email: email }, '-created_date', 1),

  create: (data) => appClient.entities.UserProfile.create(data),
  update: (id, data) => appClient.entities.UserProfile.update(id, data),
};

// ─── COMBOS ──────────────────────────────────────────────────────────────────

export const combos = {
  list: (sort = '-created_date', limit = 20) =>
    appClient.entities.Combo.list(sort, limit),

  filter: (filters, sort = '-created_date', limit = 20) =>
    appClient.entities.Combo.filter(filters, sort, limit),

  listPublished: (limit = 6) =>
    appClient.entities.Combo.filter({ is_published: true }, '-created_date', limit),

  create: (data) => appClient.entities.Combo.create(data),
  update: (id, data) => appClient.entities.Combo.update(id, data),
  delete: (id) => appClient.entities.Combo.delete(id),
};

// ─── COLLECTIONS ─────────────────────────────────────────────────────────────

export const collections = {
  list: (sort = 'sort_order', limit = 20) =>
    appClient.entities.Collection.list(sort, limit),

  filter: (filters, sort = 'sort_order', limit = 20) =>
    appClient.entities.Collection.filter(filters, sort, limit),

  listActive: (limit = 20) =>
    appClient.entities.Collection.filter({ is_active: true }, 'sort_order', limit),

  create: (data) => appClient.entities.Collection.create(data),
  update: (id, data) => appClient.entities.Collection.update(id, data),
  delete: (id) => appClient.entities.Collection.delete(id),
};

// ─── MEDIA ASSETS ────────────────────────────────────────────────────────────

export const mediaAssets = {
  list: (sort = '-created_date', limit = 50) =>
    appClient.entities.MediaAsset.list(sort, limit),

  filter: (filters, sort = '-created_date', limit = 50) =>
    appClient.entities.MediaAsset.filter(filters, sort, limit),

  create: (data) => appClient.entities.MediaAsset.create(data),
  update: (id, data) => appClient.entities.MediaAsset.update(id, data),
  delete: async (id) => {
    const asset = await appClient.entities.MediaAsset.get(id);
    const storageKey = normalizeMediaStorageKey(
      asset.file_path || asset.upload_url || asset.file_url || asset.url,
    );

    let storageDeleted = false;
    if (storageKey) {
      const refs = await countMediaReferences(storageKey, { excludeMediaAssetId: id });
      if (refs === 0) {
        await appClient.integrations.Core.DeleteFile({ file_path: storageKey });
        storageDeleted = true;
      }
    }

    await appClient.entities.MediaAsset.delete(id);
    return { success: true, storageDeleted, storageKey };
  },
  countReferences: (storageKey, options) => countMediaReferences(storageKey, options),
};

// ─── HOMEPAGE SECTIONS ───────────────────────────────────────────────────────

export const homepageSections = {
  list: (sort = 'sort_order', limit = 20) =>
    appClient.entities.HomepageSection.list(sort, limit),

  filter: (filters, sort = 'sort_order', limit = 20) =>
    appClient.entities.HomepageSection.filter(filters, sort, limit),

  listActive: (limit = 20) =>
    appClient.entities.HomepageSection.filter({ is_active: true }, 'sort_order', limit),

  create: (data) => appClient.entities.HomepageSection.create(data),
  update: (id, data) => appClient.entities.HomepageSection.update(id, data),
  delete: (id) => appClient.entities.HomepageSection.delete(id),
};

// ─── APP SETTINGS ────────────────────────────────────────────────────────────

export const appSettings = {
  list: () => appClient.entities.AppSettings.list('-updated_date', 1000),
  filter: (filters) => appClient.entities.AppSettings.filter(filters, '-updated_date', 1000),
  create: (data) => appClient.entities.AppSettings.create(data),
  update: (id, data) => appClient.entities.AppSettings.update(id, data),
  delete: (id) => appClient.entities.AppSettings.delete(id),
};

// ─── PAGE SETTINGS ───────────────────────────────────────────────────────────

export const pageSettings = {
  list: () => appClient.entities.PageSettings.list('sort_order', 100),
  filter: (filters) => appClient.entities.PageSettings.filter(filters, 'sort_order', 100),
  create: (data) => appClient.entities.PageSettings.create(data),
  update: (id, data) => appClient.entities.PageSettings.update(id, data),
  delete: (id) => appClient.entities.PageSettings.delete(id),
};

// ─── PAGE HEROES ──────────────────────────────────────────────────────────

export const pageHeroes = {
  list: (sort = '-created_date', limit = 20) =>
    appClient.entities.PageHero.list(sort, limit),

  get: (id) => appClient.entities.PageHero.get(id),

  filter: (filters, sort = '-created_date', limit = 20) =>
    appClient.entities.PageHero.filter(filters, sort, limit),

  getByPageKey: (pageKey) =>
    appClient.entities.PageHero.filter({ page_key: pageKey, is_active: true }, '-created_date', 1),

  create: (data) => appClient.entities.PageHero.create(data),
  update: (id, data) => appClient.entities.PageHero.update(id, data),
  delete: (id) => appClient.entities.PageHero.delete(id),
};

// ─── SUBSCRIPTIONS ───────────────────────────────────────────────────────────

export const subscriptions = {
  list: (sort = '-created_date', limit = 20) =>
    appClient.entities.Subscription.list(sort, limit),

  filter: (filters, sort = '-created_date', limit = 20) =>
    appClient.entities.Subscription.filter(filters, sort, limit),

  create: (data) => appClient.entities.Subscription.create(data),
  update: (id, data) => appClient.entities.Subscription.update(id, data),
  delete: (id) => appClient.entities.Subscription.delete(id),
};

// ─── USER SUBSCRIPTIONS ──────────────────────────────────────────────────────

export const userSubscriptions = {
  filter: (filters, sort = '-created_date', limit = 20) =>
    appClient.entities.UserSubscription.filter(filters, sort, limit),

  create: (data) => appClient.entities.UserSubscription.create(data),
  update: (id, data) => appClient.entities.UserSubscription.update(id, data),
  delete: (id) => appClient.entities.UserSubscription.delete(id),
};

// ─── BACKEND FUNCTIONS ───────────────────────────────────────────────────────

export const functions = {
  /**
   * Invoke a named backend function.
   * Returns the full Axios response; data is in response.data
   */
  invoke: (name, payload = {}) => appClient.functions.invoke(name, payload),
};

// ─── FILE INTEGRATIONS ───────────────────────────────────────────────────────
// [MIGRATION POINT] Storage provider can be swapped here in one place.
// To migrate to a different storage provider, replace only the implementations here.
// The return shape contract must be preserved for all call sites:
//   upload()         → { file_url: string }
//   uploadPrivate()  → { file_uri: string }
//   createSignedUrl()→ { signed_url: string }
//
// Migration targets:
//   Cloudflare R2 (current): Worker POST /api/media/upload → media.yasvik.com
//   Supabase Storage (legacy): deprecated for new uploads
//
// FILE URL AUDIT NOTE:
//   All file_url values are stored in entity fields (hero_image, cover_image, etc.)
//   and rendered directly via <img src={...}> or CSS background-image.
//   There is NO hardcoded provider CDN domain in any frontend component.
//   URLs are treated as opaque strings — safe to swap storage provider
//   for NEW uploads at any time. Existing stored URLs will continue to work
//   until a data migration updates them to the new storage domain.

export const files = {
  /**
   * Uploads a file to public storage.
   * Returns { file_url: string }
   * [MIGRATION POINT] — swap implementation for Supabase Storage / R2 / S3
   */
  upload: (file, options = {}) => appClient.integrations.Core.UploadFile({ file, ...options }),

  /**
   * Uploads a file to private (authenticated) storage.
   * Returns { file_uri: string }
   * [MIGRATION POINT] — swap implementation for Supabase private bucket / R2 / S3
   */
  uploadPrivate: (file) => appClient.integrations.Core.UploadPrivateFile({ file }),

  /**
   * Creates a time-limited signed URL for a private file.
   * Returns { signed_url: string }
   * [MIGRATION POINT] — swap for Supabase createSignedUrl / R2 / S3 presigned URL
   */
  createSignedUrl: (fileUri, expiresIn = 300) =>
    appClient.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: expiresIn }),
};

// ─── EMAIL ────────────────────────────────────────────────────────────────────
// Thin abstraction over transactional email sending.
// Delegates to the app client's email integration (called from backend functions).
// [MIGRATION POINT] — swap sendTransactional for Resend, SendGrid, Postmark, etc.
//
// NOTE: Email is sent server-side from backend functions, not from the frontend.
// This namespace exists to document the interface and support future server-side usage
// where a portable email client is needed (e.g., Supabase Edge Functions).
//
// Migration targets:
//   Resend:    resend.emails.send({ from, to, subject, html })
//   SendGrid:  sgMail.send({ to, from, subject, html })
//   Postmark:  client.sendEmail({ To, From, Subject, HtmlBody })

export const email = {
  /**
   * Sends a transactional email.
   * [MIGRATION POINT] — swap implementation for target email provider
   * @param {{ to: string, subject: string, body: string, from_name?: string }} params
   */
  sendTransactional: ({ to, subject, body, from_name = 'Yasvik' }) =>
    appClient.integrations.Core.SendEmail({ to, subject, body, from_name }),
};

export {
  fetchFrequentlyBoughtTogether,
  fetchCompleteYourBasket,
  fetchActiveBundles,
  fetchBundleBySlug,
  fetchCartCrossSell,
} from './productRelationsApi';

// ─── DEFAULT EXPORT — convenience namespace ──────────────────────────────────

const api = {
  auth,
  products,
  journeys,
  stories,
  people,
  categories,
  regions,
  reviews,
  orders,
  userProfiles,
  combos,
  collections,
  mediaAssets,
  homepageSections,
  appSettings,
  pageSettings,
  pageHeroes,
  subscriptions,
  userSubscriptions,
  functions,
  files,
  email,
};

export default api;
