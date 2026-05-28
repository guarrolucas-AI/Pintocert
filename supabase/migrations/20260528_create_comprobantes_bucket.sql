-- Create storage bucket for gastos comprobantes

-- Create the bucket
insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
values (
  'comprobantes_gastos',
  'comprobantes_gastos',
  false,
  false,
  10485760, -- 10MB limit
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Enable RLS on the bucket
alter table storage.objects enable row level security;

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
