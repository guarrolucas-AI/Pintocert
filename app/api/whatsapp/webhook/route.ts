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

  // Sanitize categoria_central — Claude sometimes returns boolean or wrong type
  const VALID_CENTRAL = ['sueldo', 'combustible', 'maquina', 'material', 'retiro_socio', 'otro'] as const
  if (g.categoria_central && !VALID_CENTRAL.includes(g.categoria_central as typeof VALID_CENTRAL[number])) {
    // Try to infer from description
    const desc = (g.descripcion ?? '').toLowerCase()
    if (desc.includes('sueldo') || desc.includes('jornal') || desc.includes('salario')) g.categoria_central = 'sueldo'
    else if (desc.includes('combustible') || desc.includes('nafta') || desc.includes('gasoil')) g.categoria_central = 'combustible'
    else if (desc.includes('maquina') || desc.includes('equipo') || desc.includes('herramienta')) g.categoria_central = 'maquina'
    else if (desc.includes('material')) g.categoria_central = 'material'
    else if (desc.includes('retiro') || desc.includes('socio')) g.categoria_central = 'retiro_socio'
    else g.categoria_central = 'otro'
  }

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

interface ItemPresupuesto {
  descripcion: string
  unidad: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

interface ClaudeResponse {
  'intención'?: 'gasto' | 'compromiso' | 'pago_compromiso' | 'presupuesto'
  pregunta?: string
  listo?: boolean
  datos?: GastoDatos & {
    monto_total?: number
    monto_pago?: number
    categoria?: string
    // presupuesto fields
    cliente?: string
    obra_descripcion?: string
    obra_direccion?: string
    obra_localidad?: string
    items?: ItemPresupuesto[]
    notas?: string
  }
}

async function llamarAgente(
  historial: MensajeHistorial[],
  datosActuales: GastoDatos,
  obras: { id: string; nombre: string }[]
): Promise<ClaudeResponse> {
  const listaObras = obras.map(o => `- "${o.nombre}" (id: ${o.id})`).join('\n')

  const hoy = new Date().toISOString().split('T')[0]
  const datosJson = Object.keys(datosActuales).length ? JSON.stringify(datosActuales) : 'ninguno'
  const systemPrompt = `REGLA ABSOLUTA: Respondé SIEMPRE con un JSON válido y nada más. Cero texto libre antes o después. Solo el objeto JSON.

Sos un asistente de WhatsApp para una empresa constructora argentina. Manejás 4 intenciones:
1. gasto — algo que ya se pagó
2. compromiso — acuerdo cerrado con proveedor, sin pagar aún
3. pago_compromiso — pago parcial/total de un compromiso existente
4. presupuesto — armar presupuesto para presentar a un cliente

DATOS YA RECOLECTADOS EN ESTA CONVERSACIÓN: ${datosJson}
OBRAS EN EL SISTEMA: ${listaObras || 'ninguna'}
FECHA HOY: ${hoy}

REGLAS:
- Español argentino informal, tuteá
- Extraé todo lo posible de cada mensaje
- Para presupuesto: pedí cliente, obra_descripcion, obra_localidad, ítems. NUNCA marques listo:true si items está vacío o no existe — siempre preguntá los ítems antes de cerrar. Formato ítem: {descripcion, unidad, cantidad, precio_unitario, subtotal}. Calculá subtotal=cantidad×precio_unitario.
- Para gasto: tipo("obra"|"central"), descripcion, monto, categoria_obra("materiales"|"mano_obra"|"otros") o categoria_central("sueldo"|"combustible"|"maquina"|"material"|"retiro_socio"|"otro") — siempre string, nunca boolean

FORMATO OBLIGATORIO — solo JSON, sin texto extra:
Falta info: {"intención":"gasto"|"compromiso"|"pago_compromiso"|"presupuesto","pregunta":"...","datos":{...lo recolectado...}}
Completo:   {"intención":"gasto"|"compromiso"|"pago_compromiso"|"presupuesto","listo":true,"datos":{...todo...}}`

  // Keep only last 8 messages to minimize context size
  const recentHistory = historial.slice(-8)
  const messages = recentHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 700,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any) as { content: Array<{ type: string; text?: string }> }

    const text = resp.content[0]?.type === 'text' ? (resp.content[0].text ?? '') : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return { pregunta: 'No entendí bien. ¿Qué querés registrar? (gasto, compromiso, pago o presupuesto)' }
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

    // Reject messages that are too long for the bot to process
    if (txt.length > 800) {
      await send(from, '⚠️ Mensaje muy largo. El bot procesa mensajes cortos. Resumí en una o dos líneas qué querés registrar (ej: "presupuesto para Juan López, remodelación cocina").')
      return NextResponse.json({ ok: true })
    }

    // Add user message to history
    session.historial.push({ role: 'user', content: txt })

    // Fetch obras
    const { data: obras } = await admin.from('obras').select('id, nombre').order('nombre').limit(20)

    // Call Claude
    const respuesta = await llamarAgente(session.historial, session.datos, obras ?? [])

