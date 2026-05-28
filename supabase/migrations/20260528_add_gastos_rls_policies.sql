-- Add Row-Level Security policies for gastos_obra table

-- Enable RLS if not already enabled
alter table public.gastos_obra enable row level security;

-- Allow users to view gastos for their obras
create policy "Users can view gastos for their obras"
  on public.gastos_obra for select
  using (
    auth.uid() = (
      select created_by from public.obras where id = gastos_obra.obra_id
    )
    or
    exists (
      select 1 from public.presupuestos
      where id = (select presupuesto_id from public.obras where id = gastos_obra.obra_id)
      and created_by = auth.uid()
    )
  );

-- Allow users to insert gastos for their obras
create policy "Users can insert gastos for their obras"
  on public.gastos_obra for insert
  with check (
    auth.uid() = (
      select created_by from public.obras where id = gastos_obra.obra_id
    )
    or
    exists (
      select 1 from public.presupuestos
      where id = (select presupuesto_id from public.obras where id = gastos_obra.obra_id)
      and created_by = auth.uid()
    )
  );

-- Allow users to update gastos for their obras
create policy "Users can update gastos for their obras"
  on public.gastos_obra for update
  using (
    auth.uid() = (
      select created_by from public.obras where id = gastos_obra.obra_id
    )
    or
    exists (
      select 1 from public.presupuestos
      where id = (select presupuesto_id from public.obras where id = gastos_obra.obra_id)
      and created_by = auth.uid()
    )
  );

-- Allow users to delete gastos for their obras
create policy "Users can delete gastos for their obras"
  on public.gastos_obra for delete
  using (
    auth.uid() = (
      select created_by from public.obras where id = gastos_obra.obra_id
    )
    or
    exists (
      select 1 from public.presupuestos
      where id = (select presupuesto_id from public.obras where id = gastos_obra.obra_id)
      and created_by = auth.uid()
    )
  );

-- Also enable RLS for categorias_gasto_personalizado
alter table public.categorias_gasto_personalizado enable row level security;

-- Users can only see their own custom categories
create policy "Users can view own categories"
  on public.categorias_gasto_personalizado for select
  using (auth.uid() = user_id);

-- Users can only insert their own categories
create policy "Users can insert own categories"
  on public.categorias_gasto_personalizado for insert
  with check (auth.uid() = user_id);

-- Users can only delete their own categories
create policy "Users can delete own categories"
  on public.categorias_gasto_personalizado for delete
  using (auth.uid() = user_id);
