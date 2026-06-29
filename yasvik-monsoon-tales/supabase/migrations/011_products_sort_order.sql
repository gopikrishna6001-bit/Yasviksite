-- Manual sort order + product type grouping (oil → ghee → honey within a category)
alter table public.products
  add column if not exists sort_order integer not null default 0;

alter table public.products
  add column if not exists product_group text;

create index if not exists products_published_sort_idx
  on public.products (sort_order asc, created_at desc)
  where is_published = true;

create index if not exists products_category_group_sort_idx
  on public.products (category_id, product_group, sort_order)
  where is_published = true;

comment on column public.products.sort_order is 'Lower numbers appear first in shop and featured carousel.';
comment on column public.products.product_group is 'Optional grouping: oil, ghee, honey, other. Controls order within a category.';
