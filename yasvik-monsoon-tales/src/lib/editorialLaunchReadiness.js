/**
 * Launch-readiness calculations for editorial storefront admin + gates.
 * Does not invent content — only evaluates presence of owner-supplied assets/copy.
 */

import {
  isCampaignLaunchReady,
  isStorefrontStoryPublishReady,
} from '@/lib/editorialStorefront';

const LAUNCH_STORY_SLUGS = [
  'following-groundnut-oil-back-to-the-seed',
  'sesame-oil-for-pickles-podis-and-traditional-cooking',
  'inside-an-avakaya-batch',
  'why-jaggery-does-not-always-look-identical',
  'how-multi-floral-honey-reaches-the-jar',
  'cooking-kattuyanam-for-the-first-time',
];

export { LAUNCH_STORY_SLUGS };

function filled(value) {
  return Boolean(String(value || '').trim());
}

/** Heuristic: reject known interim / generic asset filenames. */
export function isApprovedProductPhotography(url = '') {
  const raw = String(url || '').trim().toLowerCase();
  if (!raw) return false;
  if (raw.includes('chatgpt-image')) return false;
  if (/yasvik-asset-\d+/.test(raw)) return false;
  if (raw.includes('placeholder')) return false;
  return /^https?:\/\//i.test(raw);
}

export function mapCampaignRowToUi(row = {}) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title || '',
    theme: row.title || '',
    headline: row.headline || '',
    supportingCopy: row.supporting_copy || '',
    desktopMediaUrl: row.desktop_media_url || '',
    mobileMediaUrl: row.mobile_media_url || '',
    posterImageUrl: row.poster_image_url || '',
    mediaType: row.media_type || 'image',
    ctaLabel: row.cta_label || '',
    ctaHref: row.cta_destination || '',
    textSafePosition: row.text_safe_position || 'bottom-left',
    collectionSlug: row.collection_slug || '',
    posterTone: row.poster_tone || '',
    displayPriority: Number(row.display_priority) || 100,
    isActive: row.is_active !== false,
    mediaApprovalStatus: row.media_approval_status || 'pending',
    updatedAt: row.updated_at || null,
  };
}

export function mapCampaignUiToRow(ui = {}) {
  const approval = String(ui.mediaApprovalStatus || 'pending').toLowerCase();
  return {
    title: String(ui.title || '').trim(),
    headline: String(ui.headline || '').trim() || null,
    supporting_copy: String(ui.supportingCopy || '').trim() || null,
    desktop_media_url: String(ui.desktopMediaUrl || '').trim() || null,
    mobile_media_url: String(ui.mobileMediaUrl || '').trim() || null,
    poster_image_url: String(ui.posterImageUrl || '').trim() || null,
    media_type: ui.mediaType === 'video' ? 'video' : 'image',
    cta_label: String(ui.ctaLabel || '').trim() || null,
    cta_destination: String(ui.ctaHref || '').trim() || null,
    text_safe_position: ui.textSafePosition || 'bottom-left',
    collection_slug: String(ui.collectionSlug || '').trim() || null,
    display_priority: Number(ui.displayPriority) || 100,
    is_active: ui.isActive !== false,
    media_approval_status: ['pending', 'approved', 'rejected'].includes(approval) ? approval : 'pending',
    updated_at: new Date().toISOString(),
  };
}

/** Slugs / name fragments for oils that need supporting gallery slots. */
export const OIL_GALLERY_HERO_MATCHERS = [
  /groundnut/i,
  /sesame/i,
  /peanut.?oil/i,
];

export function isOilGalleryHero(product = {}) {
  const hay = `${product.slug || ''} ${product.name || ''} ${product.title || ''}`;
  return OIL_GALLERY_HERO_MATCHERS.some((re) => re.test(hay));
}

export function oilHasSupportingGallery(product = {}) {
  const gallery = (product.galleryUrls || []).filter(Boolean);
  return gallery.length >= 2;
}

