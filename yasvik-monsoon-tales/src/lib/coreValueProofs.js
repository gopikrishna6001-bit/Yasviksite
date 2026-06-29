import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCoreValueSettingKeys, YASVIK_CORE_VALUES } from '@/brand/monsoonTokens';
import { getSampleCoreValueStory } from '@/content/coreValueStories';
import { stories as storiesApi } from '@/services/api';
import { fetchAllAppSettings, resolveSettingsMap, SETTINGS_QUERY_KEYS } from '@/services/settingsService';

function normalizeSlug(slug = '') {
  return String(slug || '').trim().toLowerCase();
}

function findStoryForValue(value, storiesBySlug = {}, storiesById = {}, settingsMap = {}) {
  const keys = getCoreValueSettingKeys(value.id);
  const adminStoryId = String(settingsMap[keys.storyId] || '').trim();

  if (adminStoryId && storiesById[adminStoryId]) {
    return storiesById[adminStoryId];
  }

  const slugStory = storiesBySlug[normalizeSlug(value.storySlug)];
  if (slugStory) return slugStory;

  return getSampleCoreValueStory(value.id);
}

function buildStoryLink(value, story) {
  if (story?.id) {
    return {
      href: `/stories/${story.id}`,
      label: 'Read the story',
      title: story.title,
      excerpt: story.excerpt,
      ready: true,
      isSample: Boolean(story.is_sample),
      kind: 'story',
    };
  }

  return {
    href: '/stories',
    label: 'Story coming soon',
    title: null,
    excerpt: null,
    ready: false,
    isSample: false,
    kind: 'placeholder',
  };
}

export function useCoreValueStories() {
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.public,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });

  const settingsMap = useMemo(() => resolveSettingsMap(settings), [settings]);

  const { data: publishedStories = [] } = useQuery({
    queryKey: ['core-value-stories-published'],
    queryFn: () => storiesApi.listPublished(50),
    staleTime: 10 * 60 * 1000,
  });

  const { storiesBySlug, storiesById, pillarStories, linksById } = useMemo(() => {
    const bySlug = {};
    const byId = {};

    publishedStories.forEach((story) => {
      byId[story.id] = story;
      const slug = normalizeSlug(story.slug);
      if (slug) bySlug[slug] = story;
    });

    const pillars = YASVIK_CORE_VALUES.map((value) => {
      const story = findStoryForValue(value, bySlug, byId, settingsMap);
      return { value, story, link: buildStoryLink(value, story) };
    });

    const links = {};
    pillars.forEach(({ value, link }) => {
      links[value.id] = link;
    });

    return {
      storiesBySlug: bySlug,
      storiesById: byId,
      pillarStories: pillars,
      linksById: links,
    };
  }, [publishedStories, settingsMap]);

  const otherStories = useMemo(() => {
    const pillarIds = new Set(pillarStories.map(({ story }) => story?.id).filter(Boolean));
    const pillarSlugs = new Set(YASVIK_CORE_VALUES.map((v) => normalizeSlug(v.storySlug)));
    return publishedStories.filter((story) => {
      if (pillarIds.has(story.id)) return false;
      if (pillarSlugs.has(normalizeSlug(story.slug))) return false;
      return true;
    });
  }, [publishedStories, pillarStories]);

  return { pillarStories, linksById, otherStories, storiesBySlug, storiesById };
}

/** @deprecated use useCoreValueStories */
export function useCoreValueProofs() {
  const { linksById } = useCoreValueStories();
  return { proofsById: linksById };
}
