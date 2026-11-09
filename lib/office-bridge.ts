import { createHmac, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

// Puente WhatsApp (Soy Flip) <-> Oficina de agentes en la PC de Lucas.
// Variables en Vercel:
//   WHATSAPP_APP_SECRET   App Secret de la app de Meta (verifica que el webhook venga de Meta)
//   OFFICE_OWNER_NUMBER   número de Lucas en formato Meta, ej. 5491112345678 (único autorizado)
//   OFFICE_BRIDGE_SECRET  secreto compartido con la PC (bridge.json de agent-office)

const safeEqual = (a: string, b: string) => {
  const ba = Buffer.from(a), bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

/** Verifica la firma X-Hub-Signature-256 que Meta agrega a cada webhook. */
export function verifyMetaSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret || !header?.startsWith('sha256=')) return false
  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex')
  return safeEqual(expected, header)
}

/** Autoriza a la PC de la oficina (Authorization: Bearer <OFFICE_BRIDGE_SECRET>). */
export function isOfficeAuthorized(req: NextRequest): boolean {
  const secret = process.env.OFFICE_BRIDGE_SECRET
  const auth = req.headers.get('authorization') ?? ''
  return !!secret && secret.length >= 32 && safeEqual(auth, `Bearer ${secret}`)
}

/** ¿Es un mensaje de Lucas dirigido a la oficina? Devuelve el pedido sin el prefijo, o null. */
export function officeCommand(from: string, text: string): string | null {
  const owner = process.env.OFFICE_OWNER_NUMBER
  if (!owner || from !== owner) return null
  const m = text.match(/^\s*ofi(?:cina)?\b[\s:,.-]*([\s\S]*)$/i)
  return m ? m[1].trim() : null
}

/** Envía texto por WhatsApp, partiendo mensajes largos (límite de Meta ~4096 caracteres). */
export async function sendWhatsApp(to: string, text: string) {
  const chunks: string[] = []
  let rest = text
  while (rest.length > 3500) {
    const cut = rest.lastIndexOf('\n', 3500) > 1000 ? rest.lastIndexOf('\n', 3500) : 3500
    chunks.push(rest.slice(0, cut)); rest = rest.slice(cut)
  }
  chunks.push(rest)
  for (const body of chunks) {
    const res = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
    })
    if (!res.ok) console.error('WhatsApp send error (oficina):', res.status, await res.text().catch(() => ''))
  }
}
