-- Recreate obras_avance view that was accidentally deleted
-- This view is critical for dashboard and obras pages

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
