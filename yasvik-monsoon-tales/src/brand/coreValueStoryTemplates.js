import { YASVIK_CORE_VALUES } from '@/brand/monsoonTokens';
import { CORE_VALUE_STORY_SAMPLES } from '@/content/coreValueStories';

/** Admin “create from template” — same copy as live samples, for publishing to Supabase */
export const CORE_VALUE_STORY_TEMPLATES = Object.fromEntries(
  Object.entries(CORE_VALUE_STORY_SAMPLES).map(([valueId, story]) => [
    valueId,
    {
      title: story.title,
      slug: story.slug,
      excerpt: story.excerpt,
      body: story.body,
      read_time_minutes: story.read_time_minutes,
      is_featured: true,
    },
  ])
);

export function getCoreValueStoryTemplate(valueId) {
  return CORE_VALUE_STORY_TEMPLATES[valueId] || null;
}

export function listCoreValueStoryTemplates() {
  return YASVIK_CORE_VALUES.map((value) => ({
    valueId: value.id,
    valueTitle: value.title,
    ...CORE_VALUE_STORY_TEMPLATES[value.id],
  }));
}
