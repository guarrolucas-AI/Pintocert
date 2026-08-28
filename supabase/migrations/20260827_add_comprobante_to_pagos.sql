-- Add comprobante_url column to pagos table
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS comprobante_url TEXT NULL;
