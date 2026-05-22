-- =====================
-- TABLA: presupuestos
-- =====================
create table public.presupuestos (
  id uuid default uuid_generate_v4() primary key,
  estado text not null default 'borrador'
    check (estado in ('borrador', 'pendiente', 'aprobado', 'rechazado')),

  -- Cliente
  cliente text not null default '',
  cliente_email text,
  cliente_telefono text,

  -- Obra
  obra_descripcion text not null default '',
  obra_direccion text not null default '',
  obra_localidad text not null default '',
  obra_provincia text not null default 'Buenos Aires',

  -- Items y financiero
  items jsonb not null default '[]',
  iva_porcentaje numeric(5,2) default 21,
  subtotal numeric(15,2) default 0,
  monto_iva numeric(15,2) default 0,
  total numeric(15,2) default 0,
  validez_dias integer default 30,
  notas text,

  -- Datos generados por IA (jsonb)
  lista_materiales jsonb,
  plan_personal jsonb,
  herramientas_seguridad jsonb,
  analisis_economico jsonb,

  -- Al aprobar: se genera la obra
  obra_id uuid references public.obras(id),
  fecha_aprobacion timestamptz,
  plan_ejecucion jsonb,

  -- Auth
  created_by uuid references public.perfiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================
-- TABLA: historial de chat con el agente por módulo
-- =====================
create table public.presupuesto_mensajes (
  id uuid default uuid_generate_v4() primary key,
  presupuesto_id uuid references public.presupuestos(id) on delete cascade not null,
  modulo text not null
    check (modulo in ('presupuesto', 'materiales', 'personal', 'herramientas', 'analisis')),
  messages jsonb not null default '[]',
  updated_at timestamptz default now(),
  unique (presupuesto_id, modulo)
);

-- =====================
-- TRIGGER updated_at
-- =====================
create trigger presupuestos_updated_at
  before update on public.presupuestos
  for each row execute function public.set_updated_at();

-- =====================
-- ROW LEVEL SECURITY
-- =====================
alter table public.presupuestos enable row level security;
alter table public.presupuesto_mensajes enable row level security;

create policy "presupuestos_select" on public.presupuestos
  for select using (auth.role() = 'authenticated');

create policy "presupuestos_insert" on public.presupuestos
  for insert with check (
    exists (select 1 from public.perfiles where id = auth.uid() and rol in ('admin', 'capataz'))
  );

create policy "presupuestos_update" on public.presupuestos
  for update using (
    exists (select 1 from public.perfiles where id = auth.uid() and rol in ('admin', 'capataz'))
  );

create policy "mensajes_all" on public.presupuesto_mensajes
  for all using (auth.role() = 'authenticated');
