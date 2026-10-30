WITH rates AS (
  SELECT slug, invoice_per_kg, round(invoice_per_kg * 2) AS new_sell
  FROM (VALUES
    ('yureka-foxtail', 64),
    ('yureka-kodo', 68),
    ('yureka-white-sorghum', 42),
    ('yureka-ragi', 50),
    ('yureka-barnyard-sdr', 112.5),
    ('yureka-little-sdr', 109.5),
    ('yureka-foxtail-flour-sdr', 87.5),
    ('yureka-ragi-flour-sdr', 73.5),
    ('yureka-mm-flour-sdr', 104.5),
    ('yureka-pearl-flour-dr', 59.5),
    ('yureka-wsorghum-flour-dr', 59.5),
    ('yureka-mm-healthmix', 176.5),
    ('yureka-ragi-malt', 176.5),
    ('yureka-jaggery-powder', 55),
    ('yureka-jaggery-balls', 55),
    ('yureka-red-rice', 59),
    ('yureka-matta-rice', 56),
    ('yureka-idly-rice', 46),
    ('yureka-kaikuttal-rice', 57),
    ('yureka-kattuyanam-rice', 91.5),
    ('yureka-karungurvai-rice', 91.5),
    ('yureka-black-rice', 107.5),
    ('yureka-foxtail-noodles', 41),
    ('yureka-ragi-noodles', 41),
    ('yureka-mm-noodles', 41),
    ('yureka-ragi-pasta', 42),
    ('yureka-mm-pasta', 42),
    ('yureka-ragi-rava', 76.5),
    ('yureka-mm-dosa-mix', 107.5),
    ('yureka-mm-chapati-sdr', 106.5)
  ) AS v(slug, invoice_per_kg)
)
UPDATE public.products p
SET
  price = r.new_sell,
  quick_variants = (
    SELECT jsonb_agg(
      CASE
        WHEN v->>'label' = '__yasvik_pricing__' THEN
          jsonb_set(
            v,
            '{notes}',
            to_jsonb(
              json_build_object(
                'selling_price_per_kg', r.new_sell::text,
                'price_inflate_percent', '',
                'small_pack_margin_rs', '10',
                'invoice_per_kg', r.invoice_per_kg::text,
                'invoice_ref', 'Yureka-4717'
              )::text
            )
          )
        WHEN COALESCE((v->>'pack_kg')::numeric, 1) >= 1 THEN
          jsonb_set(v, '{price}', to_jsonb(round(r.new_sell * (v->>'pack_kg')::numeric)))
        ELSE
          jsonb_set(v, '{price}', to_jsonb(round(r.new_sell * (v->>'pack_kg')::numeric + 10)))
      END
      ORDER BY ord
    )
    FROM jsonb_array_elements(p.quick_variants) WITH ORDINALITY AS t(v, ord)
  ),
  short_description = regexp_replace(
    p.short_description,
    'Invoice ₹[0-9.]+/kg · Sell ₹[0-9.]+/kg',
    'Invoice ₹' || r.invoice_per_kg::text || '/kg · Sell ₹' || r.new_sell::text || '/kg'
  ),
  updated_at = now()
FROM rates r
WHERE p.slug = r.slug;
len 2350
