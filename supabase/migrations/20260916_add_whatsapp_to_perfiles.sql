-- Allow matching incoming WhatsApp messages to a user profile
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT NULL UNIQUE;
CREATE INDEX IF NOT EXISTS idx_perfiles_whatsapp ON perfiles(whatsapp_number);