export const HERO_CONTENT_CHECKS = [
  { key: 'heroImage', label: 'Approved hero image', test: (p) => isApprovedProductPhotography(p.featured_image_url) },
  {
    key: 'gallery',
    label: 'Supporting gallery',
    test: (p) => {
      const n = (p.galleryUrls || []).length;
      return isOilGalleryHero(p) ? n >= 2 : n >= 1;
    },
  },
  { key: 'benefit', label: 'Primary customer benefit', test: (p) => filled(p.primary_customer_benefit) },
  { key: 'short', label: 'Short description', test: (p) => filled(p.short_description) },
  { key: 'ingredients', label: 'Ingredients', test: (p) => filled(p.ingredients) },
  { key: 'allergens', label: 'Allergens', test: (p) => filled(p.allergen_info) },
  { key: 'process', label: 'Processing method', test: (p) => filled(p.process_method) || filled(p.processing_method) },
  { key: 'bestFor', label: 'Best for', test: (p) => filled(p.best_for) },
  { key: 'storage', label: 'Storage note', test: (p) => filled(p.storage_note) },
  { key: 'shelfLife', label: 'Shelf life', test: (p) => filled(p.shelf_life_text) },
  { key: 'naturalVar', label: 'Natural variation note', test: (p) => filled(p.natural_variation_note) },
  { key: 'source', label: 'Source / region context', test: (p) => filled(p.origin_state) || filled(p.source_type) },
  { key: 'seoTitle', label: 'SEO title', test: (p) => filled(p.seo_title) },
  { key: 'seoDesc', label: 'SEO description', test: (p) => filled(p.seo_description) },
  { key: 'story', label: 'Related storefront Story', test: (p) => filled(p.relatedStoryId) },
];

export function assessHeroLaunchReadiness(product) {
  const results = HERO_CONTENT_CHECKS.map((check) => ({
    key: check.key,
    label: check.label,
    ok: Boolean(check.test(product)),
  }));
  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  return {
    results,
    passed,
    total,
    percent: total ? Math.round((passed / total) * 100) : 0,
    photographyOk: isApprovedProductPhotography(product?.featured_image_url),
    pdpContentOk: results
      .filter((r) => !['heroImage', 'gallery', 'story'].includes(r.key))
      .every((r) => r.ok),
    complete: results.every((r) => r.ok),
  };
}

export function assessStoryLaunchReadiness(story) {
  const publishReady = isStorefrontStoryPublishReady(story);
  const relatedOk = filled(story?.related_product_id) || filled(story?.related_collection_id);
  return {
    publishReady,
    relatedOk,
    hasVideo: filled(story?.video_url),
    hasPoster: filled(story?.poster_image_url),
    hasCaptions: filled(story?.captions),
    hasCta: filled(story?.cta_label) && filled(story?.cta_destination),
    launchReady: publishReady && relatedOk,
    status: story?.status || 'draft',
  };
}

/**
 * Live gate summary for Launch Readiness tab + public activation control.
 */
