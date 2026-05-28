-- Catálogo multi-fornecedor: suppliers, products, storage, RLS

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null unique,
  name text not null,
  logo_url text,
  phone text,
  whatsapp text,
  instagram text,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  code text not null,
  description text not null,
  stock integer not null default 0 check (stock >= 0),
  price numeric(12, 2) not null check (price >= 0),
  image_url text,
  created_at timestamptz not null default now()
);

create index products_supplier_id_idx on public.products (supplier_id);
create index suppliers_slug_idx on public.suppliers (slug);

alter table public.suppliers enable row level security;
alter table public.products enable row level security;

-- suppliers
create policy "suppliers_public_select"
  on public.suppliers
  for select
  to anon, authenticated
  using (true);

create policy "suppliers_owner_update"
  on public.suppliers
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- products (SELECT required for UPDATE policies)
create policy "products_public_select"
  on public.products
  for select
  to anon, authenticated
  using (true);

create policy "products_owner_insert"
  on public.products
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.suppliers s
      where s.id = supplier_id and s.user_id = auth.uid()
    )
  );

create policy "products_owner_update"
  on public.products
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.suppliers s
      where s.id = supplier_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.suppliers s
      where s.id = supplier_id and s.user_id = auth.uid()
    )
  );

create policy "products_owner_delete"
  on public.products
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.suppliers s
      where s.id = supplier_id and s.user_id = auth.uid()
    )
  );

-- Novo usuário Auth → cria loja (slug/name no cadastro via user_metadata)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_slug text;
  user_name text;
begin
  user_slug := lower(trim(coalesce(new.raw_user_meta_data ->> 'slug', '')));
  user_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(new.email, '@', 1)
  );

  if user_slug = '' then
    user_slug := regexp_replace(
      lower(split_part(new.email, '@', 1)),
      '[^a-z0-9]+',
      '-',
      'g'
    );
  end if;

  insert into public.suppliers (user_id, slug, name)
  values (new.id, user_slug, user_name);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Storage: fotos de produtos
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

create policy "product_images_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'product-images');

create policy "product_images_owner_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.suppliers s
      where s.id::text = (storage.foldername(name))[1]
        and s.user_id = auth.uid()
    )
  );

create policy "product_images_owner_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.suppliers s
      where s.id::text = (storage.foldername(name))[1]
        and s.user_id = auth.uid()
    )
  );

create policy "product_images_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.suppliers s
      where s.id::text = (storage.foldername(name))[1]
        and s.user_id = auth.uid()
    )
  );
