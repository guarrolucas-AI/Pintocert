import { NextRequest, NextResponse } from 'next/server'
import { crmAutorizado } from '@/lib/crm-relay'

export const runtime = 'nodejs'

// El CRM de Flipping Real Estate manda mensajes por el número de SoyFlip a través de este endpoint.
// Body: { to: "5491112345678", text: "..." }  o  { to, template: { name, language, components } }
export async function POST(req: NextRequest) {
  if (!crmAutorizado(req)) return NextResponse.json({ ok: false, error: 'no autorizado' }, { status: 401 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'json inválido' }, { status: 400 }) }
  const to = String(body?.to ?? '').replace(/\D/g, '')
  if (to.length < 10) return NextResponse.json({ ok: false, error: 'número inválido' }, { status: 400 })

  let payload: Record<string, unknown>
  if (body?.template?.name) {
    payload = {
      messaging_product: 'whatsapp', to, type: 'template',
      template: {
        name: String(body.template.name),
        language: { code: String(body.template.language ?? 'es_AR') },
        ...(Array.isArray(body.template.components) ? { components: body.template.components } : {}),
      },
    }
  } else {
    const text = String(body?.text ?? '').slice(0, 4000)
    if (!text.trim()) return NextResponse.json({ ok: false, error: 'mensaje vacío' }, { status: 400 })
    payload = { messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body: text, preview_url: true } }
  }

  const res = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('Relay CRM: error de WhatsApp', res.status, JSON.stringify(data))
    return NextResponse.json({ ok: false, error: data?.error?.message ?? `Error ${res.status} de WhatsApp` }, { status: 502 })
  }
  return NextResponse.json({ ok: true, wamid: data?.messages?.[0]?.id ?? null })
}
