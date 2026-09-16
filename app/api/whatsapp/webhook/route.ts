import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ── WhatsApp send ─────────────────────────────────────────────────────

async function send(to: string, text: string) {
  const res = await fetch(
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('WhatsApp send error:', res.status, JSON.stringify(err))
  }
}

// ── Types ─────────────────────────────────────────────────────────────

interface GastoDatos {
  tipo?: 'obra' | 'central'
  categoria_obra?: 'materiales' | 'mano_obra' | 'otros'
  categoria_central?: 'sueldo' | 'combustible' | 'maquina' | 'material' | 'retiro_socio' | 'otro'
  descripcion?: string
  monto?: number
  obra_id?: string
  obra_nombre?: string
  proveedor?: string | null
  comprobante_url?: string | null
  fecha?: string
}

type Estado = 'recolectando' | 'ask_comprobante' | 'confirmar'

interface MensajeHistorial {
  role: 'user' | 'assistant'
  content: string
}

interface Session {
  estado: Estado
  datos: GastoDatos
  historial: MensajeHistorial[]
}

// ── Session helpers ───────────────────────────────────────────────────

async function getSession(db: ReturnType<typeof createAdminClient>, number: string): Promise<Session> {
  const { data } = await db
    .from('whatsapp_sessions')
    .select('*')
    .eq('whatsapp_number', number)
    .single()

  return {
    estado: (data?.estado as Estado) ?? 'recolectando',
    datos: (data?.gasto_pendiente as GastoDatos) ?? {},
    historial: (data?.historial as MensajeHistorial[]) ?? [],
  }
}

async function saveSession(db: ReturnType<typeof createAdminClient>, number: string, session: Session) {
  await db.from('whatsapp_sessions').upsert({
    whatsapp_number: number,
    estado: session.estado,
    gasto_pendiente: session.datos,
    historial: session.historial,
    updated_at: new Date().toISOString(),
  })
}

async function clearSession(db: ReturnType<typeof createAdminClient>, number: string) {
  await db.from('whatsapp_sessions').delete().eq('whatsapp_number', number)
}

// ── Media upload ──────────────────────────────────────────────────────

async function uploadComprobante(
  db: ReturnType<typeof createAdminClient>,
  mediaId: string,
  datos: GastoDatos
): Promise<string | null> {
  try {
    const metaRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    })
    if (!metaRes.ok) return null
    const { url: mediaUrl, mime_type } = await metaRes.json()

    const imgRes = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    })
    if (!imgRes.ok) return null
    const buffer = await imgRes.arrayBuffer()

    const ext = (mime_type as string)?.includes('png') ? 'png' : 'jpg'
    const prefix = datos.obra_id ? `obra_${datos.obra_id}` : 'central'
    const filename = `${prefix}/${Date.now()}.${ext}`

    const { error } = await db.storage
      .from('comprobantes_gastos')
      .upload(filename, buffer, { contentType: mime_type ?? 'image/jpeg', upsert: false })
    if (error) { console.error('Storage upload error:', error.message); return null }

    const { data: urlData } = db.storage.from('comprobantes_gastos').getPublicUrl(filename)
    return urlData.publicUrl ?? null
  } catch (err) {
    console.error('uploadComprobante error:', err)
    return null
  }
}

// ── Format helpers ────────────────────────────────────────────────────

const LABELS_CATEGORIA_CENTRAL: Record<string, string> = {
  sueldo: 'Sueldo',
  combustible: 'Combustible',
  maquina: 'Máquina/Equipo',
  material: 'Material',
  retiro_socio: 'Retiro de socio',
  otro: 'Otro',
}

