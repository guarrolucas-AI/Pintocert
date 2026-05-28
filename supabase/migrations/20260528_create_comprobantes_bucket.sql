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
