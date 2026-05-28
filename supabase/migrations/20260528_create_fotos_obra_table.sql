-- Create fotos_obra table for construction site photo documentation
CREATE TABLE fotos_obra (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id uuid NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  foto_url text NOT NULL, -- Public URL from storage
  titulo text NOT NULL,
  descripcion text,
  fecha_foto date NOT NULL, -- When the photo was taken
  tags text[] DEFAULT '{}', -- For categorizing (frente, costado, interior, etc)
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_fotos_obra_obra_id ON fotos_obra(obra_id);
CREATE INDEX idx_fotos_obra_fecha ON fotos_obra(fecha_foto DESC);

-- Enable RLS
ALTER TABLE fotos_obra ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view fotos of obras they have access to
CREATE POLICY "Users can view fotos of their obras"
  ON fotos_obra FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM obras o
      WHERE o.id = fotos_obra.obra_id
      AND o.created_by = auth.uid()
    )
  );

-- RLS Policy: Users can insert fotos to their obras
CREATE POLICY "Users can insert fotos to their obras"
  ON fotos_obra FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM obras o
      WHERE o.id = fotos_obra.obra_id
      AND o.created_by = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- RLS Policy: Users can delete their own fotos
CREATE POLICY "Users can delete their own fotos"
  ON fotos_obra FOR DELETE
  USING (created_by = auth.uid());

-- RLS Policy: Users can update their own fotos
CREATE POLICY "Users can update their own fotos"
  ON fotos_obra FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