export function computeEditorialLaunchGates({
  campaigns = [],
  heroes = [],
  stories = [],
  publicFlag = false,
  previewQaPass = null,
  homeFlagWiringOk = true,
} = {}) {
  const activeCampaigns = campaigns.filter((c) => c.isActive !== false);
  const campaignReady = activeCampaigns.filter((c) => isCampaignLaunchReady(c));
  const heroesAssessed = heroes.map((h) => ({ product: h, readiness: assessHeroLaunchReadiness(h) }));
  const photoOk = heroesAssessed.filter((h) => h.readiness.photographyOk);
  const pdpOk = heroesAssessed.filter((h) => h.readiness.pdpContentOk);
  const oilHeroes = heroes.filter(isOilGalleryHero);
  const oilGalleryOk = oilHeroes.filter(oilHasSupportingGallery);
  const launchStories = stories.filter((s) => LAUNCH_STORY_SLUGS.includes(s.slug));
  const storyPool = launchStories.length ? launchStories : stories;
  const storiesAssessed = storyPool.map((s) => ({ story: s, readiness: assessStoryLaunchReadiness(s) }));
  const videoOk = storiesAssessed.filter((s) => s.readiness.hasVideo);
  const posterOk = storiesAssessed.filter((s) => s.readiness.hasPoster);
  const storiesLaunchReady = storiesAssessed.filter((s) => s.readiness.launchReady);

  const gates = [
    {
      id: 'hero-photography',
      label: 'Approved Hero photography',
      required: heroes.length || 6,
      actual: photoOk.length,
      pass: heroes.length > 0 && photoOk.length >= heroes.length,
      detail: `${photoOk.length} / ${heroes.length || 6} Heroes have non-generic primary media`,
    },
    {
      id: 'oil-galleries',
      label: 'Groundnut & Sesame supporting galleries',
      required: Math.max(oilHeroes.length, 2),
      actual: oilGalleryOk.length,
      pass: oilHeroes.length > 0 && oilGalleryOk.length >= oilHeroes.length,
      detail: oilHeroes.length
        ? `${oilGalleryOk.length} / ${oilHeroes.length} oil Heroes have 2+ gallery images`
        : 'No Groundnut/Sesame Hero products found (tier=hero)',
    },
    {
      id: 'campaign-media',
      label: 'Campaign media + approval + CTA',
      required: Math.max(activeCampaigns.length, 4),
      actual: campaignReady.length,
      pass: activeCampaigns.length >= 4 && campaignReady.length >= activeCampaigns.length,
      detail: `${campaignReady.length} / ${activeCampaigns.length || 4} active campaigns launch-ready (approved media + CTA)`,
    },
    {
      id: 'story-videos',
      label: 'Story videos',
      required: storyPool.length || 6,
      actual: videoOk.length,
      pass: storyPool.length > 0 && videoOk.length >= storyPool.length,
      detail: `${videoOk.length} / ${storyPool.length || 6} Stories have video`,
    },
    {
      id: 'story-posters',
      label: 'Story posters',
      required: storyPool.length || 6,
      actual: posterOk.length,
      pass: storyPool.length > 0 && posterOk.length >= storyPool.length,
      detail: `${posterOk.length} / ${storyPool.length || 6} Stories have posters`,
    },
    {
      id: 'story-publish-ready',
      label: 'Stories launch-ready (captions + CTA + relation)',
      required: storyPool.length || 6,
      actual: storiesLaunchReady.length,
      pass: storyPool.length > 0 && storiesLaunchReady.length >= storyPool.length,
      detail: `${storiesLaunchReady.length} / ${storyPool.length || 6} Stories publish-ready`,
    },
    {
      id: 'hero-pdp',
      label: 'Hero PDP content complete',
      required: heroes.length || 6,
      actual: pdpOk.length,
      pass: heroes.length > 0 && pdpOk.length >= heroes.length,
      detail: `${pdpOk.length} / ${heroes.length || 6} Heroes have full PDP content fields`,
    },
    {
      id: 'home-flag-wiring',
      label: 'Home flag wiring',
      required: 1,
      actual: homeFlagWiringOk ? 1 : 0,
      pass: Boolean(homeFlagWiringOk),
      detail: homeFlagWiringOk
        ? `Wired · public flag is ${publicFlag ? 'true' : 'false'} (must stay false until go-live)`
        : 'Home.jsx must switch LegacyHome ↔ EditorialHomepage via editorial_storefront_public',
    },
    {
      id: 'preview-qa',
      label: 'Preview QA status',
      required: 1,
      actual: previewQaPass === true ? 1 : 0,
      pass: previewQaPass === true,
      detail:
        previewQaPass === true
          ? 'Marked as reviewed in admin'
          : previewQaPass === false
            ? 'Marked as failing'
            : 'Not yet confirmed — open preview and mark when reviewed',
      soft: true,
    },
  ];

  const mandatory = gates.filter((g) => !g.soft);
  const allMandatoryPass = mandatory.every((g) => g.pass);
  const failing = mandatory.filter((g) => !g.pass);

  const missingItems = [];
  heroesAssessed.forEach(({ product, readiness }) => {
    readiness.results.filter((r) => !r.ok).forEach((r) => {
      missingItems.push({
        kind: 'hero',
        name: product.name || product.slug,
        field: r.label,
        href: `/admin/products?edit=${product.id}`,
      });
    });
  });
  storiesAssessed.forEach(({ story, readiness }) => {
    const gaps = [];
    if (!readiness.hasVideo) gaps.push('video');
    if (!readiness.hasPoster) gaps.push('poster');
    if (!readiness.hasCaptions) gaps.push('captions');
    if (!readiness.hasCta) gaps.push('CTA');
    if (!readiness.relatedOk) gaps.push('related product/collection');
    gaps.forEach((field) => {
      missingItems.push({
        kind: 'story',
        name: story.title || story.slug,
        field,
        href: `/admin/storefront-stories?edit=${story.id}`,
      });
    });
  });
  activeCampaigns.forEach((c) => {
    if (isCampaignLaunchReady(c)) return;
    const gaps = [];
    if (!c.desktopMediaUrl && !c.mobileMediaUrl && !c.posterImageUrl) gaps.push('media');
    if (String(c.mediaApprovalStatus || '').toLowerCase() !== 'approved') gaps.push('media approval');
    if (!c.headline) gaps.push('headline');
    if (!c.ctaLabel || !c.ctaHref) gaps.push('CTA');
    gaps.forEach((field) => {
      missingItems.push({
        kind: 'campaign',
        name: c.title || c.slug,
        field,
        href: '/admin/editorial-storefront#campaigns',
      });
    });
  });

  return {
    gates,
    mandatory,
    failing,
    allMandatoryPass,
    publicFlag: Boolean(publicFlag),
    missingItems,
    counts: {
      heroPhotography: photoOk.length,
      heroTotal: heroes.length,
      oilGallery: oilGalleryOk.length,
      oilTotal: oilHeroes.length,
      campaignReady: campaignReady.length,
      campaignTotal: activeCampaigns.length,
      storyVideos: videoOk.length,
      storyPosters: posterOk.length,
      storyTotal: storyPool.length,
      heroPdp: pdpOk.length,
      storiesLaunchReady: storiesLaunchReady.length,
    },
    heroesAssessed,
    storiesAssessed,
  };
}

