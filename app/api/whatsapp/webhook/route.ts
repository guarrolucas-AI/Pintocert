import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ── WhatsApp send ─────────────────────────────────────────────────────

async function send(to: string, text: string) {
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

// ── Session helpers ───────────────────────────────────────────────────

interface GastoPendiente {
  tipo?: 'obra' | 'central'
  categoria_obra?: 'materiales' | 'mano_obra' | 'otros'
  categoria_central?: 'sueldo' | 'combustible' | 'maquina' | 'material' | 'retiro_socio' | 'otro'
  descripcion?: string
  monto?: number
  obra_id?: string
  obra_nombre?: string
  proveedor?: string
  fecha?: string
}

type Estado =
  | 'idle'
  | 'ask_tipo'
  | 'ask_descripcion'
  | 'ask_monto'
  | 'ask_obra'
  | 'seleccionar_obra'
  | 'ask_categoria_obra'
  | 'ask_categoria_central'
  | 'ask_proveedor'
  | 'confirmar'

interface Session {
  estado: Estado
  gasto_pendiente: GastoPendiente
  opciones_obra?: { id: string; nombre: string }[]
}

async function getSession(db: ReturnType<typeof createAdminClient>, number: string): Promise<Session> {
  const { data } = await db
    .from('whatsapp_sessions')
    .select('*')
    .eq('whatsapp_number', number)
    .single()

  return {
    estado: (data?.estado as Estado) ?? 'idle',
    gasto_pendiente: (data?.gasto_pendiente as GastoPendiente) ?? {},
    opciones_obra: data?.opciones_obra ?? undefined,
  }
}

async function saveSession(
  db: ReturnType<typeof createAdminClient>,
  number: string,
  session: Session
) {
  await db.from('whatsapp_sessions').upsert({
    whatsapp_number: number,
    estado: session.estado,
    gasto_pendiente: session.gasto_pendiente,
    opciones_obra: session.opciones_obra ?? null,
    updated_at: new Date().toISOString(),
  })
}

async function clearSession(db: ReturnType<typeof createAdminClient>, number: string) {
  await db.from('whatsapp_sessions').delete().eq('whatsapp_number', number)
}

// ── Claude: extract what it can from a free-form message ──────────────

interface ExtraccionParcial {
  tipo?: 'obra' | 'central'
  categoria_obra?: 'materiales' | 'mano_obra' | 'otros'
  categoria_central?: 'sueldo' | 'combustible' | 'maquina' | 'material' | 'retiro_socio' | 'otro'
  descripcion?: string
  monto?: number
  obra_nombre?: string
  proveedor?: string
}

async function extraerDatos(texto: string): Promise<ExtraccionParcial> {
  const prompt = `Extraé los datos que puedas de este mensaje de gasto de construcción en Argentina.
Respondé SOLO con JSON, sin texto extra. Si algo no está claro o no se menciona, omití el campo.

Mensaje: "${texto}"

Categorías de obra: materiales (cemento, hierro, pintura, ladrillos, arena, etc), mano_obra (jornales, albañiles, electricistas, etc), otros
Categorías centrales: sueldo, combustible, maquina, material, retiro_socio, otro
tipo "obra" si menciona una obra/proyecto/dirección específica, "central" si es gasto general de empresa

JSON (solo los campos que puedas deducir con seguridad):
{
  "tipo": "obra"|"central",
  "categoria_obra": "materiales"|"mano_obra"|"otros",
  "categoria_central": "sueldo"|"combustible"|"maquina"|"material"|"retiro_socio"|"otro",
  "descripcion": "string",
  "monto": number,
  "obra_nombre": "string",
  "proveedor": "string"
}`

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = resp.content[0]?.type === 'text' ? resp.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return {}
    return JSON.parse(match[0])
  } catch {
    return {}
  }
}

// ── Format helpers ────────────────────────────────────────────────────

