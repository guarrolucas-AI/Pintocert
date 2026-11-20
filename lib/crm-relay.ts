import { createHmac, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

// Puente SoyFlip <-> CRM de Flipping Real Estate.
// SoyFlip (este webhook) atiende al equipo; lo que escribe cualquier otro número
// (consultas de la publicidad) se reenvía tal cual al CRM, que lo responde por
// /api/whatsapp/relay usando este mismo número y token.
// Variables en Vercel (las dos en este proyecto y en el CRM):
//   CRM_WEBHOOK_URL    ej. https://crm.flippinghouses.com.ar/api/whatsapp/soyflip
//   CRM_RELAY_SECRET   secreto compartido (mínimo 32 caracteres)

const safeEqual = (a: string, b: string) => {
  const ba = Buffer.from(a), bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

export const crmRelayActivo = () =>
  !!process.env.CRM_WEBHOOK_URL && (process.env.CRM_RELAY_SECRET ?? '').length >= 32

/** Reenvía el payload crudo de Meta al CRM, firmado con HMAC-SHA256. */
export async function reenviarAlCrm(raw: string) {
  if (!crmRelayActivo()) return
  const firma = 'sha256=' + createHmac('sha256', process.env.CRM_RELAY_SECRET!).update(raw).digest('hex')
  try {
    const res = await fetch(process.env.CRM_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-soyflip-signature': firma },
      body: raw,
      signal: AbortSignal.timeout(55_000),
    })
    if (!res.ok) console.error('CRM relay: el CRM respondió', res.status)
  } catch (e) {
    console.error('CRM relay: no se pudo reenviar al CRM', e)
  }
}

/** El CRM se autentica con Authorization: Bearer <CRM_RELAY_SECRET>. */
export function crmAutorizado(req: NextRequest) {
  const s = process.env.CRM_RELAY_SECRET ?? ''
  return s.length >= 32 && safeEqual(req.headers.get('authorization') ?? '', `Bearer ${s}`)
}
