-- Bandeja del puente WhatsApp -> Oficina de agentes (PC de Lucas).
-- Soy Flip guarda acá los mensajes de Lucas que empiezan con "oficina";
-- la PC los retira (polling con secreto) y devuelve la respuesta por /api/whatsapp/office/reply.
CREATE TABLE IF NOT EXISTS office_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_number TEXT NOT NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'tomado', 'respondido')),
  reply TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  taken_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS office_inbox_status_idx ON office_inbox (status, created_at);

-- Solo el service role (endpoints del servidor) accede: RLS activo y sin políticas públicas
ALTER TABLE office_inbox ENABLE ROW LEVEL SECURITY;
