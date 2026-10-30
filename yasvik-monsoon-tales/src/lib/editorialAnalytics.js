import { trackEvent } from '@/lib/analytics';

export function trackCampaignViewed(campaignId) {
  trackEvent('editorial_campaign_viewed', { campaign_id: campaignId });
}

export function trackCampaignCtaClicked(campaignId, href) {
  trackEvent('editorial_campaign_cta_clicked', { campaign_id: campaignId, href });
}

export function trackStoryImpression(storyId) {
  trackEvent('editorial_story_impression', { story_id: storyId });
}

export function trackStoryStarted(storyId) {
  trackEvent('editorial_story_started', { story_id: storyId });
}

export function trackStoryCompleted(storyId) {
  trackEvent('editorial_story_completed', { story_id: storyId });
}

export function trackStoryClosed(storyId) {
  trackEvent('editorial_story_closed', { story_id: storyId });
}

export function trackStoryProductClicked(storyId, productId) {
  trackEvent('editorial_story_product_clicked', { story_id: storyId, product_id: productId });
}

export function trackHeroProductViewed(productId) {
  trackEvent('editorial_hero_product_viewed', { product_id: productId });
}

export function trackHeroAddedToCart(productId) {
  trackEvent('editorial_hero_added_to_cart', { product_id: productId });
}

export function trackStoryWorldClicked(collectionSlug) {
  trackEvent('editorial_story_world_clicked', { collection_slug: collectionSlug });
}

export function trackLocalStoreEntryClicked() {
  trackEvent('editorial_local_store_entry_clicked', {});
}
