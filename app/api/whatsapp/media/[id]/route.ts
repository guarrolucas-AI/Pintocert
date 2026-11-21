import { NextRequest, NextResponse } from 'next/server'
import { crmAutorizado } from '@/lib/crm-relay'

export const runtime = 'nodejs'

// El CRM pide acá los archivos que mandan los clientes (audios para transcribir, fotos).
// El token de WhatsApp queda solo en este proyecto: el CRM nunca lo ve.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!crmAutorizado(req)) return NextResponse.json({ ok: false, error: 'no autorizado' }, { status: 401 })
  const { id } = await params
  if (!/^\d+$/.test(id)) return NextResponse.json({ ok: false, error: 'id inválido' }, { status: 400 })

  const auth = { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }
  const meta = await fetch(`https://graph.facebook.com/v20.0/${id}`, { headers: auth })
  const info = await meta.json().catch(() => ({}))
  if (!meta.ok || !info?.url) return NextResponse.json({ ok: false, error: info?.error?.message ?? 'media no encontrada' }, { status: 404 })
  if (Number(info.file_size ?? 0) > 16 * 1024 * 1024) return NextResponse.json({ ok: false, error: 'archivo demasiado grande' }, { status: 413 })

  const archivo = await fetch(info.url, { headers: auth })
  if (!archivo.ok) return NextResponse.json({ ok: false, error: `descarga ${archivo.status}` }, { status: 502 })
  return new NextResponse(archivo.body, {
    headers: { 'Content-Type': info.mime_type ?? archivo.headers.get('content-type') ?? 'application/octet-stream', 'Cache-Control': 'no-store' },
  })
}
