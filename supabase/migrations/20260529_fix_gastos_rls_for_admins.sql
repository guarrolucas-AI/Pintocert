-- Fix RLS policies for gastos_obra to allow admins to see all gastos
-- Issue: Selene Diaz and other admins couldn't see gastos from other users' obras

-- Drop existing policies
drop policy if exists "Users can view gastos for their obras" on public.gastos_obra;
drop policy if exists "Users can insert gastos for their obras" on public.gastos_obra;
drop policy if exists "Users can update gastos for their obras" on public.gastos_obra;
drop policy if exists "Users can delete gastos for their obras" on public.gastos_obra;

-- ============================================
-- NUEVA POLICY: SELECT (View)
-- ============================================
-- Admins can see all gastos
-- Regular users can only see gastos for their obras
create policy "Gastos select policy"
  on public.gastos_obra for select
  using (
    -- Admins can see everything
    (
      select rol from public.perfiles where id = auth.uid()
    ) = 'admin'
    or
    -- Users can see gastos for their own obras
    auth.uid() = (
      select created_by from public.obras where id = gastos_obra.obra_id
    )
    or
    -- Users can see gastos for obras where they created the presupuesto
    exists (
      select 1 from public.presupuestos
      where id = (select presupuesto_id from public.obras where id = gastos_obra.obra_id)
      and created_by = auth.uid()
    )
  );

-- ============================================
-- NUEVA POLICY: INSERT
-- ============================================
-- Admins and obra creators can insert
create policy "Gastos insert policy"
  on public.gastos_obra for insert
  with check (
    -- Admins can insert for any obra
    (
      select rol from public.perfiles where id = auth.uid()
    ) = 'admin'
    or
    -- Users can insert for their own obras
    auth.uid() = (
      select created_by from public.obras where id = gastos_obra.obra_id
    )
    or
    -- Users can insert for obras where they created the presupuesto
    exists (
      select 1 from public.presupuestos
      where id = (select presupuesto_id from public.obras where id = gastos_obra.obra_id)
      and created_by = auth.uid()
    )
  );

-- ============================================
-- NUEVA POLICY: UPDATE
-- ============================================
-- Admins and obra creators can update
create policy "Gastos update policy"
  on public.gastos_obra for update
  using (
    -- Admins can update any gasto
    (
      select rol from public.perfiles where id = auth.uid()
    ) = 'admin'
    or
    -- Users can update gastos for their own obras
    auth.uid() = (
      select created_by from public.obras where id = gastos_obra.obra_id
    )
    or
    -- Users can update gastos for obras where they created the presupuesto
    exists (
      select 1 from public.presupuestos
      where id = (select presupuesto_id from public.obras where id = gastos_obra.obra_id)
      and created_by = auth.uid()
    )
  );

-- ============================================
-- NUEVA POLICY: DELETE
-- ============================================
-- Admins and obra creators can delete
create policy "Gastos delete policy"
  on public.gastos_obra for delete
  using (
    -- Admins can delete any gasto
    (
      select rol from public.perfiles where id = auth.uid()
    ) = 'admin'
    or
    -- Users can delete gastos for their own obras
    auth.uid() = (
      select created_by from public.obras where id = gastos_obra.obra_id
    )
    or
    -- Users can delete gastos for obras where they created the presupuesto
    exists (
      select 1 from public.presupuestos
      where id = (select presupuesto_id from public.obras where id = gastos_obra.obra_id)
      and created_by = auth.uid()
    )
  );
