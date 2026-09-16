-- Stores in-progress WhatsApp conversations for multi-step expense registration
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  whatsapp_number TEXT PRIMARY KEY,
  estado TEXT NOT NULL DEFAULT 'idle',
  gasto_pendiente JSONB,
  opciones_obra JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
