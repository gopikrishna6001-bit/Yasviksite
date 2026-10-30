import { supabase } from '@/api/supabaseClient';
import { orderProductsByIds } from '@/lib/productRelationUtils';

async function fetchProductIdsFromV2Rows(groups = [], giftRules = []) {
  const ids = new Set();
  for (const group of groups) {
    for (const choice of group.choices || []) {
      for (const item of choice.items || []) {
        if (item.product_id) ids.add(item.product_id);
      }
      for (const gift of choice.gift_rules || []) {
        if (gift.product_id) ids.add(gift.product_id);
      }
    }
  }
  for (const gift of giftRules) {
    if (gift.product_id) ids.add(gift.product_id);
  }
  return [...ids];
}

export async function fetchComboV2Structures(bundleIds = []) {
  const uniqueIds = [...new Set((bundleIds || []).filter(Boolean))];
  if (!uniqueIds.length) {
    return {
      groupsByBundleId: new Map(),
      giftsByBundleId: new Map(),
      giftsByChoiceId: new Map(),
    };
  }

  const { data: groups, error: groupsError } = await supabase
    .from('combo_option_groups')
    .select('id, bundle_id, label, sort_order, is_required')
    .in('bundle_id', uniqueIds)
    .order('sort_order', { ascending: true });

  if (groupsError) {
    console.warn('[comboV2] option groups fetch failed', groupsError.message);
    return {
      groupsByBundleId: new Map(),
      giftsByBundleId: new Map(),
      giftsByChoiceId: new Map(),
    };
  }

  const groupIds = (groups || []).map((row) => row.id);
  let choices = [];
  if (groupIds.length) {
    const { data, error } = await supabase
      .from('combo_option_choices')
      .select('*')
      .in('group_id', groupIds)
      .order('sort_order', { ascending: true });
    if (error) console.warn('[comboV2] option choices fetch failed', error.message);
    choices = data || [];
  }

  const choiceIds = choices.map((row) => row.id);
  let choiceItems = [];
  if (choiceIds.length) {
    const { data, error } = await supabase
      .from('combo_option_choice_items')
      .select('*')
      .in('choice_id', choiceIds)
      .order('sort_order', { ascending: true });
    if (error) console.warn('[comboV2] choice items fetch failed', error.message);
    choiceItems = data || [];
  }

  const { data: bundleGifts, error: bundleGiftsError } = await supabase
    .from('combo_gift_rules')
    .select('*')
    .in('bundle_id', uniqueIds)
    .eq('is_enabled', true)
    .order('sort_order', { ascending: true });

  if (bundleGiftsError) {
    console.warn('[comboV2] bundle gift rules fetch failed', bundleGiftsError.message);
  }

  let choiceGifts = [];
  if (choiceIds.length) {
    const { data, error } = await supabase
      .from('combo_gift_rules')
      .select('*')
      .in('choice_id', choiceIds)
      .eq('is_enabled', true)
      .order('sort_order', { ascending: true });
    if (error) console.warn('[comboV2] choice gift rules fetch failed', error.message);
    choiceGifts = data || [];
  }

  const itemsByChoiceId = new Map();
  for (const row of choiceItems) {
    if (!itemsByChoiceId.has(row.choice_id)) itemsByChoiceId.set(row.choice_id, []);
    itemsByChoiceId.get(row.choice_id).push(row);
  }

  const giftsByChoiceId = new Map();
  for (const row of choiceGifts) {
    if (!giftsByChoiceId.has(row.choice_id)) giftsByChoiceId.set(row.choice_id, []);
    giftsByChoiceId.get(row.choice_id).push(row);
  }

  const choicesByGroupId = new Map();
  for (const choice of choices) {
    const hydrated = {
      ...choice,
      items: itemsByChoiceId.get(choice.id) || [],
      gift_rules: giftsByChoiceId.get(choice.id) || [],
    };
    if (!choicesByGroupId.has(choice.group_id)) choicesByGroupId.set(choice.group_id, []);
    choicesByGroupId.get(choice.group_id).push(hydrated);
  }

  const groupsByBundleId = new Map();
  for (const group of groups || []) {
    const hydrated = {
      ...group,
      choices: choicesByGroupId.get(group.id) || [],
    };
    if (!groupsByBundleId.has(group.bundle_id)) groupsByBundleId.set(group.bundle_id, []);
    groupsByBundleId.get(group.bundle_id).push(hydrated);
  }

  const giftsByBundleId = new Map();
  for (const row of bundleGifts || []) {
    if (!giftsByBundleId.has(row.bundle_id)) giftsByBundleId.set(row.bundle_id, []);
    giftsByBundleId.get(row.bundle_id).push(row);
  }

  return { groupsByBundleId, giftsByBundleId, giftsByChoiceId };
}

