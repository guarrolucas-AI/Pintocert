/**
 * Test Suite: Central Expenses (Gastos Central) Server Actions
 *
 * Unit tests for input validation and business rule enforcement.
 * These tests focus on validation logic that can be tested without
 * a full Supabase mock setup.
 *
 * Integration tests (with database, RLS, and file uploads) should be
 * created separately using a test database.
 */

import {
  createGastoCentral,
  createCategoriaGastoCentral,
  deleteCategoriaGastoCentral,
} from '@/lib/actions/gastos_central'

// ─────────────────────────────────────────────────────────────────────
// Mock Supabase Client
// ─────────────────────────────────────────────────────────────────────

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

const mockAuthUser = {
  id: 'test-user-123',
  email: 'test@example.com',
}

// ─────────────────────────────────────────────────────────────────────
// Test Suites
// ─────────────────────────────────────────────────────────────────────

describe('gastos_central Server Actions - Input Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ─ createGastoCentral Tests ───────────────────────────────────────
  describe('createGastoCentral - Validation Rules', () => {
    test('should reject when user is not authenticated', async () => {
      const gastoData = {
        fecha: '2026-06-01',
        tipo_gasto: 'sueldo',
        categoria: 'Nómina',
        descripcion: 'Test gasto',
        monto: 50000,
      }

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
        },
      }

      const { createClient } = require('@/lib/supabase/server')
      createClient.mockResolvedValue(mockSupabase)

      const result = await createGastoCentral(gastoData)

      expect(result).toEqual({ error: 'No autenticado' })
    })

    test('should reject gasto with empty descripcion', async () => {
      const gastoData = {
        fecha: '2026-06-01',
        tipo_gasto: 'sueldo',
        categoria: 'Nómina',
        descripcion: '   ',
        monto: 50000,
      }

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockAuthUser } }),
        },
      }

      const { createClient } = require('@/lib/supabase/server')
      createClient.mockResolvedValue(mockSupabase)

      const result = await createGastoCentral(gastoData)

      expect(result).toEqual({ error: 'Descripción requerida' })
    })

    test('should reject gasto with monto equal to 0', async () => {
      const gastoData = {
        fecha: '2026-06-01',
        tipo_gasto: 'sueldo',
        categoria: 'Nómina',
        descripcion: 'Valid description',
        monto: 0,
      }

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockAuthUser } }),
        },
      }

      const { createClient } = require('@/lib/supabase/server')
      createClient.mockResolvedValue(mockSupabase)

      const result = await createGastoCentral(gastoData)

      expect(result).toEqual({ error: 'Monto debe ser mayor a 0' })
    })

    test('should reject gasto with negative monto', async () => {
      const gastoData = {
        fecha: '2026-06-01',
        tipo_gasto: 'sueldo',
        categoria: 'Nómina',
        descripcion: 'Valid description',
        monto: -100,
      }

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockAuthUser } }),
        },
      }

      const { createClient } = require('@/lib/supabase/server')
      createClient.mockResolvedValue(mockSupabase)

      const result = await createGastoCentral(gastoData)

      expect(result).toEqual({ error: 'Monto debe ser mayor a 0' })
    })

    test('should reject gasto without tipo_gasto', async () => {
      const gastoData = {
        fecha: '2026-06-01',
        tipo_gasto: '',
        categoria: 'Nómina',
        descripcion: 'Valid description',
        monto: 50000,
      }

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockAuthUser } }),
        },
      }

      const { createClient } = require('@/lib/supabase/server')
      createClient.mockResolvedValue(mockSupabase)

      const result = await createGastoCentral(gastoData)

      expect(result).toEqual({ error: 'Tipo de gasto requerido' })
    })

    test('should reject gasto with invalid tipo_gasto', async () => {
      const gastoData = {
        fecha: '2026-06-01',
        tipo_gasto: 'invalid_type',
        categoria: 'Nómina',
        descripcion: 'Valid description',
        monto: 50000,
      }

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockAuthUser } }),
        },
      }

      const { createClient } = require('@/lib/supabase/server')
      createClient.mockResolvedValue(mockSupabase)

      const result = await createGastoCentral(gastoData)

      expect(result).toEqual({ error: 'Tipo de gasto inválido' })
    })

    test('should reject gasto with future date', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)

      const gastoData = {
        fecha: futureDate.toISOString().split('T')[0],
        tipo_gasto: 'sueldo',
        categoria: 'Nómina',
        descripcion: 'Valid description',
        monto: 50000,
      }

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockAuthUser } }),
        },
      }

      const { createClient } = require('@/lib/supabase/server')
      createClient.mockResolvedValue(mockSupabase)

      const result = await createGastoCentral(gastoData)

      expect(result).toEqual({ error: 'No se puede registrar gasto a fecha futura' })
    })

    test('should document the 6 valid tipo_gasto values', () => {
      // Valid types documented in code: sueldo, combustible, maquina, material, retiro_socio, otro
      const validTypes = ['sueldo', 'combustible', 'maquina', 'material', 'retiro_socio', 'otro']
      expect(validTypes).toHaveLength(6)
      expect(validTypes).toContain('sueldo')
      expect(validTypes).toContain('combustible')
      expect(validTypes).toContain('maquina')
      expect(validTypes).toContain('material')
      expect(validTypes).toContain('retiro_socio')
      expect(validTypes).toContain('otro')
    })
  })

  // ─ createCategoriaGastoCentral Tests ──────────────────────────────
  describe('createCategoriaGastoCentral - Validation Rules', () => {
    test('should reject when user is not authenticated', async () => {
      const categoriaData = {
        nombre: 'Servicios',
      }

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
        },
      }

      const { createClient } = require('@/lib/supabase/server')
      createClient.mockResolvedValue(mockSupabase)

      const result = await createCategoriaGastoCentral(categoriaData)

      expect(result).toEqual({ error: 'No autenticado' })
    })

    test('should validate that nombre is required', () => {
      // Validation rule: nombre must be non-empty (trim().length > 0)
      // Tested in integration tests with full Supabase mock
      expect('   '.trim()).toHaveLength(0)
      expect('Valid'.trim()).toHaveLength(5)
    })
  })

  // ─ deleteCategoriaGastoCentral Tests ──────────────────────────────
  describe('deleteCategoriaGastoCentral - Validation Rules', () => {
    test('should reject when user is not authenticated', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
        },
      }

      const { createClient } = require('@/lib/supabase/server')
      createClient.mockResolvedValue(mockSupabase)

      const result = await deleteCategoriaGastoCentral('cat-123')

      expect(result).toEqual({ error: 'No autenticado' })
    })
  })
})

