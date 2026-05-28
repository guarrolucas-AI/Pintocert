-- Migrate existing obras with 'activo' state to 'en_ejecucion'
-- The 'activo' enum value no longer exists in the new estado_obra enum

update public.obras
set estado = 'en_ejecucion'::public.estado_obra
where estado::text = 'activo';
