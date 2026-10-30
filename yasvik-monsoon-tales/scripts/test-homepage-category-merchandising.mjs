import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assignHomepageOrder,
  buildHomepageTilePreview,
  isHomepageCategoryEligible,
  listHomepageFeaturedCategories,
  listHomepageHeroCategories,
} from '../src/lib/homepageCategoryMerchandising.js';

describe('homepageCategoryMerchandising', () => {
  const cats = [
    {
      id: 'snacks',
      slug: 'snacks',
      name: 'Homemade Snacks & Sweets',
      parent_id: null,
      show_on_homepage: true,
      is_hero_category: true,
      homepage_order: 10,
      homepage_status: 'active',
      homepage_description: 'Tea time favourites',
    },
    {
      id: 'millets',
      slug: 'millets',
      name: 'Millets & Millet Foods',
      parent_id: null,
      show_on_homepage: true,
      is_featured_category: true,
      homepage_order: 110,
      homepage_status: 'active',
    },
    {
      id: 'pooja',
      slug: 'pooja',
      name: 'Pooja',
      parent_id: null,
      show_on_homepage: false,
      homepage_order: 200,
      homepage_status: 'active',
    },
    {
      id: 'functional',
      slug: 'functional-food-powders',
      name: 'Functional Food Powders',
      parent_id: null,
      show_on_homepage: true,
      is_featured_category: true,
      homepage_order: 90,
      homepage_status: 'draft',
    },
    {
      id: 'festive',
      slug: 'festive',
      name: 'Festival',
      parent_id: null,
      show_on_homepage: true,
      is_seasonal_category: true,
      homepage_status: 'seasonal',
      homepage_order: 15,
      seasonal_starts_at: '2099-01-01T00:00:00.000Z',
      seasonal_ends_at: '2099-12-31T00:00:00.000Z',
    },
  ];

  it('orders hero categories independently of shop tree', () => {
    const hero = listHomepageHeroCategories(cats);
    assert.equal(hero.length, 1);
    assert.equal(hero[0].id, 'snacks');
  });

  it('lists featured without draft/hidden and excludes heroes', () => {
    const featured = listHomepageFeaturedCategories(cats, 3);
    assert.deepEqual(featured.map((c) => c.id), ['millets']);
  });

  it('rejects draft and out-of-window seasonal from homepage eligibility', () => {
    assert.equal(isHomepageCategoryEligible(cats[3]), false);
    assert.equal(isHomepageCategoryEligible({ ...cats[0], homepage_status: 'hidden' }), false);
    assert.equal(isHomepageCategoryEligible(cats[4], new Date('2026-07-18')), false);
  });

  it('builds tile preview from merchandising fields', () => {
    const tile = buildHomepageTilePreview(cats[0], '/shop?category=snacks');
    assert.equal(tile.label, 'Homemade Snacks & Sweets');
    assert.equal(tile.description, 'Tea time favourites');
    assert.equal(tile.isHero, true);
  });

  it('assigns homepage_order in steps of 10', () => {
    assert.deepEqual(assignHomepageOrder(['a', 'b', 'c']), [
      { id: 'a', homepage_order: 10 },
      { id: 'b', homepage_order: 20 },
      { id: 'c', homepage_order: 30 },
    ]);
  });
});
