import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getSystemPrompt } from '@/lib/agent/prompts'
import type { ModuloAgente, MensajeChat, Presupuesto, PrecioCache } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 120

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Análisis usa Opus con thinking para razonamiento profundo.
// El resto usa Sonnet: más rápido y suficientemente capaz para chat conversacional.
const MODEL_POR_MODO: Record<ModuloAgente, string> = {
  presupuesto:  'claude-haiku-4-5',
  materiales:   'claude-haiku-4-5',
  personal:     'claude-haiku-4-5',
  herramientas: 'claude-haiku-4-5',
  analisis:     'claude-sonnet-4-6',
}

/**
 * Fetch cached prices from Supabase (valid precios within 30-day window)
 */
async function fetchCachedPrices(): Promise<PrecioCache[]> {
  try {
    const supabase = await createClient()
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('precios_cache')
      .select('*')
      .gte('valido_hasta', now)
      .order('fecha_busqueda', { ascending: false })

    if (error || !data) {
      console.warn('Error fetching cached prices:', error?.message)
      return []
    }

    return data as PrecioCache[]
  } catch (err) {
    console.error('Failed to fetch cached prices:', err)
    return []
  }
}

/**
 * Formats cached prices for display in system prompt
 */
function formatCachedPricesForPrompt(precios: PrecioCache[]): string {
  if (precios.length === 0) return ''

  const formatted = precios
    .map(
      (p) =>
        `- ${p.material_nombre}: $${p.precio_unitario.toLocaleString('es-AR')} (min: $${(p.precio_minimo ?? p.precio_unitario).toLocaleString('es-AR')}, máx: $${(p.precio_maximo ?? p.precio_unitario).toLocaleString('es-AR')}) — ${p.proveedor || 'Sin proveedor'}`
    )
    .join('\n')

  return `PRECIOS EN CACHÉ (últimas búsquedas, vigentes hasta fecha indicada):
${formatted}

Usar estos precios actualizados en lugar de los precios de referencia si están disponibles.`
}

/**
 * Builds cache block for presupuesto context
 * Reused across presupuesto → materiales → personal → herramientas transitions
 * Cached for 5 minutes (ephemeral cache)
 */
function buildCacheBlocks(presupuesto: Presupuesto | null) {
  if (!presupuesto) return []

  return [
    {
      type: 'text' as const,
      text: `PRESUPUESTO ACTUAL (contexto reutilizable para este módulo y los siguientes):
Cliente: ${presupuesto.cliente}
Obra: ${presupuesto.obra_descripcion}
Dirección: ${presupuesto.obra_direccion}, ${presupuesto.obra_localidad}
Subtotal: $${presupuesto.subtotal.toLocaleString('es-AR')}
Total con IVA: $${presupuesto.total.toLocaleString('es-AR')}
Anticipo: $${(presupuesto.anticipo ?? presupuesto.total * 0.35).toLocaleString('es-AR')}

Trabajos:
${presupuesto.items.map(i => `- ${i.descripcion}: ${i.cantidad} ${i.unidad} × $${i.precio_unitario.toLocaleString('es-AR')} = $${(i.cantidad * i.precio_unitario).toLocaleString('es-AR')}`).join('\n')}`,
      cache_control: { type: 'ephemeral' as const },
    },
  ]
}

/**
 * Convierte el historial de mensajes para reutilizar cache
 * Mantiene el historial completo para conversaciones multimodales
 */
function buildMessages(messages: MensajeChat[]) {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))
}

export async function POST(req: NextRequest) {
  const { messages, modo, contexto } = (await req.json()) as {
    messages: MensajeChat[]
    modo: ModuloAgente
    contexto?: Record<string, unknown>
  }

  // Fetch cached prices for materiales module
  let enriquecidoContexto = contexto ?? {}
  if (modo === 'materiales') {
    const preciosEnCache = await fetchCachedPrices()
    if (preciosEnCache.length > 0) {
      enriquecidoContexto = {
        ...contexto,
        preciosEnCache,
        preciosCacheFormateado: formatCachedPricesForPrompt(preciosEnCache),
      }
    }
  }

  const systemPrompt = getSystemPrompt(modo, enriquecidoContexto)
  const model = MODEL_POR_MODO[modo] ?? 'claude-sonnet-4-6'
  const usaThinking = modo === 'analisis'

  // System prompt con cache_control — se cachea en la primera llamada
  // y se reutiliza en todos los turnos siguientes de la misma sesión.
  // Web search está DESHABILITADO en todos los módulos (usar precios de referencia)
  const systemConCache = [
    {
      type: 'text' as const,
      text: systemPrompt,
      cache_control: { type: 'ephemeral' as const },
    },
  ]

  // Agregar contexto de presupuesto como bloque cacheado (reutilizable en módulos posteriores)
  const presupuestoContext = buildCacheBlocks((contexto?.presupuesto as Presupuesto) ?? null)
  const systemMessages = [...systemConCache, ...presupuestoContext]

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))

      const MAX_REINTENTOS = 3

      for (let intento = 0; intento <= MAX_REINTENTOS; intento++) {
        try {
          // Web search HABILITADO para materiales (búsqueda de precios reales)
          // Deshabilitado para otros módulos para reducir costos
          const toolsConfig = modo === 'materiales' ? [{ type: 'web_search' as const }] : undefined

          const msgStream = anthropic.messages.stream({
            model,
            max_tokens: usaThinking ? 8000 : 4096,
            ...(usaThinking ? { thinking: { type: 'adaptive' } } : {}),
            system: systemMessages,
            messages: buildMessages(messages),
            ...(toolsConfig ? { tools: toolsConfig } : {}),
          })

          for await (const event of msgStream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              send({ type: 'text', text: event.delta.text })
            } else if (event.type === 'content_block_start') {
              const cb = event.content_block
              if (cb.type === 'server_tool_use') {
                send({ type: 'tool_start', name: cb.name })
              } else if (cb.type === 'web_search_tool_result') {
                send({ type: 'tool_end' })
              }
            }
          }

          send({ type: 'done' })
          controller.close()
          return // éxito — salir del loop

        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          const esOverloaded = msg.includes('overloaded') || msg.includes('529')

          if (esOverloaded && intento < MAX_REINTENTOS) {
            const espera = (intento + 1) * 3000 // 3s, 6s, 9s
            send({ type: 'retrying', intento: intento + 1, espera })
            await new Promise((r) => setTimeout(r, espera))
            continue
          }

          const msgFriendly = esOverloaded
            ? 'La API de Anthropic está temporalmente sobrecargada. Intentá de nuevo en unos segundos.'
            : msg
          send({ type: 'error', message: msgFriendly })
          controller.close()
          return
        }
      } // fin del loop de reintentos
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