const LABELS_CATEGORIA_OBRA: Record<string, string> = {
  materiales: 'Materiales',
  mano_obra: 'Mano de obra',
  otros: 'Otros',
}

const LABELS_CATEGORIA_CENTRAL: Record<string, string> = {
  sueldo: 'Sueldo',
  combustible: 'Combustible',
  maquina: 'Máquina/Equipo',
  material: 'Material',
  retiro_socio: 'Retiro de socio',
  otro: 'Otro',
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n)
}

function resumenConfirmacion(g: GastoPendiente): string {
  const lines = ['📋 *Confirmá el gasto:*', '']
  if (g.tipo === 'obra') {
    lines.push(`🏗 Obra: ${g.obra_nombre}`)
    lines.push(`🔖 Categoría: ${LABELS_CATEGORIA_OBRA[g.categoria_obra!] ?? g.categoria_obra}`)
  } else {
    lines.push(`🏢 Tipo: Gasto central`)
    lines.push(`🔖 Categoría: ${LABELS_CATEGORIA_CENTRAL[g.categoria_central!] ?? g.categoria_central}`)
  }
  lines.push(`📝 Descripción: ${g.descripcion}`)
  lines.push(`💰 Monto: ${formatARS(g.monto!)}`)
  if (g.proveedor) lines.push(`🏪 Proveedor: ${g.proveedor}`)
  lines.push(`📅 Fecha: ${g.fecha}`)
  lines.push('')
  lines.push('Respondé *sí* para registrar o *no* para cancelar.')
  return lines.join('\n')
}

// ── Insert gasto ──────────────────────────────────────────────────────

async function registrarGasto(
  db: ReturnType<typeof createAdminClient>,
  g: GastoPendiente,
  perfilId: string
): Promise<string> {
  const hoy = new Date().toISOString().split('T')[0]
  const fecha = g.fecha ?? hoy

  if (g.tipo === 'obra') {
    const { error } = await db.from('gastos_obra').insert({
      obra_id: g.obra_id,
      fecha,
      categoria: g.categoria_obra,
      descripcion: g.descripcion,
      monto: g.monto,
      proveedor: g.proveedor ?? null,
      created_by: perfilId,
    })
    if (error) return `❌ Error al registrar: ${error.message}`
    return `✅ Gasto registrado en obra *${g.obra_nombre}*\n${g.descripcion} — ${formatARS(g.monto!)}`
  } else {
    const { error } = await db.from('gastos_central').insert({
      fecha,
      tipo_gasto: g.categoria_central,
      categoria: LABELS_CATEGORIA_CENTRAL[g.categoria_central!] ?? g.categoria_central,
      descripcion: g.descripcion,
      monto: g.monto,
      proveedor: g.proveedor ?? null,
      created_by: perfilId,
    })
    if (error) return `❌ Error al registrar: ${error.message}`
    return `✅ Gasto central registrado\n${g.descripcion} — ${formatARS(g.monto!)}`
  }
}

// ── Conversation state machine ────────────────────────────────────────

