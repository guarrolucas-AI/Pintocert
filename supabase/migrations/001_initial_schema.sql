-- Habilitar UUID
create extension if not exists "uuid-ossp";

-- =====================
-- TABLA: perfiles de usuario
-- =====================
create table public.perfiles (
  id uuid references auth.users on delete cascade primary key,
  nombre text not null,
  email text not null,
  rol text not null check (rol in ('admin', 'capataz', 'operario')),
  created_at timestamptz default now()
);

-- =====================
-- TABLA: obras
-- =====================
create table public.obras (
  id uuid default uuid_generate_v4() primary key,
  nombre text not null,
  direccion text not null,
  cliente text not null,
  presupuesto_total numeric(15,2) not null default 0,
  fecha_inicio date,
  estado text not null default 'activo' check (estado in ('activo', 'pausado', 'terminado')),
  notas text,
  created_by uuid references public.perfiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================
-- TABLA: items_obra
-- =====================
create table public.items_obra (
  id uuid default uuid_generate_v4() primary key,
  obra_id uuid references public.obras(id) on delete cascade not null,
  descripcion text not null,
  presupuesto numeric(15,2) not null default 0,
  orden integer not null default 0,
  created_at timestamptz default now()
);

-- =====================
-- TABLA: certificados
-- =====================
create table public.certificados (
  id uuid default uuid_generate_v4() primary key,
  obra_id uuid references public.obras(id) on delete cascade not null,
  numero integer not null,
  fecha_medicion date not null,
  periodo_mes integer not null check (periodo_mes between 1 and 12),
  periodo_anio integer not null,
  estado text not null default 'borrador' check (estado in ('borrador', 'aprobado')),
  notas text,
  created_by uuid references public.perfiles(id),
  created_at timestamptz default now(),
  unique (obra_id, numero)
);

-- =====================
-- TABLA: certificado_items
-- =====================
create table public.certificado_items (
  id uuid default uuid_generate_v4() primary key,
  certificado_id uuid references public.certificados(id) on delete cascade not null,
  item_id uuid references public.items_obra(id) on delete cascade not null,
  pct_acumulado_anterior numeric(5,2) not null default 0,
  pct_periodo numeric(5,2) not null default 0 check (pct_periodo >= 0 and pct_periodo <= 100),
  pct_acumulado_total numeric(5,2) not null default 0 check (pct_acumulado_total <= 100),
  importe_periodo numeric(15,2) not null default 0,
  importe_acumulado_anterior numeric(15,2) not null default 0,
  importe_acumulado_total numeric(15,2) not null default 0,
  unique (certificado_id, item_id)
);

-- =====================
-- VISTAS ÚTILES
-- =====================

create view public.obras_avance as
select
  o.id as obra_id,
  o.nombre,
  o.direccion,
  o.cliente,
  o.presupuesto_total,
  o.fecha_inicio,
  o.estado,
  o.notas,
  o.created_by,
  o.created_at,
  o.updated_at,
  coalesce(
    (
      select sum(ci.importe_acumulado_total)
      from public.certificado_items ci
      join public.certificados c on c.id = ci.certificado_id
      join public.items_obra io on io.id = ci.item_id
      where c.obra_id = o.id
        and c.estado = 'aprobado'
        and c.numero = (
          select max(c2.numero) from public.certificados c2
          where c2.obra_id = o.id and c2.estado = 'aprobado'
        )
    ), 0
  ) as ejecutado_total,
  (
    select count(*) from public.certificados c where c.obra_id = o.id
  ) as total_certificados
from public.obras o;

-- =====================
-- ROW LEVEL SECURITY
-- =====================
alter table public.perfiles enable row level security;
alter table public.obras enable row level security;
alter table public.items_obra enable row level security;
alter table public.certificados enable row level security;
alter table public.certificado_items enable row level security;

create policy "perfil_propio" on public.perfiles
  for all using (auth.uid() = id);

create policy "obras_select" on public.obras
  for select using (auth.role() = 'authenticated');

create policy "obras_insert" on public.obras
  for insert with check (
    exists (select 1 from public.perfiles where id = auth.uid() and rol in ('admin', 'capataz'))
  );

create policy "obras_update" on public.obras
  for update using (
    exists (select 1 from public.perfiles where id = auth.uid() and rol in ('admin', 'capataz'))
  );

create policy "items_select" on public.items_obra for select using (auth.role() = 'authenticated');
create policy "items_write" on public.items_obra for all using (
  exists (select 1 from public.perfiles where id = auth.uid() and rol in ('admin', 'capataz'))
);

create policy "certs_select" on public.certificados for select using (auth.role() = 'authenticated');
create policy "certs_insert" on public.certificados for insert with check (
  exists (select 1 from public.perfiles where id = auth.uid() and rol in ('admin', 'capataz'))
);
create policy "certs_update" on public.certificados for update using (
  exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin')
    or (
      exists (select 1 from public.perfiles where id = auth.uid() and rol = 'capataz')
      and estado = 'borrador'
    )
);

create policy "cert_items_all" on public.certificado_items for all using (auth.role() = 'authenticated');

-- =====================
-- FUNCIÓN: auto-número de certificado
-- =====================
create or replace function public.next_cert_numero(p_obra_id uuid)
returns integer language sql as $$
  select coalesce(max(numero), 0) + 1
  from public.certificados
  where obra_id = p_obra_id;
$$;

-- =====================
-- TRIGGER: updated_at automático en obras
-- =====================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger obras_updated_at
  before update on public.obras
  for each row execute function public.set_updated_at();

-- =====================
-- DATOS DE PRUEBA
-- =====================

-- Nota: reemplazar <TU_USER_ID> con el UUID de auth.users del primer usuario creado
-- O ejecutar la parte de datos de prueba por separado desde el SQL editor
-- después de crear tu primer usuario con magic link.

-- Descomenta y adapta según necesidad:
/*
do $$
declare
  v_obra_id uuid := uuid_generate_v4();
  v_user_id uuid; -- reemplazar con tu auth user id
  i1 uuid := uuid_generate_v4();
  i2 uuid := uuid_generate_v4();
  i3 uuid := uuid_generate_v4();
  i4 uuid := uuid_generate_v4();
  i5 uuid := uuid_generate_v4();
  i6 uuid := uuid_generate_v4();
  i7 uuid := uuid_generate_v4();
  i8 uuid := uuid_generate_v4();
  c1 uuid := uuid_generate_v4();
  c2 uuid := uuid_generate_v4();
  c3 uuid := uuid_generate_v4();
begin
  select id into v_user_id from public.perfiles limit 1;

  insert into public.obras (id, nombre, direccion, cliente, presupuesto_total, fecha_inicio, estado, created_by)
  values (v_obra_id, 'Casa Palermo', 'Scalabrini Ortiz 1247, CABA', 'Inversores del Norte SA',
          4800000, '2025-01-15', 'activo', v_user_id);

  insert into public.items_obra (id, obra_id, descripcion, presupuesto, orden) values
    (i1, v_obra_id, 'Preparación de superficies', 480000, 1),
    (i2, v_obra_id, 'Pintura interior – 2 manos látex', 1200000, 2),
    (i3, v_obra_id, 'Pintura exterior – frente y contrafrente', 900000, 3),
    (i4, v_obra_id, 'Barnizado pisos de madera', 720000, 4),
    (i5, v_obra_id, 'Pintura rejas y marcos metálicos', 480000, 5),
    (i6, v_obra_id, 'Sellado de cielorrasos', 480000, 6),
    (i7, v_obra_id, 'Pintura cielorrasos – látex blanco', 300000, 7),
    (i8, v_obra_id, 'Hidrolavado y limpieza final', 240000, 8);

  insert into public.certificados (id, obra_id, numero, fecha_medicion, periodo_mes, periodo_anio, estado, created_by)
  values
    (c1, v_obra_id, 1, '2025-01-31', 1, 2025, 'aprobado', v_user_id),
    (c2, v_obra_id, 2, '2025-02-28', 2, 2025, 'aprobado', v_user_id),
    (c3, v_obra_id, 3, '2025-03-31', 3, 2025, 'aprobado', v_user_id);

  -- Cert 1: avance inicial (~25%)
  insert into public.certificado_items
    (certificado_id, item_id, pct_acumulado_anterior, pct_periodo, pct_acumulado_total,
     importe_periodo, importe_acumulado_anterior, importe_acumulado_total)
  values
    (c1, i1, 0, 80, 80, 384000, 0, 384000),
    (c1, i2, 0, 20, 20, 240000, 0, 240000),
    (c1, i3, 0, 15, 15, 135000, 0, 135000),
    (c1, i4, 0, 0,  0,  0,      0, 0),
    (c1, i5, 0, 0,  0,  0,      0, 0),
    (c1, i6, 0, 30, 30, 144000, 0, 144000),
    (c1, i7, 0, 0,  0,  0,      0, 0),
    (c1, i8, 0, 0,  0,  0,      0, 0);

  -- Cert 2: acumulado ~55%
  insert into public.certificado_items
    (certificado_id, item_id, pct_acumulado_anterior, pct_periodo, pct_acumulado_total,
     importe_periodo, importe_acumulado_anterior, importe_acumulado_total)
  values
    (c2, i1, 80, 20, 100, 96000,  384000, 480000),
    (c2, i2, 20, 50, 70,  600000, 240000, 840000),
    (c2, i3, 15, 40, 55,  360000, 135000, 495000),
    (c2, i4, 0,  40, 40,  288000, 0,      288000),
    (c2, i5, 0,  50, 50,  240000, 0,      240000),
    (c2, i6, 30, 40, 70,  192000, 144000, 336000),
    (c2, i7, 0,  40, 40,  120000, 0,      120000),
    (c2, i8, 0,  0,  0,   0,      0,      0);

  -- Cert 3: acumulado ~80%
  insert into public.certificado_items
    (certificado_id, item_id, pct_acumulado_anterior, pct_periodo, pct_acumulado_total,
     importe_periodo, importe_acumulado_anterior, importe_acumulado_total)
  values
    (c3, i1, 100, 0,  100, 0,      480000,  480000),
    (c3, i2, 70,  30, 100, 360000, 840000,  1200000),
    (c3, i3, 55,  35, 90,  315000, 495000,  810000),
    (c3, i4, 40,  40, 80,  288000, 288000,  576000),
    (c3, i5, 50,  30, 80,  144000, 240000,  384000),
    (c3, i6, 70,  30, 100, 144000, 336000,  480000),
    (c3, i7, 40,  40, 80,  120000, 120000,  240000),
    (c3, i8, 0,   0,  0,   0,      0,       0);
end $$;
*/
