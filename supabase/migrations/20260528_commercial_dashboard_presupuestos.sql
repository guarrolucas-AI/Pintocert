-- Commercial Dashboard & Cash Flow System
-- Phase 1: Update presupuestos estado enum + create new tables

BEGIN;

-- ──────────────────────────────────────────────────────────────────────
-- 1. Update EstadoPresupuesto enum
-- ──────────────────────────────────────────────────────────────────────

-- Drop the default constraint first
ALTER TABLE presupuestos ALTER COLUMN estado DROP DEFAULT;

-- Create new enum type
CREATE TYPE estado_presupuesto_v2 AS ENUM (
  'borrador',
  'enviado_aprobacion',
  'aprobado',
  'en_ejecucion',
  'terminado',
  'pausado',
  'rechazado'
);

-- Add a temporary column with new type
ALTER TABLE presupuestos ADD COLUMN estado_new estado_presupuesto_v2;

-- Copy and map old values to new values
UPDATE presupuestos SET estado_new = CASE
  WHEN estado::text = 'borrador' THEN 'borrador'::estado_presupuesto_v2
  WHEN estado::text = 'pendiente' THEN 'enviado_aprobacion'::estado_presupuesto_v2
  WHEN estado::text = 'aprobado' THEN 'aprobado'::estado_presupuesto_v2
  WHEN estado::text = 'rechazado' THEN 'rechazado'::estado_presupuesto_v2
  ELSE 'borrador'::estado_presupuesto_v2
END;

-- Drop old column
ALTER TABLE presupuestos DROP COLUMN estado;

-- Rename new column
ALTER TABLE presupuestos RENAME COLUMN estado_new TO estado;

-- Set default and constraints
ALTER TABLE presupuestos ALTER COLUMN estado SET DEFAULT 'borrador'::estado_presupuesto_v2;
ALTER TABLE presupuestos ALTER COLUMN estado SET NOT NULL;

-- Drop old enum
DROP TYPE IF EXISTS estado_presupuesto CASCADE;

-- Rename new enum to original name
ALTER TYPE estado_presupuesto_v2 RENAME TO estado_presupuesto;

-- ──────────────────────────────────────────────────────────────────────
-- 2. Create gastos_obra table
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gastos_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
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

CREATE INDEX idx_gastos_obra_id ON gastos_obra(obra_id);
CREATE INDEX idx_gastos_fecha ON gastos_obra(fecha);
CREATE INDEX idx_gastos_categoria ON gastos_obra(categoria);
CREATE INDEX idx_gastos_created_by ON gastos_obra(created_by);

-- ──────────────────────────────────────────────────────────────────────
-- 3. Create categorias_gasto_personalizado table
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categorias_gasto_personalizado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  color_hex VARCHAR(7),
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(user_id, nombre)
);

CREATE INDEX idx_categorias_user ON categorias_gasto_personalizado(user_id);

-- ──────────────────────────────────────────────────────────────────────
-- 4. Create flujo_caja_real table
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flujo_caja_real (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio INTEGER NOT NULL CHECK (anio >= 2020),

  ingresos_total DECIMAL(15,2) DEFAULT 0,
  ingresos_certificados DECIMAL(15,2) DEFAULT 0,
  ingresos_otros DECIMAL(15,2) DEFAULT 0,

  egresos_total DECIMAL(15,2) DEFAULT 0,
  egresos_materiales DECIMAL(15,2) DEFAULT 0,
  egresos_mano_obra DECIMAL(15,2) DEFAULT 0,
  egresos_otros DECIMAL(15,2) DEFAULT 0,

  saldo_mes DECIMAL(15,2),
  saldo_acumulado DECIMAL(15,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(obra_id, mes, anio)
);

CREATE INDEX idx_flujo_real_obra ON flujo_caja_real(obra_id);
CREATE INDEX idx_flujo_real_periodo ON flujo_caja_real(anio, mes);

-- ──────────────────────────────────────────────────────────────────────
-- 5. Create flujo_caja_proyectado table
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flujo_caja_proyectado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presupuesto_id UUID NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  obra_id UUID REFERENCES obras(id),

  fecha_inicio DATE NOT NULL,

  ingresos_total DECIMAL(15,2) NOT NULL,
  ingresos_por_mes JSONB DEFAULT '[]'::jsonb,

  egresos_total DECIMAL(15,2) NOT NULL,
  egresos_por_mes JSONB DEFAULT '[]'::jsonb,

  saldo_proyectado DECIMAL(15,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_flujo_proyectado_presupuesto ON flujo_caja_proyectado(presupuesto_id);
CREATE INDEX idx_flujo_proyectado_obra ON flujo_caja_proyectado(obra_id);

-- ──────────────────────────────────────────────────────────────────────
-- 6. Create scorecards_dashboard table
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scorecards_dashboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  periodo_mes INTEGER NOT NULL CHECK (periodo_mes >= 1 AND periodo_mes <= 12),
  periodo_anio INTEGER NOT NULL CHECK (periodo_anio >= 2020),

  presupuestos_generados_cantidad INTEGER DEFAULT 0,
  presupuestos_generados_monto DECIMAL(15,2) DEFAULT 0,
  presupuestos_aprobados_cantidad INTEGER DEFAULT 0,
  presupuestos_aprobados_monto DECIMAL(15,2) DEFAULT 0,
  obras_activas_cantidad INTEGER DEFAULT 0,

  ingresos_proyectados_mes DECIMAL(15,2) DEFAULT 0,
  ingresos_reales_mes DECIMAL(15,2) DEFAULT 0,
  egresos_proyectados_mes DECIMAL(15,2) DEFAULT 0,
  egresos_reales_mes DECIMAL(15,2) DEFAULT 0,

  ganancia_proyectada_mes DECIMAL(15,2),
  ganancia_real_mes DECIMAL(15,2),
  utilidad_acumulada_anio DECIMAL(15,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(periodo_mes, periodo_anio)
);

COMMIT;
