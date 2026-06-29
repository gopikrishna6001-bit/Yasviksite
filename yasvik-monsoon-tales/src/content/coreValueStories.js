import { YASVIK_CORE_VALUES } from '@/brand/monsoonTokens';
import { BRAND_LOGO_HORIZONTAL } from '@/lib/brandAssets';

const COVER_FALLBACK = BRAND_LOGO_HORIZONTAL;

/** Sample stories for the three core values — used until matching slugs are published in Admin → Stories */
export const CORE_VALUE_STORY_SAMPLES = {
  'conscious-food': {
    id: 'cv-story-conscious-food',
    slug: 'conscious-food',
    title: 'What — Conscious Food',
    excerpt:
      'Everyday choices for modern Indian homes',
    body: `What is the problem?
The problem isn't choosing food — it's choosing the right food. Most people aren't eating badly because they don't care. They're eating badly because the right options are hard to find, expensive, or hard to trust.

Everyday essentials — the grains, flours, millets, pulses, and oils you use daily — shape your health more than anything else. But most mass-market options are compromised: heavily processed, loaded with additives, or sourced without transparency.

Look at white rice. Here's the shift:

Then: White rice was eaten as an occasional festival meal — maybe once a month or during special occasions. Millets, brown rice, and whole grains were the daily staples.

Now: White rice is our daily meal. Every day. Multiple times a day.

That's the problem. Not rice itself — but eating refined white rice daily instead of occasionally, and losing the diversity (millets, whole grains) that was normal before. The same pattern applies to refined flours, processed oils, and supermarket grains: everything became refined, processed, and daily — when it should be occasional and diverse.

Millets, once India's superfood for thousands of years, disappeared from kitchens for decades because of this shift. Now they're returning, but as expensive niche products, not affordable staples.

The choice is the problem. Not choosing right food.`,
    cover_image: COVER_FALLBACK,
    read_time_minutes: 5,
    is_featured: true,
    is_published: true,
    is_sample: true,
    core_value_id: 'conscious-food',
  },
  'responsible-sourcing': {
    id: 'cv-story-responsible-sourcing',
    slug: 'responsible-sourcing',
    title: 'Where — Responsible Sourcing',
    excerpt:
      'We go to the source — and verify it',
    body: `Where is the solution?
The solution still exists — but it's hidden. There are still farmers, suppliers, and producers who stick to values. Who produce good food the way it should be done. Who don't compromise on quality, even when it costs more or takes longer.

But farmers' produce isn't reaching us. Companies, factories, and middlemen kept farmers away from customers. A long chain of processors, distributors, and retailers stands between the person who grows your food and the person who eats it. Each layer adds cost, time, and compromise.

There's no ecosystem to encourage buying farmers' produce. Customers are trained to choose processed, packaged, branded foods — not raw, fresh, farm-direct options. Labels look cleaner. Marketing looks stronger. Convenience wins over quality.

And farmers don't have the infrastructure to meet customer needs. They don't have packaging lines. They don't have e-commerce systems. They don't have delivery networks. They grow great food, but they can't scale it to reach you directly.

So good food stays local. It stays small. It stays invisible. You never find it unless someone goes to find it.

That's where the solution lives — in reconnecting farmers who still value quality with customers who still want it.`,
    cover_image: COVER_FALLBACK,
    read_time_minutes: 5,
    is_featured: true,
    is_published: true,
    is_sample: true,
    core_value_id: 'responsible-sourcing',
  },
  'honest-quality': {
    id: 'cv-story-honest-quality',
    slug: 'honest-quality',
    title: 'Why — Honest Quality',
    excerpt:
      'Clear information. No shortcuts.',
    body: `That's why Yasvik exists.

We find them. We source from them. We do it through our journeys — going to the source, verifying it, and bringing good food to you.

We don't stop at supplier lists or packaging claims. We go directly to farms and producers. We verify origin, check methods, and understand who grows what you eat. We build supply relationships that respect both the product and the people behind it.

Traceability, consistency, accountability — not just logos on a box. We go to the source — and verify it.

Modern Indians — people balancing busy lives, urban routines, and the desire for better food — shouldn't have to struggle to find honest options. You want clarity, not confusion. You want honest labels, specific ingredient info, and no vague marketing claims. For you, clear information is non-negotiable.

Yasvik exists to give you that. No shortcuts in how we select, present, or deliver. Just honest quality you can trust.

Final flow:
1. What = What is the problem? (choice is the problem — not choosing right food)
2. Where = Where is the solution? (farmers exist but produce isn't reaching us — middlemen, no ecosystem, no infrastructure)
3. Why = That's why Yasvik exists (we reconnect farmers’ produce with customers, go to the source, verify)`,
    cover_image: COVER_FALLBACK,
    read_time_minutes: 5,
    is_featured: true,
    is_published: true,
    is_sample: true,
    core_value_id: 'honest-quality',
  },
};

export function getSampleCoreValueStory(valueOrId = '') {
  const key = String(valueOrId || '').trim();
  if (CORE_VALUE_STORY_SAMPLES[key]) return { ...CORE_VALUE_STORY_SAMPLES[key] };
  const byValue = Object.values(CORE_VALUE_STORY_SAMPLES).find(
    (story) => story.id === key || story.slug === key
  );
  return byValue ? { ...byValue } : null;
}

export function listSampleCoreValueStories() {
  return YASVIK_CORE_VALUES.map((value) => CORE_VALUE_STORY_SAMPLES[value.id]).filter(Boolean);
}

export function isSampleCoreValueStoryId(id = '') {
  return String(id || '').startsWith('cv-story-');
}
