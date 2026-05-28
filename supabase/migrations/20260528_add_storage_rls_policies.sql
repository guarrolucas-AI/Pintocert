-- Add Row-Level Security policies for comprobantes_gastos bucket

-- Allow users to upload comprobantes for their obras
create policy "Users can upload comprobantes for their obras"
  on storage.objects for insert
  with check (
    bucket_id = 'comprobantes_gastos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to view comprobantes for their obras
create policy "Users can view comprobantes for their obras"
  on storage.objects for select
  using (
    bucket_id = 'comprobantes_gastos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their comprobantes
create policy "Users can delete their comprobantes"
  on storage.objects for delete
  using (
    bucket_id = 'comprobantes_gastos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