export async function attachComboV2ToBundles(bundles = [], fetchProductsByIds) {
  if (!bundles.length) return bundles;
  const bundleIds = bundles.map((row) => row.id).filter(Boolean);
  const v2 = await fetchComboV2Structures(bundleIds);

  const extraProductIds = [];
  for (const bundleId of bundleIds) {
    const groups = v2.groupsByBundleId.get(bundleId) || [];
    const gifts = v2.giftsByBundleId.get(bundleId) || [];
    extraProductIds.push(...await fetchProductIdsFromV2Rows(groups, gifts));
  }

  const existingIds = new Set(
    bundles.flatMap((bundle) => [
      ...(bundle.product_ids || []),
      ...(bundle.items || []).map((row) => row.product_id),
    ]),
  );
  const missingIds = [...new Set(extraProductIds.filter((id) => !existingIds.has(id)))];
  const extraProducts = missingIds.length ? await fetchProductsByIds(missingIds) : [];
  const extraById = new Map(extraProducts.map((row) => [row.id, row]));

  return bundles.map((bundle) => {
    const option_groups = v2.groupsByBundleId.get(bundle.id) || [];
    const gift_rules = v2.giftsByBundleId.get(bundle.id) || [];
    const mergedProducts = orderProductsByIds(
      [
        ...(bundle.products || []),
        ...missingIds.map((id) => extraById.get(id)).filter(Boolean),
      ],
      [...(bundle.product_ids || []), ...missingIds],
    );
    return {
      ...bundle,
      option_groups,
      gift_rules,
      has_customer_options: Boolean(bundle.has_customer_options || option_groups.length),
      products: mergedProducts,
      product_ids: mergedProducts.map((row) => row.id),
    };
  });
}

export async function saveComboV2Structures({
  bundleId,
  optionGroups = [],
  giftRules = [],
} = {}) {
  if (!bundleId) throw new Error('bundleId is required');

  const { error: clearGroupsError } = await supabase
    .from('combo_option_groups')
    .delete()
    .eq('bundle_id', bundleId);
  if (clearGroupsError) throw clearGroupsError;

  const { error: clearBundleGiftsError } = await supabase
    .from('combo_gift_rules')
    .delete()
    .eq('bundle_id', bundleId);
  if (clearBundleGiftsError) throw clearBundleGiftsError;

  for (const [groupIndex, group] of (optionGroups || []).entries()) {
    const { data: savedGroup, error: groupError } = await supabase
      .from('combo_option_groups')
      .insert({
        bundle_id: bundleId,
        label: group.label,
        sort_order: Number(group.sort_order ?? groupIndex),
        is_required: group.is_required !== false,
      })
      .select('*')
      .single();
    if (groupError) throw groupError;

    for (const [choiceIndex, choice] of (group.choices || []).entries()) {
      const { data: savedChoice, error: choiceError } = await supabase
        .from('combo_option_choices')
        .insert({
          group_id: savedGroup.id,
          label: choice.label,
          slug: choice.slug,
          sort_order: Number(choice.sort_order ?? choiceIndex),
          is_default: choice.is_default === true,
          description: choice.description || null,
          hero_image_url: choice.hero_image_url || null,
          gallery_urls: choice.gallery_urls || [],
          price_override_paise: choice.price_override_paise ?? null,
          net_weight_g: choice.net_weight_g ?? null,
          is_active: choice.is_active !== false,
        })
        .select('*')
        .single();
      if (choiceError) throw choiceError;

      const itemRows = (choice.items || []).map((item, itemIndex) => ({
        choice_id: savedChoice.id,
        product_id: item.product_id,
        component_variant_sku: item.component_variant_sku || null,
        component_title_snapshot: item.component_title_snapshot || null,
        quantity_value: item.quantity_value ?? null,
        quantity_unit: item.quantity_unit || 'g',
        pack_count: Math.max(1, Number(item.pack_count) || 1),
        sort_order: Number(item.sort_order ?? itemIndex),
        item_role: item.item_role || 'included',
        display_group: item.display_group || null,
        gift_worth_paise: item.gift_worth_paise ?? null,
        is_active: item.is_active !== false,
      }));
      if (itemRows.length) {
        const { error: itemsError } = await supabase
          .from('combo_option_choice_items')
          .insert(itemRows);
        if (itemsError) throw itemsError;
      }

      const choiceGiftRows = (choice.gift_rules || []).map((gift, giftIndex) => ({
        choice_id: savedChoice.id,
        product_id: gift.product_id,
        component_variant_sku: gift.component_variant_sku || null,
        quantity_value: gift.quantity_value ?? 1,
        quantity_unit: gift.quantity_unit || 'pack',
        pack_count: Math.max(1, Number(gift.pack_count) || 1),
        worth_paise: gift.worth_paise ?? null,
        campaign_name: gift.campaign_name || null,
        badge_text: gift.badge_text || 'FREE',
        show_on_card: gift.show_on_card !== false,
        show_on_pdp: gift.show_on_pdp !== false,
        show_on_checkout: gift.show_on_checkout !== false,
        is_enabled: gift.is_enabled !== false,
        sort_order: Number(gift.sort_order ?? giftIndex),
      }));
      if (choiceGiftRows.length) {
        const { error: giftsError } = await supabase
          .from('combo_gift_rules')
          .insert(choiceGiftRows);
        if (giftsError) throw giftsError;
      }
    }
  }

  const bundleGiftRows = (giftRules || []).map((gift, giftIndex) => ({
    bundle_id: bundleId,
    product_id: gift.product_id,
    component_variant_sku: gift.component_variant_sku || null,
    quantity_value: gift.quantity_value ?? 1,
    quantity_unit: gift.quantity_unit || 'pack',
    pack_count: Math.max(1, Number(gift.pack_count) || 1),
    worth_paise: gift.worth_paise ?? null,
    campaign_name: gift.campaign_name || null,
    badge_text: gift.badge_text || 'FREE',
    show_on_card: gift.show_on_card !== false,
    show_on_pdp: gift.show_on_pdp !== false,
    show_on_checkout: gift.show_on_checkout !== false,
    is_enabled: gift.is_enabled !== false,
    sort_order: Number(gift.sort_order ?? giftIndex),
  }));
  if (bundleGiftRows.length) {
    const { error: giftsError } = await supabase
      .from('combo_gift_rules')
      .insert(bundleGiftRows);
    if (giftsError) throw giftsError;
  }
}
