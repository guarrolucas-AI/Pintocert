import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSystemPrompt } from '@/lib/agent/prompts'
import type { ModuloAgente, MensajeChat } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 120

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Análisis usa Opus con thinking para razonamiento profundo.
// El resto usa Sonnet: más rápido y suficientemente capaz para chat conversacional.
const MODEL_POR_MODO: Record<ModuloAgente, string> = {
  presupuesto:  'claude-sonnet-4-6',
  materiales:   'claude-sonnet-4-6',
  personal:     'claude-sonnet-4-6',
  herramientas: 'claude-sonnet-4-6',
  analisis:     'claude-opus-4-7',
}

/**
 * Convierte el historial de mensajes agregando cache_control al
 * penúltimo mensaje. Esto le indica a Anthropic que cachee todo el
 * historial previo y solo procese el último turno del usuario.
 *
 * Beneficio: ~90% menos costo en tokens repetidos + menor latencia
 * en conversaciones largas.
 */
function buildMessages(messages: MensajeChat[]) {
  return messages.map((m, idx) => {
    // Cachear el penúltimo mensaje (el historial estable justo antes
    // del último turno del usuario que sí necesita procesarse fresco)
    const cachear = messages.length > 1 && idx === messages.length - 2
    return {
      role: m.role,
      content: cachear
        ? [{ type: 'text' as const, text: m.content, cache_control: { type: 'ephemeral' as const } }]
        : m.content,
    }
  })
}

export async function POST(req: NextRequest) {
  const { messages, modo, contexto } = (await req.json()) as {
    messages: MensajeChat[]
    modo: ModuloAgente
    contexto?: Record<string, unknown>
  }

  const systemPrompt = getSystemPrompt(modo, contexto)
  const usaWebSearch = modo === 'materiales' || modo === 'herramientas'
  const model = MODEL_POR_MODO[modo] ?? 'claude-sonnet-4-6'
  const usaThinking = modo === 'analisis'

  // System prompt con cache_control — se cachea en la primera llamada
  // y se reutiliza en todos los turnos siguientes de la misma sesión.
  const systemConCache = [
    {
      type: 'text' as const,
      text: systemPrompt,
      cache_control: { type: 'ephemeral' as const },
    },
  ]

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))

      const MAX_REINTENTOS = 3

      for (let intento = 0; intento <= MAX_REINTENTOS; intento++) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tools = usaWebSearch
            ? ([{ type: 'web_search_20260209', name: 'web_search' }] as any[])
            : undefined

          const msgStream = anthropic.messages.stream({
            model,
            max_tokens: usaThinking ? 8000 : 4096,
            ...(usaThinking ? { thinking: { type: 'adaptive' } } : {}),
            system: systemConCache,
            messages: buildMessages(messages),
            ...(tools ? { tools } : {}),
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
