import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isOfficeAuthorized } from '@/lib/office-bridge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// La PC de la oficina retira los pedidos pendientes (y los marca como tomados para no procesarlos dos veces)
export async function GET(req: NextRequest) {
  if (!isOfficeAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = createAdminClient()

  const { data: pending, error } = await db
    .from('office_inbox')
    .select('id')
    .eq('status', 'pendiente')
    .order('created_at')
    .limit(3)
  if (error) return NextResponse.json({ error: 'db' }, { status: 500 })
  if (!pending?.length) return NextResponse.json({ messages: [] })

  // Solo se devuelve lo que este pedido efectivamente cambió de "pendiente" a "tomado"
  const { data: taken } = await db
    .from('office_inbox')
    .update({ status: 'tomado', taken_at: new Date().toISOString() })
    .in('id', pending.map(p => p.id))
    .eq('status', 'pendiente')
    .select('id, text, created_at')

  return NextResponse.json({ messages: taken ?? [] })
}