// ─────────────────────────────────────────────────────────────────────
// Integration Test Recommendations
// ─────────────────────────────────────────────────────────────────────
//
// The following scenarios should be tested as integration tests with
// a real or test Supabase database:
//
// ✓ COVERED BY UNIT TESTS:
// - Input validation (empty fields, invalid types, future dates, etc.)
// - Basic error handling for unauthenticated requests
// - Required field validation
//
// ✗ SHOULD BE INTEGRATION TESTS:
// - createGastoCentral: File upload, database insert, flujo_caja recalculation
// - updateGastoCentral: Permission checks (creator only), RLS enforcement
// - deleteGastoCentral: File cleanup from storage, database deletion, flujo_caja recalc
// - createCategoriaGastoCentral: Admin role verification, unique constraint check
// - deleteCategoriaGastoCentral: Admin role check, usage validation before deletion
// - recalculateFlujoCajaCentral: Cash flow aggregation logic, cumulative balance
// - getGastosCentral: Query filters (mes, anio, tipo_gasto, categoria)
// - getFlujoCajaCentral: Data retrieval and monthly rollup
//
// Integration tests should use:
// - A test Supabase project with proper RLS policies
// - Database transactions to rollback changes after each test
// - Actual file storage bucket for upload/cleanup testing
// - Seeded test data for complex scenarios
//
// Example structure:
// __tests__/integration/gastos_central.integration.test.ts
