-- Modo 26 - Seguridad RLS para Supabase
-- Ejecutar una sola vez desde SQL Editor después de crear las tablas.

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Elimina versiones anteriores para que el script pueda ejecutarse nuevamente.
drop policy if exists "Catalogo publico visible" on public.products;
drop policy if exists "Administracion consulta productos" on public.products;
drop policy if exists "Administracion crea productos" on public.products;
drop policy if exists "Administracion actualiza productos" on public.products;
drop policy if exists "Administracion elimina productos" on public.products;
drop policy if exists "Visitantes crean pedidos" on public.orders;
drop policy if exists "Administracion consulta pedidos" on public.orders;
drop policy if exists "Administracion actualiza pedidos" on public.orders;
drop policy if exists "Visitantes agregan prendas al pedido" on public.order_items;
drop policy if exists "Administracion consulta prendas pedidas" on public.order_items;

-- PRODUCTS
-- El público solo ve prendas marcadas como visibles.
create policy "Catalogo publico visible"
on public.products for select
to anon
using (is_visible = true);

-- La administradora autenticada puede ver incluso productos ocultos.
create policy "Administracion consulta productos"
on public.products for select
to authenticated
using (true);

create policy "Administracion crea productos"
on public.products for insert
to authenticated
with check (true);

create policy "Administracion actualiza productos"
on public.products for update
to authenticated
using (true)
with check (true);

create policy "Administracion elimina productos"
on public.products for delete
to authenticated
using (true);

-- ORDERS
-- El visitante puede registrar una solicitud con el estado inicial definido.
create policy "Visitantes crean pedidos"
on public.orders for insert
to anon, authenticated
with check (
  status = 'Solicitud recibida'
  and subtotal >= 0
  and delivery_cost >= 0
  and total = subtotal + delivery_cost
);

-- Solo una sesión administrativa puede consultar o actualizar pedidos.
create policy "Administracion consulta pedidos"
on public.orders for select
to authenticated
using (true);

create policy "Administracion actualiza pedidos"
on public.orders for update
to authenticated
using (true)
with check (true);

-- ORDER_ITEMS
-- El visitante puede agregar las prendas pertenecientes al pedido que registra.
create policy "Visitantes agregan prendas al pedido"
on public.order_items for insert
to anon, authenticated
with check (
  quantity > 0
  and unit_price >= 0
  and line_total = quantity * unit_price
);

create policy "Administracion consulta prendas pedidas"
on public.order_items for select
to authenticated
using (true);

-- STORAGE: bucket products
-- El bucket es público para lectura. Solo usuarios autenticados administran archivos.
drop policy if exists "Administracion sube imagenes de productos" on storage.objects;
drop policy if exists "Administracion actualiza imagenes de productos" on storage.objects;
drop policy if exists "Administracion elimina imagenes de productos" on storage.objects;

create policy "Administracion sube imagenes de productos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'products');

create policy "Administracion actualiza imagenes de productos"
on storage.objects for update
to authenticated
using (bucket_id = 'products')
with check (bucket_id = 'products');

create policy "Administracion elimina imagenes de productos"
on storage.objects for delete
to authenticated
using (bucket_id = 'products');
