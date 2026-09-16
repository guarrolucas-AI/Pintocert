import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ── WhatsApp API helpers ──────────────────────────────────────────────

async function sendWhatsApp(to: string, text: string) {
  await fetch(
    `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    }
  )
}

// ── Claude parser ─────────────────────────────────────────────────────

interface GastoParseado {
  tipo: 'obra' | 'central'
  categoria_obra: 'materiales' | 'mano_obra' | 'otros'
  categoria_central: 'sueldo' | 'combustible' | 'maquina' | 'material' | 'retiro_socio' | 'otro'
  descripcion: string
  monto: number
  obra_nombre: string | null
  proveedor: string | null
  fecha: string
}

async function parsearGasto(mensaje: string, hoy: string): Promise<GastoParseado | null> {
  const prompt = `Extraé los datos de este gasto de construcción en Argentina. Respondé SOLO con un objeto JSON válido, sin texto extra.

Mensaje: "${mensaje}"
Fecha de hoy: ${hoy}

Reglas:
- tipo "obra" si menciona una obra, proyecto, dirección o cliente específico; "central" si es gasto general de la empresa
- categoria_obra: "materiales" (cemento, hierro, pintura, ladrillos, etc), "mano_obra" (jornales, operarios, etc), "otros"
- categoria_central: "sueldo", "combustible", "maquina", "material", "retiro_socio", "otro"
- monto: número sin puntos ni comas (ej: 15000, no "15.000")
- obra_nombre: nombre o dirección mencionada, null si no hay
- fecha: usar la de hoy si no se menciona otra, formato YYYY-MM-DD
- proveedor: nombre del proveedor si se menciona, null si no

JSON:
{
  "tipo": "obra" | "central",
  "categoria_obra": "materiales" | "mano_obra" | "otros",
  "categoria_central": "sueldo" | "combustible" | "maquina" | "material" | "retiro_socio" | "otro",
  "descripcion": "string",
  "monto": number,
  "obra_nombre": "string" | null,
  "proveedor": "string" | null,
  "fecha": "YYYY-MM-DD"
}`

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = resp.content[0]?.type === 'text' ? resp.content[0].text.trim() : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0]) as GastoParseado
  } catch {
    return null
  }
}

// ── Main handlers ─────────────────────────────────────────────────────

// GET: webhook verification by Meta
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// POST: incoming messages
export async function POST(req: NextRequest) {
  const body = await req.json()

  const entry = body?.entry?.[0]
  const change = entry?.changes?.[0]
  const message = change?.value?.messages?.[0]

  if (!message || message.type !== 'text') {
    return NextResponse.json({ ok: true })
  }

  const from = message.from as string
  const texto = (message.text?.body as string)?.trim()
  if (!texto) return NextResponse.json({ ok: true })

  const admin = createAdminClient()

  // Identify user by WhatsApp number
  const { data: perfil } = await admin
    .from('perfiles')
    .select('id, nombre')
    .eq('whatsapp_number', from)
    .single()

  if (!perfil) {
    await sendWhatsApp(from, '❌ Tu número no está registrado en PintoCert. Pedile al admin que lo configure.')
    return NextResponse.json({ ok: true })
  }

  const hoy = new Date().toISOString().split('T')[0]
  const gasto = await parsearGasto(texto, hoy)

  if (!gasto || !gasto.monto || gasto.monto <= 0 || !gasto.descripcion) {
    await sendWhatsApp(from, '❓ No pude entender el gasto. Intentá con algo como:\n"Cemento $15000 obra Palermo"\n"Combustible $8000"\n"Jornal electricista $25000 obra San Isidro"')
    return NextResponse.json({ ok: true })
  }

  // ── Gasto de obra ────────────────────────────────────────────────

  if (gasto.tipo === 'obra') {
    if (!gasto.obra_nombre) {
      await sendWhatsApp(from, '❓ No identifiqué a qué obra corresponde. Mencioná el nombre o dirección de la obra.')
      return NextResponse.json({ ok: true })
    }

    // Find obra by name (case-insensitive partial match)
    const { data: obras } = await admin
      .from('obras')
      .select('id, nombre')
      .ilike('nombre', `%${gasto.obra_nombre}%`)
      .in('estado', ['en_ejecucion', 'pausado'])
      .limit(1)

    if (!obras || obras.length === 0) {
      await sendWhatsApp(from, `❌ No encontré ninguna obra activa que coincida con "${gasto.obra_nombre}". Verificá el nombre.`)
      return NextResponse.json({ ok: true })
    }

    const obra = obras[0]

    const { error } = await admin.from('gastos_obra').insert({
      obra_id: obra.id,
      fecha: gasto.fecha,
      categoria: gasto.categoria_obra,
      descripcion: gasto.descripcion,
      monto: gasto.monto,
      proveedor: gasto.proveedor || null,
      created_by: perfil.id,
    })

    if (error) {
      await sendWhatsApp(from, `❌ Error al registrar: ${error.message}`)
      return NextResponse.json({ ok: true })
    }

    const montoFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(gasto.monto)
    await sendWhatsApp(from, `✅ Gasto registrado\n📋 Obra: ${obra.nombre}\n🔖 ${gasto.descripcion}\n💰 ${montoFmt}\n📅 ${gasto.fecha}`)

  // ── Gasto central ────────────────────────────────────────────────

  } else {
    const { error } = await admin.from('gastos_central').insert({
      fecha: gasto.fecha,
      tipo_gasto: gasto.categoria_central,
      categoria: gasto.descripcion,
      descripcion: gasto.descripcion,
      monto: gasto.monto,
      proveedor: gasto.proveedor || null,
      created_by: perfil.id,
    })

    if (error) {
      await sendWhatsApp(from, `❌ Error al registrar: ${error.message}`)
      return NextResponse.json({ ok: true })
    }

    const montoFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(gasto.monto)
    await sendWhatsApp(from, `✅ Gasto central registrado\n🔖 ${gasto.descripcion}\n💰 ${montoFmt}\n📅 ${gasto.fecha}`)
  }

  return NextResponse.json({ ok: true })
}
