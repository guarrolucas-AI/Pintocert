-- Commercial Dashboard & Cash Flow System
-- Run this migration in Supabase SQL Editor

BEGIN;

-- ──────────────────────────────────────────────────────────────────────
-- 1. Update EstadoPresupuesto enum in presupuestos table
-- ──────────────────────────────────────────────────────────────────────

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

-- Migrate presupuestos.estado from old enum to new enum
ALTER TABLE presupuestos
  ALTER COLUMN estado TYPE estado_presupuesto_v2
  USING estado::text::estado_presupuesto_v2;

-- Drop old enum
DROP TYPE IF EXISTS estado_presupuesto CASCADE;

-- Rename new enum to original name
ALTER TYPE estado_presupuesto_v2 RENAME TO estado_presupuesto;

-- ──────────────────────────────────────────────────────────────────────
-- 2. Update EstadoObra enum in obras table
-- ──────────────────────────────────────────────────────────────────────

CREATE TYPE estado_obra_v2 AS ENUM (
  'borrador',
  'enviado_aprobacion',
  'aprobado',
  'en_ejecucion',
  'terminado',
  'pausado',
  'rechazado'
);

-- Migrate obras.estado from old enum to new enum
ALTER TABLE obras
  ALTER COLUMN estado TYPE estado_obra_v2
  USING estado::text::estado_obra_v2;

-- Drop old enum
DROP TYPE IF EXISTS estado_obra CASCADE;

-- Rename new enum to original name
ALTER TYPE estado_obra_v2 RENAME TO estado_obra;

-- ──────────────────────────────────────────────────────────────────────
-- 3. Create gastos_obra table
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
-- 4. Create categorias_gasto_personalizado table
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
-- 5. Create flujo_caja_real table
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
-- 6. Create flujo_caja_proyectado table
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
-- 7. Create scorecards_dashboard table
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scorecards_dashboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  periodo_mes INTEGER NOT NULL CHECK (periodo_mes >= 1 AND periodo_mes <= 12),
  periodo_anio INTEGER NOT NULL CHECK (periodo_anio >= 2020),

  -- Revenue Metrics
  presupuestos_generados_cantidad INTEGER DEFAULT 0,
  presupuestos_generados_monto DECIMAL(15,2) DEFAULT 0,
  presupuestos_aprobados_cantidad INTEGER DEFAULT 0,
  presupuestos_aprobados_monto DECIMAL(15,2) DEFAULT 0,
  obras_activas_cantidad INTEGER DEFAULT 0,

  -- Cash Metrics
  ingresos_proyectados_mes DECIMAL(15,2) DEFAULT 0,
  ingresos_reales_mes DECIMAL(15,2) DEFAULT 0,
  egresos_proyectados_mes DECIMAL(15,2) DEFAULT 0,
  egresos_reales_mes DECIMAL(15,2) DEFAULT 0,

  -- Profitability
  ganancia_proyectada_mes DECIMAL(15,2),
  ganancia_real_mes DECIMAL(15,2),
  utilidad_acumulada_anio DECIMAL(15,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(periodo_mes, periodo_anio)
);

-- ──────────────────────────────────────────────────────────────────────
-- 8. Seed default gasto categories
-- ──────────────────────────────────────────────────────────────────────

-- Note: This creates default categories for display, but users will create
-- their own categorias_gasto_personalizado entries when first using the system

COMMIT;

-- ──────────────────────────────────────────────────────────────────────
-- Verification (optional, for testing)
-- ──────────────────────────────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--   AND table_name IN ('gastos_obra', 'categorias_gasto_personalizado', 'flujo_caja_real', 'flujo_caja_proyectado', 'scorecards_dashboard');
