-- Limites de tamanho e validação no banco (camada extra contra abuso / injection em texto)

alter table public.products
  add constraint products_code_length check (char_length(code) between 1 and 50),
  add constraint products_description_length check (char_length(description) between 1 and 500),
  add constraint products_code_format check (code ~ '^[A-Za-z0-9._\-/]+$'),
  add constraint products_stock_range check (stock >= 0 and stock <= 999999),
  add constraint products_price_range check (price >= 0 and price <= 99999999);

alter table public.suppliers
  add constraint suppliers_name_length check (char_length(name) between 1 and 120),
  add constraint suppliers_slug_format check (slug ~ '^[a-z0-9-]+$');
