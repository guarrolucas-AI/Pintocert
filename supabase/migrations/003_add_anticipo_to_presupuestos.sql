-- =====================
-- ADD anticipo COLUMN
-- =====================

alter table public.presupuestos add column anticipo numeric(15,2);

-- Set default value as 35% of total for existing records
update public.presupuestos
set anticipo = total * 0.35
where anticipo is null;
