-- General product grouping within any category (not limited to oil/ghee/honey)
alter table public.products
  add column if not exists group_sort_order integer not null default 0;

create index if not exists products_category_group_order_idx
  on public.products (category_id, group_sort_order, sort_order)
  where is_published = true;

comment on column public.products.product_group is 'Free-text group label within a category, e.g. Oils, Ghee, Rice, Millets.';
comment on column public.products.group_sort_order is 'Order of the group within a category. Lower = shown first. Same value for all products in a group.';
