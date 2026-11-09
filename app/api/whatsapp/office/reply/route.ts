import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isOfficeAuthorized, sendWhatsApp } from '@/lib/office-bridge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// La PC devuelve la respuesta de la oficina; se envía por WhatsApp SOLO al número que hizo el pedido
export async function POST(req: NextRequest) {
  if (!isOfficeAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id, text } = await req.json().catch(() => ({}))
  if (typeof id !== 'string' || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data: row } = await db.from('office_inbox').select('id, from_number, status').eq('id', id).single()
  if (!row || row.status !== 'tomado') return NextResponse.json({ error: 'not found' }, { status: 404 })
  // Defensa extra: solo se responde al dueño configurado
  if (row.from_number !== process.env.OFFICE_OWNER_NUMBER) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const reply = text.trim().slice(0, 12000)
  await sendWhatsApp(row.from_number, reply)
  await db.from('office_inbox')
    .update({ status: 'respondido', reply, replied_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ ok: true })
}
