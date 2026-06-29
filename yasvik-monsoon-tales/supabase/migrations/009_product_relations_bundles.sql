-- Product cross-sell relations and curated bundle collections

create table if not exists public.product_related (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  related_product_id uuid not null references public.products(id) on delete cascade,
  relation_type text not null check (
    relation_type in ('frequently_bought', 'complete_basket', 'similar', 'recipe_pairing')
  ),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_related_unique unique (product_id, related_product_id, relation_type),
  constraint product_related_not_self check (product_id <> related_product_id)
);

create index if not exists product_related_product_type_idx
  on public.product_related (product_id, relation_type, sort_order)
  where is_active = true;

create table if not exists public.product_bundles (
  id uuid primary key default gen_random_uuid(),
  bundle_name text not null,
  bundle_slug text not null unique,
  bundle_description text,
  bundle_type text not null default 'curated',
  display_locations text[] not null default '{home,category,cart,product}',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_bundles_active_sort_idx
  on public.product_bundles (sort_order, bundle_name)
  where is_active = true;

create table if not exists public.product_bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.product_bundles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sort_order integer not null default 0,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  constraint product_bundle_items_unique unique (bundle_id, product_id)
);

create index if not exists product_bundle_items_bundle_idx
  on public.product_bundle_items (bundle_id, sort_order);

alter table public.product_related enable row level security;
alter table public.product_bundles enable row level security;
alter table public.product_bundle_items enable row level security;

drop policy if exists product_related_public_read on public.product_related;
create policy product_related_public_read on public.product_related
  for select using (is_active = true);

drop policy if exists product_bundles_public_read on public.product_bundles;
create policy product_bundles_public_read on public.product_bundles
  for select using (is_active = true);

drop policy if exists product_bundle_items_public_read on public.product_bundle_items;
create policy product_bundle_items_public_read on public.product_bundle_items
  for select using (
    exists (
      select 1 from public.product_bundles b
      where b.id = bundle_id and b.is_active = true
    )
  );
