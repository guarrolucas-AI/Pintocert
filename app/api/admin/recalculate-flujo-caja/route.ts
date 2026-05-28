import { NextRequest, NextResponse } from 'next/server'
import { recalculateFlujoCajaForAllObras } from '@/lib/actions/gastos'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/recalculate-flujo-caja
 * Admin endpoint to recalculate flujo_caja_real for all obras
 *
 * In development, requires x-admin-key header
 * In production, requires authenticated admin user
 */
export async function POST(req: NextRequest) {
  try {
    // Dev mode: accept admin key header
    if (process.env.NODE_ENV === 'development') {
      const adminKey = req.headers.get('x-admin-key')
      if (adminKey === 'dev-recalc-key') {
        const result = await recalculateFlujoCajaForAllObras()
        return NextResponse.json(result)
      }
    }

    // Production mode: verify admin user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (perfil?.rol !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    // Execute recalculation
    const result = await recalculateFlujoCajaForAllObras()

    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