const LABELS_CATEGORIA_OBRA: Record<string, string> = {
  materiales: 'Materiales',
  mano_obra: 'Mano de obra',
  otros: 'Otros',
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function resumenConfirmacion(g: GastoDatos): string {
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
  if (g.comprobante_url) lines.push(`📎 Comprobante: adjunto`)
  lines.push(`📅 Fecha: ${g.fecha}`)
  lines.push('')
  lines.push('Respondé *sí* para registrar o *no* para cancelar.')
  return lines.join('\n')
}

// ── Insert gasto ──────────────────────────────────────────────────────

async function registrarGasto(
  db: ReturnType<typeof createAdminClient>,
  g: GastoDatos,
  perfilId: string
): Promise<string> {
  const fecha = g.fecha ?? new Date().toISOString().split('T')[0]
  const comprobanteUrl = g.comprobante_url ?? null

  if (g.tipo === 'obra') {
    const { error } = await db.from('gastos_obra').insert({
      obra_id: g.obra_id,
      fecha,
      categoria: g.categoria_obra,
      descripcion: g.descripcion,
      monto: g.monto,
      proveedor: g.proveedor ?? null,
      comprobante_url: comprobanteUrl,
      created_by: perfilId,
    })
    if (error) return `❌ Error al registrar: ${error.message}`
    return `✅ Gasto registrado en obra *${g.obra_nombre}*\n${g.descripcion} — ${formatARS(g.monto!)}${comprobanteUrl ? '\n📎 Comprobante adjunto' : ''}`
  } else {
    const { error } = await db.from('gastos_central').insert({
      fecha,
      tipo_gasto: g.categoria_central,
      categoria: LABELS_CATEGORIA_CENTRAL[g.categoria_central!] ?? g.categoria_central,
      descripcion: g.descripcion,
      monto: g.monto,
      proveedor: g.proveedor ?? null,
      comprobante_url: comprobanteUrl,
      created_by: perfilId,
    })
    if (error) return `❌ Error al registrar: ${error.message}`
    return `✅ Gasto central registrado\n${g.descripcion} — ${formatARS(g.monto!)}${comprobanteUrl ? '\n📎 Comprobante adjunto' : ''}`
  }
}

// ── Claude: conversational AI agent ──────────────────────────────────

interface ClaudeResponse {
  pregunta?: string
  listo?: boolean
  datos?: GastoDatos
}

async function llamarAgente(
  historial: MensajeHistorial[],
  datosActuales: GastoDatos,
  obras: { id: string; nombre: string }[]
): Promise<ClaudeResponse> {
  const listaObras = obras.map(o => `- "${o.nombre}" (id: ${o.id})`).join('\n')

  const systemPrompt = `Sos un asistente de WhatsApp para registrar gastos de una empresa constructora argentina. Tu trabajo es conversar naturalmente para recolectar los datos necesarios de cada gasto y devolver un JSON estructurado.

OBRAS DISPONIBLES EN EL SISTEMA:
${listaObras || '(ninguna cargada)'}

DATOS QUE NECESITÁS RECOLECTAR:
- tipo: "obra" (si el gasto es de una obra específica) o "central" (gasto general de la empresa)
- descripcion: qué se compró o gastó (texto libre)
- monto: número en pesos argentinos
- Si tipo=obra: categoria_obra ("materiales", "mano_obra" u "otros") + obra_id + obra_nombre (de la lista de arriba)
- Si tipo=central: categoria_central ("sueldo", "combustible", "maquina", "material", "retiro_socio" u "otro")
- proveedor: nombre del proveedor (opcional, puede ser null)

DATOS YA RECOLECTADOS:
${JSON.stringify(datosActuales, null, 2)}

INSTRUCCIONES:
- Conversá en español argentino informal (tuteá)
- Extraé todo lo que puedas de cada mensaje (monto, descripción, obra, todo a la vez)
- Si el usuario menciona una obra, buscá el match más cercano en la lista y usá ese id/nombre
- Si no queda claro a qué obra se refiere, mostrá las opciones con números para que elija
- No preguntes por el proveedor si ya tenés los datos obligatorios — preguntalo al final de todo
- Cuando tengas TODOS los datos obligatorios completos, devolvé listo:true
- Siempre respondé con JSON válido, sin texto extra

FORMATO DE RESPUESTA:
Si falta info: {"pregunta": "texto que mandás al usuario", "datos": {...datos parciales actualizados...}}
Si está completo: {"listo": true, "datos": {...todos los datos...}}

La fecha siempre es hoy: ${new Date().toISOString().split('T')[0]}`

  const messages = historial.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      system: systemPrompt,
      messages,
    })

    const text = resp.content[0]?.type === 'text' ? resp.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return { pregunta: 'No entendí. ¿Podés repetir el gasto?' }
    return JSON.parse(match[0]) as ClaudeResponse
  } catch (err) {
    console.error('Claude agent error:', err)
    return { pregunta: '❌ Error interno. Intentá de nuevo.' }
  }
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

  if (!message || !['text', 'image'].includes(message.type)) {
    return NextResponse.json({ ok: true })
  }

  const from = message.from as string
  const admin = createAdminClient()

  const { data: perfil } = await admin
    .from('perfiles')
    .select('id, nombre')
    .eq('whatsapp_number', from)
    .single()

  if (!perfil) return NextResponse.json({ ok: true })

  try {
    const session = await getSession(admin, from)
    const txt = (message.text?.body as string)?.trim() ?? ''
    const txtLower = txt.toLowerCase()

    // Cancel any time
    if (['cancelar', 'cancel', 'salir'].includes(txtLower)) {
      await clearSession(admin, from)
      await send(from, '❌ Registro cancelado. Mandame un nuevo gasto cuando quieras.')
      return NextResponse.json({ ok: true })
    }

    // ── CONFIRMAR ────────────────────────────────────────────────────
    if (session.estado === 'confirmar') {
      if (['sí', 'si', 'yes', 'ok', 'dale', 'confirmar', 'confirmo'].includes(txtLower)) {
        const msg = await registrarGasto(admin, session.datos, perfil.id)
        await clearSession(admin, from)
        await send(from, msg)
      } else if (['no', 'nope'].includes(txtLower)) {
        await clearSession(admin, from)
        await send(from, '❌ Registro cancelado.')
      } else {
        await send(from, 'Respondé *sí* para confirmar o *no* para cancelar.')
      }
      return NextResponse.json({ ok: true })
    }

    // ── ASK COMPROBANTE ──────────────────────────────────────────────
    if (session.estado === 'ask_comprobante') {
      if (message.type === 'image') {
        const mediaId = message.image?.id as string | undefined
        if (mediaId) {
          const publicUrl = await uploadComprobante(admin, mediaId, session.datos)
          if (publicUrl) session.datos.comprobante_url = publicUrl
        }
        session.estado = 'confirmar'
        await saveSession(admin, from, session)
        await send(from, resumenConfirmacion(session.datos))
      } else if (['no', 'n/a', '-', 'omitir', 'sin comprobante'].includes(txtLower)) {
        session.datos.comprobante_url = null
        session.estado = 'confirmar'
        await saveSession(admin, from, session)
        await send(from, resumenConfirmacion(session.datos))
      } else {
        await send(from, '📸 Mandá la foto del comprobante, o escribí "no" para omitir.')
      }
      return NextResponse.json({ ok: true })
    }

    // ── RECOLECTANDO (Claude agent) ──────────────────────────────────
    if (message.type !== 'text' || !txt) return NextResponse.json({ ok: true })

    // Add user message to history
    session.historial.push({ role: 'user', content: txt })

    // Fetch obras
    const { data: obras } = await admin.from('obras').select('id, nombre').order('nombre').limit(20)

    // Call Claude
    const respuesta = await llamarAgente(session.historial, session.datos, obras ?? [])

    if (respuesta.listo && respuesta.datos) {
      // All data collected — ask for comprobante
      session.datos = { ...session.datos, ...respuesta.datos, fecha: new Date().toISOString().split('T')[0] }
      session.estado = 'ask_comprobante'
      session.historial.push({ role: 'assistant', content: '📸 ¿Tenés foto del comprobante? Mandala ahora o escribí "no" para omitir.' })
      await saveSession(admin, from, session)
      await send(from, '📸 ¿Tenés foto del comprobante? Mandala ahora o escribí "no" para omitir.')
    } else if (respuesta.pregunta) {
      // Update partial data if Claude extracted more
      if (respuesta.datos) session.datos = { ...session.datos, ...respuesta.datos }
      session.historial.push({ role: 'assistant', content: respuesta.pregunta })
      await saveSession(admin, from, session)
      await send(from, respuesta.pregunta)
    } else {
      await send(from, '❌ No pude procesar el gasto. Intentá de nuevo.')
    }

  } catch (err) {
    console.error('whatsapp webhook error:', err)
    await send(from, '❌ Ocurrió un error interno. Intentá de nuevo.')
  }

  return NextResponse.json({ ok: true })
}