export function buildMissingItemsReport(summary) {
  const lines = [
    '# Editorial storefront — missing items',
    `Generated: ${new Date().toISOString()}`,
    `Public flag: ${summary.publicFlag ? 'true' : 'false'}`,
    `Mandatory gates pass: ${summary.allMandatoryPass ? 'YES' : 'NO'}`,
    '',
    '## Failing gates',
  ];
  if (!summary.failing.length) {
    lines.push('- None');
  } else {
    summary.failing.forEach((g) => lines.push(`- ${g.label}: ${g.detail}`));
  }
  lines.push('', '## Exact missing fields');
  if (!(summary.missingItems || []).length) {
    lines.push('- None');
  } else {
    summary.missingItems.forEach((item) => {
      lines.push(`- [${item.kind}] ${item.name}: ${item.field} → ${item.href}`);
    });
  }
  lines.push('', '## Hero gaps');
  summary.heroesAssessed.forEach(({ product, readiness }) => {
    const missing = readiness.results.filter((r) => !r.ok).map((r) => r.label);
    lines.push(`### ${product.name || product.slug}`);
    if (!missing.length) lines.push('- Complete');
    else missing.forEach((m) => lines.push(`- Missing: ${m}`));
  });
  lines.push('', '## Story gaps');
  summary.storiesAssessed.forEach(({ story, readiness }) => {
    lines.push(`### ${story.title}`);
    lines.push(`- Status: ${story.status}`);
    lines.push(`- Video: ${readiness.hasVideo ? 'yes' : 'MISSING'}`);
    lines.push(`- Poster: ${readiness.hasPoster ? 'yes' : 'MISSING'}`);
    lines.push(`- Captions: ${readiness.hasCaptions ? 'yes' : 'MISSING'}`);
    lines.push(`- CTA: ${readiness.hasCta ? 'yes' : 'MISSING'}`);
    lines.push(`- Launch-ready: ${readiness.launchReady ? 'yes' : 'no'}`);
  });
  lines.push('', '## Campaign gaps');
  (summary.campaignNotes || []).forEach((n) => lines.push(`- ${n}`));
  return `${lines.join('\n')}\n`;
}