async function procesarMensaje(
  db: ReturnType<typeof createAdminClient>,
  from: string,
  texto: string,
  perfilId: string
): Promise<string> {
  const session = await getSession(db, from)
  const { estado, gasto_pendiente: g } = session
  const txt = texto.trim().toLowerCase()

  // Cancel any time
  if (['cancelar', 'cancel', 'salir', 'no gracias'].includes(txt)) {
    await clearSession(db, from)
    return '❌ Registro cancelado. Mandame un nuevo gasto cuando quieras.'
  }

  // ── CONFIRMACIÓN ───────────────────────────────────────────────────
  if (estado === 'confirmar') {
    if (['sí', 'si', 'yes', 'ok', 'dale', 'confirmar', 'confirmo'].includes(txt)) {
      const msg = await registrarGasto(db, g, perfilId)
      await clearSession(db, from)
      return msg
    }
    if (['no', 'nope'].includes(txt)) {
      await clearSession(db, from)
      return '❌ Registro cancelado.'
    }
    return 'Respondé *sí* para confirmar o *no* para cancelar.'
  }

  // ── SELECCIÓN DE OBRA (cuando hay varias coincidencias) ───────────
  if (estado === 'seleccionar_obra') {
    const num = parseInt(txt)
    const opciones = session.opciones_obra ?? []
    if (!isNaN(num) && num >= 1 && num <= opciones.length) {
      const obra = opciones[num - 1]
      g.obra_id = obra.id
      g.obra_nombre = obra.nombre
      const next = await siguientePaso(db, from, { ...session, gasto_pendiente: g, estado: 'seleccionar_obra' })
      return next
    }
    const lista = opciones.map((o, i) => `${i + 1}. ${o.nombre}`).join('\n')
    return `Elegí el número de la obra:\n${lista}`
  }

  // ── RESPUESTAS A PREGUNTAS ESPECÍFICAS ────────────────────────────

  if (estado === 'ask_tipo') {
    if (['1', 'obra'].includes(txt)) g.tipo = 'obra'
    else if (['2', 'central', 'empresa', 'general'].includes(txt)) g.tipo = 'central'
    else return '¿Es un gasto de:\n1. Una obra específica\n2. Gastos generales de la empresa'
  }

  if (estado === 'ask_descripcion') {
    if (txt.length < 2) return '¿Qué se compró o gastó? (ej: cemento, jornal electricista, combustible)'
    g.descripcion = texto.trim()
  }

  if (estado === 'ask_monto') {
    const n = parseFloat(txt.replace(/[.$,\s]/g, '').replace(',', '.'))
    if (isNaN(n) || n <= 0) return '¿Cuánto fue el monto? Solo el número (ej: 15000)'
    g.monto = n
  }

  if (estado === 'ask_obra') {
    g.obra_nombre = texto.trim()
  }

  if (estado === 'ask_categoria_obra') {
    if (['1', 'materiales', 'material'].includes(txt)) g.categoria_obra = 'materiales'
    else if (['2', 'mano de obra', 'mano_obra', 'jornal', 'jornales'].includes(txt)) g.categoria_obra = 'mano_obra'
    else if (['3', 'otros', 'otro'].includes(txt)) g.categoria_obra = 'otros'
    else return '¿Categoría del gasto?\n1. Materiales\n2. Mano de obra\n3. Otros'
  }

  if (estado === 'ask_categoria_central') {
    const map: Record<string, typeof g.categoria_central> = {
      '1': 'sueldo', 'sueldo': 'sueldo',
      '2': 'combustible', 'combustible': 'combustible',
      '3': 'maquina', 'maquina': 'maquina', 'máquina': 'maquina',
      '4': 'material', 'material': 'material',
      '5': 'retiro_socio', 'retiro': 'retiro_socio',
      '6': 'otro', 'otros': 'otro',
    }
    if (map[txt]) g.categoria_central = map[txt]
    else return '¿Categoría?\n1. Sueldo\n2. Combustible\n3. Máquina/Equipo\n4. Material\n5. Retiro de socio\n6. Otro'
  }

  if (estado === 'ask_proveedor') {
    if (['no', 'ninguno', 'n/a', '-', 'no sé', 'nose'].includes(txt)) {
      g.proveedor = undefined
    } else {
      g.proveedor = texto.trim()
    }
  }

  // ── MENSAJE NUEVO (estado idle) ───────────────────────────────────
  if (estado === 'idle') {
    const extraido = await extraerDatos(texto)
    Object.assign(g, extraido)
    g.fecha = new Date().toISOString().split('T')[0]
  }

  return await siguientePaso(db, from, { estado, gasto_pendiente: g, opciones_obra: session.opciones_obra })
}

