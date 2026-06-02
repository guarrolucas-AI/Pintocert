-- Contabilidad Central Module
-- Tracks company-level expenses (salaries, fuel, machinery, materials, partner withdrawals, other operational costs)

BEGIN;

-- ──────────────────────────────────────────────────────────────────────
-- 1. Create gastos_central table
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gastos_central (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_gasto VARCHAR(50) NOT NULL CHECK (tipo_gasto IN ('sueldo', 'combustible', 'maquina', 'material', 'retiro_socio', 'otro')),
  categoria VARCHAR(100) NOT NULL,
  descripcion TEXT NOT NULL,
  monto DECIMAL(15,2) NOT NULL CHECK (monto > 0),
  comprobante_numero VARCHAR(50),
  proveedor VARCHAR(255),
  comprobante_url TEXT,
  notas TEXT,
  created_by UUID NOT NULL REFERENCES perfiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CHECK (fecha <= CURRENT_DATE)
);

CREATE INDEX idx_gastos_central_tipo_gasto ON gastos_central(tipo_gasto);
CREATE INDEX idx_gastos_central_fecha ON gastos_central(fecha);
CREATE INDEX idx_gastos_central_categoria ON gastos_central(categoria);
CREATE INDEX idx_gastos_central_created_by ON gastos_central(created_by);

-- ──────────────────────────────────────────────────────────────────────
-- 2. Create categorias_gasto_central table (enterprise-wide, not per-user)
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categorias_gasto_central (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  color_hex VARCHAR(7),
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_categorias_gasto_central_nombre ON categorias_gasto_central(nombre);

-- Insert predefined central expense categories
INSERT INTO categorias_gasto_central (nombre, color_hex, activa) VALUES
  ('Sueldos', '#10B981', TRUE),
  ('Combustible', '#F59E0B', TRUE),
  ('Máquinas', '#6366F1', TRUE),
  ('Materiales', '#3B82F6', TRUE),
  ('Retiro de Socios', '#EF4444', TRUE),
  ('Otros', '#8B5CF6', TRUE)
ON CONFLICT (nombre) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────
-- 3. Create flujo_caja_central table (monthly cash flow aggregation)
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flujo_caja_central (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio INTEGER NOT NULL,
  ingresos_total DECIMAL(15,2) DEFAULT 0,
  egresos_total DECIMAL(15,2) DEFAULT 0,
  egresos_sueldo DECIMAL(15,2) DEFAULT 0,
  egresos_combustible DECIMAL(15,2) DEFAULT 0,
  egresos_maquina DECIMAL(15,2) DEFAULT 0,
  egresos_material DECIMAL(15,2) DEFAULT 0,
  egresos_retiro_socio DECIMAL(15,2) DEFAULT 0,
  egresos_otro DECIMAL(15,2) DEFAULT 0,
  saldo_mes DECIMAL(15,2) DEFAULT 0,
  saldo_acumulado DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(mes, anio)
);

CREATE INDEX idx_flujo_caja_central_periodo ON flujo_caja_central(anio, mes);

-- ──────────────────────────────────────────────────────────────────────
-- 4. Enable RLS and create policies for gastos_central
-- ──────────────────────────────────────────────────────────────────────

ALTER TABLE gastos_central ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_gasto_central ENABLE ROW LEVEL SECURITY;
ALTER TABLE flujo_caja_central ENABLE ROW LEVEL SECURITY;

-- Central expenses are viewable and modifiable by all authenticated users (simple single-tenant RLS)
CREATE POLICY "gastos_central_select" ON gastos_central
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "gastos_central_insert" ON gastos_central
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    auth.uid() IN (SELECT id FROM perfiles WHERE rol IN ('admin', 'capataz'))
  );

CREATE POLICY "gastos_central_update" ON gastos_central
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    (auth.uid() = created_by OR auth.uid() IN (SELECT id FROM perfiles WHERE rol = 'admin'))
  );

CREATE POLICY "gastos_central_delete" ON gastos_central
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    (auth.uid() = created_by OR auth.uid() IN (SELECT id FROM perfiles WHERE rol = 'admin'))
  );

-- Categories are viewable by all, modifiable only by admins
CREATE POLICY "categorias_central_select" ON categorias_gasto_central
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "categorias_central_insert" ON categorias_gasto_central
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM perfiles WHERE rol = 'admin')
  );

CREATE POLICY "categorias_central_update" ON categorias_gasto_central
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM perfiles WHERE rol = 'admin')
  );

CREATE POLICY "categorias_central_delete" ON categorias_gasto_central
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM perfiles WHERE rol = 'admin')
  );

-- Cash flow summary is viewable by all, computed internally only
CREATE POLICY "flujo_caja_central_select" ON flujo_caja_central
  FOR SELECT USING (auth.role() = 'authenticated');

COMMIT;
