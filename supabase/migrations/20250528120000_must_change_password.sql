-- Primeiro login: obrigar troca de senha

alter table public.suppliers
  add column if not exists must_change_password boolean not null default false;

comment on column public.suppliers.must_change_password is
  'Quando true, o fornecedor deve definir nova senha no primeiro acesso.';

-- Novos cadastros via Auth já nascem com troca obrigatória
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

  insert into public.suppliers (user_id, slug, name, must_change_password)
  values (new.id, user_slug, user_name, true);

  return new;
end;
$$;
