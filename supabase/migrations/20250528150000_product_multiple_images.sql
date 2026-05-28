-- Várias fotos por produto (substitui image_url única)

alter table public.products
  add column if not exists image_urls text[] not null default '{}';

update public.products
set image_urls = array[image_url]
where image_url is not null
  and trim(image_url) <> ''
  and (image_urls is null or image_urls = '{}');

alter table public.products
  drop column if exists image_url;

alter table public.products
  drop constraint if exists products_image_urls_max;

alter table public.products
  add constraint products_image_urls_max check (cardinality(image_urls) <= 10);
