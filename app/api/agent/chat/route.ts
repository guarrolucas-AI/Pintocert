import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSystemPrompt } from '@/lib/agent/prompts'
import type { ModuloAgente, MensajeChat } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: NextRequest) {
  const { messages, modo, contexto } = (await req.json()) as {
    messages: MensajeChat[]
    modo: ModuloAgente
    contexto?: Record<string, unknown>
  }

  const systemPrompt = getSystemPrompt(modo, contexto)
  const usaWebSearch = modo === 'materiales' || modo === 'herramientas'

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tools = usaWebSearch
          ? ([{ type: 'web_search_20260209', name: 'web_search' }] as any[])
          : undefined

        const msgStream = anthropic.messages.stream({
          model: 'claude-opus-4-7',
          max_tokens: 8000,
          thinking: { type: 'adaptive' },
          system: systemPrompt,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        send({ type: 'error', message: msg })
        controller.close()
      }
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
