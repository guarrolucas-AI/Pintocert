import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { presupuestoId, subtotal, monto_iva, total } = await req.json()

    const { data, error } = await supabase
      .from('presupuestos')
      .update({
        subtotal,
        monto_iva,
        total,
        updated_at: new Date().toISOString()
      })
      .eq('id', presupuestoId)
      .select()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Presupuesto ${presupuestoId} actualizado`,
      data
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
