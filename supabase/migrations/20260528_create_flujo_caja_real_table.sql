-- Create flujo_caja_real table for cash flow tracking
-- Tracks monthly ingresos vs egresos for each obra

CREATE TABLE IF NOT EXISTS flujo_caja_real (
  id BIGSERIAL PRIMARY KEY,
  obra_id TEXT NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio INTEGER NOT NULL,

  -- Ingresos (from certificados)
  ingresos_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
  ingresos_certificados NUMERIC(15, 2) NOT NULL DEFAULT 0,
  ingresos_otros NUMERIC(15, 2) NOT NULL DEFAULT 0,

  -- Egresos (from gastos_obra)
  egresos_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
  egresos_materiales NUMERIC(15, 2) NOT NULL DEFAULT 0,
  egresos_mano_obra NUMERIC(15, 2) NOT NULL DEFAULT 0,
  egresos_otros NUMERIC(15, 2) NOT NULL DEFAULT 0,

  -- Saldo calculations
  saldo_mes NUMERIC(15, 2) NOT NULL DEFAULT 0,
  saldo_acumulado NUMERIC(15, 2) NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one record per obra + mes + anio
  UNIQUE(obra_id, mes, anio)
);

-- Indexes for common queries
CREATE INDEX idx_flujo_caja_real_obra_id ON flujo_caja_real(obra_id);
CREATE INDEX idx_flujo_caja_real_periodo ON flujo_caja_real(anio, mes);
CREATE INDEX idx_flujo_caja_real_obra_periodo ON flujo_caja_real(obra_id, anio, mes);

-- RLS Policies
ALTER TABLE flujo_caja_real ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view flujo_caja_real for obras they have access to
CREATE POLICY "Allow view flujo_caja_real"
  ON flujo_caja_real FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM obras
      WHERE obras.id = flujo_caja_real.obra_id
      AND (
        obras.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM perfiles
          WHERE perfiles.id = auth.uid() AND perfiles.rol IN ('admin', 'capataz')
        )
      )
    )
  );

-- Only admin can insert/update/delete (via recalculateFlujoCajaReal)
CREATE POLICY "Allow admin to manage flujo_caja_real"
  ON flujo_caja_real FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.rol = 'admin'
    )
  );