    if (respuesta.listo && respuesta.datos) {
      const intencion = respuesta['intención'] ?? 'gasto'
      const datos = respuesta.datos

      if (intencion === 'compromiso') {
        // Insert directly into compromisos_proveedor
        const { error } = await admin.from('compromisos_proveedor').insert({
          obra_id: datos.obra_id,
          descripcion: datos.descripcion,
          proveedor: datos.proveedor ?? null,
          categoria: datos.categoria ?? datos.categoria_obra ?? 'otros',
          monto_total: datos.monto_total ?? datos.monto,
          notas: null,
          created_by: perfil.id,
          estado: 'pendiente_aprobacion',
        })
        await clearSession(admin, from)
        if (error) await send(from, `❌ Error al registrar compromiso: ${error.message}`)
        else await send(from, `📋 Compromiso cargado en *${datos.obra_nombre}*\n${datos.descripcion} — ${formatARS(datos.monto_total ?? datos.monto ?? 0)}\n\n⏳ Pendiente de aprobación del administrador.`)
      } else if (intencion === 'pago_compromiso') {
        // Find the compromiso to pay
        const { data: matching } = await admin
          .from('compromisos_proveedor')
          .select('id, descripcion, monto_total')
          .eq('obra_id', datos.obra_id)
          .eq('estado', 'aprobado')
          .ilike('proveedor', `%${datos.proveedor ?? ''}%`)
          .limit(3)

        if (!matching || matching.length === 0) {
          await clearSession(admin, from)
          await send(from, `❌ No encontré compromisos aprobados para ese proveedor en la obra. Verificá en la app.`)
        } else if (matching.length === 1) {
          const { error } = await admin.from('compromiso_pagos').insert({
            compromiso_id: matching[0].id,
            monto: datos.monto_pago ?? datos.monto,
            fecha: datos.fecha ?? new Date().toISOString().split('T')[0],
            descripcion: datos.descripcion ?? null,
            created_by: perfil.id,
          })
          await clearSession(admin, from)
          if (error) await send(from, `❌ Error al registrar pago: ${error.message}`)
          else await send(from, `✅ Pago registrado\n${matching[0].descripcion} — ${formatARS(datos.monto_pago ?? datos.monto ?? 0)}`)
        } else {
          const lista = matching.map((m, i) => `${i + 1}. ${m.descripcion} (${formatARS(m.monto_total)})`).join('\n')
          await send(from, `¿A cuál compromiso corresponde el pago?\n${lista}\nRespondé con el número.`)
        }
      } else if (intencion === 'presupuesto') {
        const items: ItemPresupuesto[] = datos.items ?? []
        if (items.length === 0) {
          // Claude marked listo but forgot to ask for items
          session.historial.push({ role: 'assistant', content: '¿Qué ítems tiene el presupuesto? Describí cada uno con descripción, cantidad y precio unitario.' })
          await saveSession(admin, from, session)
          await send(from, '¿Qué ítems tiene el presupuesto? Describí cada uno con descripción, cantidad y precio unitario.')
          return NextResponse.json({ ok: true })
        }
        const subtotal = items.reduce((s: number, it: ItemPresupuesto) => s + it.subtotal, 0)
        const iva = Math.round(subtotal * 0.21)
        const total = subtotal + iva

        const { data: nuevo, error } = await admin.from('presupuestos').insert({
          cliente: datos.cliente ?? 'Sin nombre',
          obra_descripcion: datos.obra_descripcion ?? '',
          obra_direccion: datos.obra_direccion ?? '',
          obra_localidad: datos.obra_localidad ?? 'Buenos Aires',
          items,
          subtotal,
          monto_iva: iva,
          total,
          iva_porcentaje: 21,
          notas: datos.notas ?? null,
          created_by: perfil.id,
          estado: 'borrador',
        }).select('id').single()

        await clearSession(admin, from)
        if (error) {
          await send(from, `❌ Error al crear presupuesto: ${error.message}`)
        } else {
          const url = `https://cert.flippinghouses.com.ar/presupuestos/${nuevo.id}`
          await send(from,
            `✅ Presupuesto creado para *${datos.cliente}*\n` +
            `📋 ${items.length} ítem(s) — Total: ${formatARS(total)}\n\n` +
            `👉 Ver y descargar PDF:\n${url}`
          )
        }
      } else {
        // Regular gasto → ask for comprobante
        session.datos = { ...session.datos, ...datos, fecha: new Date().toISOString().split('T')[0] }
        session.estado = 'ask_comprobante'
        session.historial.push({ role: 'assistant', content: '📸 ¿Tenés foto del comprobante? Mandala ahora o escribí "no" para omitir.' })
        await saveSession(admin, from, session)
        await send(from, '📸 ¿Tenés foto del comprobante? Mandala ahora o escribí "no" para omitir.')
      }
    } else if (respuesta.pregunta) {
      if (respuesta.datos) session.datos = { ...session.datos, ...respuesta.datos }
      session.historial.push({ role: 'assistant', content: respuesta.pregunta })
      await saveSession(admin, from, session)
      await send(from, respuesta.pregunta)
    } else {
      await send(from, '❌ No pude procesar el mensaje. Intentá de nuevo.')
    }

  } catch (err) {
    console.error('whatsapp webhook error:', err)
    await send(from, '❌ Ocurrió un error interno. Intentá de nuevo.')
  }

  return NextResponse.json({ ok: true })
}
