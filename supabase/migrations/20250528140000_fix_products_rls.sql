-- Corrige RLS de products e storage (erro ao inserir produto / enviar foto)

-- Função auxiliar (security definer) evita falha na checagem de dono
create or replace function public.is_supplier_owner(p_supplier_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.suppliers
    where id = p_supplier_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_supplier_owner(uuid) from public;
grant execute on function public.is_supplier_owner(uuid) to authenticated;

-- Permissões explícitas (alguns projetos não herdam GRANT padrão)
grant select on table public.suppliers to anon, authenticated;
grant update on table public.suppliers to authenticated;

grant select on table public.products to anon, authenticated;
grant insert, update, delete on table public.products to authenticated;

-- Products: políticas com função auxiliar
drop policy if exists "products_owner_insert" on public.products;
drop policy if exists "products_owner_update" on public.products;
drop policy if exists "products_owner_delete" on public.products;

create policy "products_owner_insert"
  on public.products
  for insert
  to authenticated
  with check (public.is_supplier_owner(supplier_id));

create policy "products_owner_update"
  on public.products
  for update
  to authenticated
  using (public.is_supplier_owner(supplier_id))
  with check (public.is_supplier_owner(supplier_id));

create policy "products_owner_delete"
  on public.products
  for delete
  to authenticated
  using (public.is_supplier_owner(supplier_id));

-- Storage: pasta = supplier_id (uuid)
drop policy if exists "product_images_owner_insert" on storage.objects;
drop policy if exists "product_images_owner_update" on storage.objects;
drop policy if exists "product_images_owner_delete" on storage.objects;

create policy "product_images_owner_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and public.is_supplier_owner(
      (nullif((storage.foldername(name))[1], ''))::uuid
    )
  );

create policy "product_images_owner_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_supplier_owner(
      (nullif((storage.foldername(name))[1], ''))::uuid
    )
  );

create policy "product_images_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_supplier_owner(
      (nullif((storage.foldername(name))[1], ''))::uuid
    )
  );