async function siguientePaso(
  db: ReturnType<typeof createAdminClient>,
  from: string,
  session: Session
): Promise<string> {
  const g = session.gasto_pendiente
  const admin = db

  // 1. Tipo
  if (!g.tipo) {
    await saveSession(db, from, { ...session, estado: 'ask_tipo' })
    return '¿Es un gasto de:\n1. Una obra específica\n2. Gastos generales de la empresa'
  }

  // 2. Descripción
  if (!g.descripcion) {
    await saveSession(db, from, { ...session, estado: 'ask_descripcion' })
    return '¿Qué se compró o gastó? (ej: cemento, jornal electricista, combustible cargado)'
  }

  // 3. Monto
  if (!g.monto || g.monto <= 0) {
    await saveSession(db, from, { ...session, estado: 'ask_monto' })
    return `¿Cuánto fue el monto de "${g.descripcion}"? (solo el número, sin $)`
  }

  // 4. Categoría
  if (g.tipo === 'obra' && !g.categoria_obra) {
    await saveSession(db, from, { ...session, estado: 'ask_categoria_obra' })
    return '¿Categoría del gasto?\n1. Materiales\n2. Mano de obra\n3. Otros'
  }

  if (g.tipo === 'central' && !g.categoria_central) {
    await saveSession(db, from, { ...session, estado: 'ask_categoria_central' })
    return '¿Categoría?\n1. Sueldo\n2. Combustible\n3. Máquina/Equipo\n4. Material\n5. Retiro de socio\n6. Otro'
  }

  // 5. Obra: buscar y resolver
  if (g.tipo === 'obra') {
    if (!g.obra_id) {
      if (!g.obra_nombre) {
        await saveSession(db, from, { ...session, estado: 'ask_obra' })
        return '¿A qué obra corresponde este gasto? (nombre o dirección)'
      }

      const { data: obras } = await admin
        .from('obras')
        .select('id, nombre')
        .ilike('nombre', `%${g.obra_nombre}%`)
        .in('estado', ['en_ejecucion', 'pausado'])
        .limit(5)

      if (!obras || obras.length === 0) {
        await saveSession(db, from, { ...session, estado: 'ask_obra', gasto_pendiente: { ...g, obra_nombre: undefined } })
        return `❌ No encontré ninguna obra activa con "${g.obra_nombre}".\n¿Cómo se llama la obra? (escribí el nombre completo o parte de la dirección)`
      }

      if (obras.length === 1) {
        g.obra_id = obras[0].id
        g.obra_nombre = obras[0].nombre
      } else {
        const lista = obras.map((o, i) => `${i + 1}. ${o.nombre}`).join('\n')
        await saveSession(db, from, { ...session, estado: 'seleccionar_obra', gasto_pendiente: g, opciones_obra: obras })
        return `Encontré ${obras.length} obras. ¿Cuál es?\n${lista}`
      }
    }
  }

  // 6. Proveedor (opcional)
  if (g.proveedor === undefined && session.estado !== 'ask_proveedor') {
    await saveSession(db, from, { ...session, estado: 'ask_proveedor', gasto_pendiente: g })
    return '¿Tenés nombre del proveedor? (o escribí "no" para omitir)'
  }

  // 7. Confirmación final
  await saveSession(db, from, { ...session, estado: 'confirmar', gasto_pendiente: g })
  return resumenConfirmacion(g)
}

// ── Route handlers ────────────────────────────────────────────────────

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

  const { data: perfil } = await admin
    .from('perfiles')
    .select('id, nombre')
    .eq('whatsapp_number', from)
    .single()

  if (!perfil) {
    await send(from, '❌ Tu número no está registrado en PintoCert. Pedile al admin que lo configure.')
    return NextResponse.json({ ok: true })
  }

  try {
    const respuesta = await procesarMensaje(admin, from, texto, perfil.id)
    await send(from, respuesta)
  } catch (err) {
    console.error('whatsapp webhook error:', err)
    await send(from, '❌ Ocurrió un error interno. Intentá de nuevo.')
  }

  return NextResponse.json({ ok: true })
}
