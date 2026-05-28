-- Restore obras.estado column that was accidentally deleted
-- This column is critical for tracking obra state: borrador, en_ejecucion, pausado, terminado

-- First, create the enum type if it doesn't exist
do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_obra') then
    create type public.estado_obra as enum (
      'borrador',
      'en_ejecucion',
      'pausado',
      'terminado'
    );
  end if;
end $$;

-- Add estado column back to obras table
alter table public.obras
add column if not exists estado public.estado_obra default 'en_ejecucion'::public.estado_obra;

-- Now recreate the obras_avance view
create or replace view public.obras_avance as
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
