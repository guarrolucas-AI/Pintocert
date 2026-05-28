'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { ModuloAgente, MensajeChat, Presupuesto } from '@/lib/types'
import { validatePresupuesto } from '@/lib/utils'
import { Send, Bot, User, Loader2, Globe } from 'lucide-react'
import { toast } from 'sonner'

interface AgentChatProps {
  modo: ModuloAgente
  contexto?: Record<string, unknown>
  mensajesIniciales?: MensajeChat[]
  onDataGenerada?: (tipo: string, datos: unknown) => void
  onMensajesActualizados?: (mensajes: MensajeChat[]) => void
  placeholder?: string
  className?: string
}

const TRIGGER_INIT = '__INIT__'

export default function AgentChat({
  modo,
  contexto,
  mensajesIniciales,
  onDataGenerada,
  onMensajesActualizados,
  placeholder = 'Escribí tu mensaje...',
  className = '',
}: AgentChatProps) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>(mensajesIniciales ?? [])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [textoActual, setTextoActual] = useState('')
  const [buscandoWeb, setBuscandoWeb] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const inicializado = useRef(false)

  // Scroll al fondo siempre
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, textoActual])

  // Inicializar: el agente saluda primero
  useEffect(() => {
    if (inicializado.current) return
    if ((mensajesIniciales?.length ?? 0) > 0) {
      inicializado.current = true
      return
    }
    inicializado.current = true
    enviar(TRIGGER_INIT, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const enviar = useCallback(
    async (contenido: string, oculto = false) => {
      if (!contenido.trim() || streaming) return

      const mensajeUsuario: MensajeChat = { role: 'user', content: contenido }
      const nuevosMensajes = oculto
        ? mensajes  // no agregamos el trigger al historial visible
        : [...mensajes, mensajeUsuario]

      // Para la llamada a la API sí incluimos el mensaje de usuario
      const mensajesApi = oculto
        ? [...mensajes, mensajeUsuario]
        : nuevosMensajes

      if (!oculto) {
        setMensajes(nuevosMensajes)
        onMensajesActualizados?.(nuevosMensajes)
      }

      setInput('')
      setStreaming(true)
      setTextoActual('')
      setBuscandoWeb(false)

      // Validar presupuesto antes de enviar al agente (ahorra API calls)
      if (modo === 'presupuesto' && contexto?.presupuesto) {
        const validation = validatePresupuesto(contexto.presupuesto as Presupuesto)
        if (!validation.valid) {
          setTextoActual('❌ Por favor corrige antes de continuar:\n' + validation.errors.join('\n'))
          setStreaming(false)
          return
        }
      }

      try {
        const res = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: mensajesApi, modo, contexto }),
        })

        if (!res.ok || !res.body) throw new Error('Error en la respuesta del servidor')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let textoCompleto = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lineas = chunk.split('\n')

          for (const linea of lineas) {
            if (!linea.startsWith('data: ')) continue
            try {
              const evento = JSON.parse(linea.slice(6))

              if (evento.type === 'text') {
                textoCompleto += evento.text
                setTextoActual(textoCompleto)
              } else if (evento.type === 'tool_start') {
                setBuscandoWeb(true)
              } else if (evento.type === 'tool_end') {
                setBuscandoWeb(false)
              } else if (evento.type === 'error') {
                textoCompleto = `❌ ${evento.message}`
                setTextoActual(textoCompleto)
              } else if (evento.type === 'retrying') {
                setTextoActual(`⏳ API sobrecargada, reintentando (${evento.intento}/3)...`)
              }
            } catch {
              // ignorar líneas malformadas
            }
          }
        }

        // Detectar JSON siempre al finalizar el stream,
        // sin importar si llegó el evento 'done' o si el stream se cortó.
        detectarJSON(textoCompleto)

        // Agregar respuesta del asistente al historial (solo si tiene contenido)
        if (textoCompleto.trim()) {
          const mensajeAsistente: MensajeChat = { role: 'assistant', content: textoCompleto }
          const historialFinal = [...nuevosMensajes, mensajeAsistente]
          setMensajes(historialFinal)
          onMensajesActualizados?.(historialFinal)
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Error desconocido'
        const historialConError = [
          ...nuevosMensajes,
          { role: 'assistant' as const, content: `❌ Error: ${errMsg}` },
        ]
        setMensajes(historialConError)
      } finally {
        setStreaming(false)
        setTextoActual('')
        setBuscandoWeb(false)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    },
    [mensajes, modo, contexto, streaming, onMensajesActualizados],
  )

  function detectarJSON(texto: string) {
    // Intento 1: bloque ```json ... ```
    const regexBloque = /```json\s*([\s\S]*?)\s*```/g
    let match
    let encontrado = false

    while ((match = regexBloque.exec(texto)) !== null) {
      if (intentarParsear(match[1].trim())) encontrado = true
    }

    // Intento 2: JSON plano con {"tipo": "...", "datos": {...}}
    // El agente a veces no usa backticks
    if (!encontrado) {
      const regexPlano = /\{\s*"tipo"\s*:\s*"[^"]+"\s*,\s*"datos"\s*:\s*\{[\s\S]*?\}\s*\}/g
      while ((match = regexPlano.exec(texto)) !== null) {
        if (intentarParsear(match[0])) encontrado = true
      }
    }

    // Intento 3: buscar cualquier objeto JSON grande que empiece con {
    // Solo si tiene más de 200 chars (es un JSON de datos, no un fragmento)
    if (!encontrado) {
      const regexGrande = /(\{[\s\S]{200,}\})/g
      while ((match = regexGrande.exec(texto)) !== null) {
        if (intentarParsear(match[1])) { encontrado = true; break }
      }
    }
  }

  function intentarParsear(jsonStr: string): boolean {
    try {
      const obj = JSON.parse(jsonStr) as { tipo?: string; datos?: unknown }
      if (obj.tipo && obj.datos) {
        onDataGenerada?.(obj.tipo, obj.datos)
        console.log(`✓ JSON detectado: tipo=${obj.tipo}`)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar(input)
    }
  }

  // Mensajes visibles (sin los __INIT__ ocultos)
  const mensajesVisibles = mensajes.filter((m) => m.content !== TRIGGER_INIT)

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mensajesVisibles.length === 0 && !streaming && (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Iniciando agente...
          </div>
        )}

        {mensajesVisibles.map((m, i) => (
          <MensajeBurbuja key={i} mensaje={m} />
        ))}

        {/* Streaming en curso */}
        {streaming && (
          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center">
              <Bot className="w-4 h-4 text-black" />
            </div>
            <div className="flex-1">
              {buscandoWeb && (
                <div className="flex items-center gap-2 text-xs text-blue-500 mb-2">
                  <Globe className="w-3 h-3 animate-pulse" />
                  Buscando precios en la web...
                </div>
              )}
              {textoActual ? (
                <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm whitespace-pre-wrap">
                  <MarkdownSimple texto={textoActual} />
                  <span className="inline-block w-1.5 h-4 bg-slate-400 animate-pulse ml-0.5 align-middle" />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Pensando...
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-3 bg-white">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={streaming ? 'El agente está respondiendo...' : placeholder}
            disabled={streaming}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              max-h-32 overflow-y-auto"
            style={{ minHeight: '42px' }}
            onInput={(e) => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = `${Math.min(t.scrollHeight, 128)}px`
            }}
          />
          <button
            onClick={() => enviar(input)}
            disabled={!input.trim() || streaming}
            className="shrink-0 w-10 h-10 rounded-xl bg-yellow-400 hover:bg-yellow-300
              disabled:opacity-40 disabled:cursor-not-allowed
              flex items-center justify-center transition-colors"
          >
            <Send className="w-4 h-4 text-black" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1.5 ml-1">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  )
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function MensajeBurbuja({ mensaje }: { mensaje: MensajeChat }) {
  const esUsuario = mensaje.role === 'user'

  return (
    <div className={`flex gap-3 ${esUsuario ? 'flex-row-reverse' : ''}`}>
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          ${esUsuario ? 'bg-slate-700' : 'bg-yellow-400'}`}
      >
        {esUsuario ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-black" />
        )}
      </div>

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap
          ${esUsuario
            ? 'bg-slate-700 text-white rounded-tr-sm'
            : 'bg-slate-100 text-slate-800 rounded-tl-sm'
          }`}
      >
        <MarkdownSimple texto={mensaje.content} esUsuario={esUsuario} />
      </div>
    </div>
  )
}

// Renderizador mínimo de markdown: negrita, código inline, listas
function MarkdownSimple({ texto, esUsuario = false }: { texto: string; esUsuario?: boolean }) {
  // Ocultar bloques ```json ... ``` del chat (se muestran en el preview)
  const textoLimpio = texto.replace(/```json[\s\S]*?```/g, '📊 *Datos del presupuesto generados*')

  const lineas = textoLimpio.split('\n')

  return (
    <div className="space-y-1">
      {lineas.map((linea, i) => {
        // Encabezados
        if (linea.startsWith('### ')) {
          return <p key={i} className="font-bold text-xs uppercase tracking-wide opacity-70">{linea.slice(4)}</p>
        }
        if (linea.startsWith('## ')) {
          return <p key={i} className="font-bold">{linea.slice(3)}</p>
        }
        // Ítem de lista
        if (linea.startsWith('- ') || linea.startsWith('• ')) {
          return (
            <p key={i} className="flex gap-1.5">
              <span className="opacity-50">·</span>
              <InlineMarkdown texto={linea.slice(2)} esUsuario={esUsuario} />
            </p>
          )
        }
        // Línea numerada
        const numMatch = linea.match(/^(\d+)\.\s(.+)/)
        if (numMatch) {
          return (
            <p key={i} className="flex gap-1.5">
              <span className="opacity-50 shrink-0">{numMatch[1]}.</span>
              <InlineMarkdown texto={numMatch[2]} esUsuario={esUsuario} />
            </p>
          )
        }
        // Separador
        if (linea === '---') {
          return <hr key={i} className="border-slate-300 my-1" />
        }
        // Línea en blanco
        if (!linea.trim()) return <div key={i} className="h-1" />
        // Texto normal
        return <p key={i}><InlineMarkdown texto={linea} esUsuario={esUsuario} /></p>
      })}
    </div>
  )
}

function InlineMarkdown({ texto, esUsuario }: { texto: string; esUsuario: boolean }) {
  // Negrita **texto**
  const partes = texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return (
    <>
      {partes.map((parte, i) => {
        if (parte.startsWith('**') && parte.endsWith('**')) {
          return <strong key={i}>{parte.slice(2, -2)}</strong>
        }
        if (parte.startsWith('`') && parte.endsWith('`')) {
          return (
            <code
              key={i}
              className={`px-1 py-0.5 rounded text-xs font-mono
                ${esUsuario ? 'bg-white/20' : 'bg-slate-200'}`}
            >
              {parte.slice(1, -1)}
            </code>
          )
        }
        return <span key={i}>{parte}</span>
      })}
    </>
  )
}
