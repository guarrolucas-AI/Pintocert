import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { PrecioCache } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 120

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

/**
 * POST /api/precios/buscar
 * Busca precios de materiales en web y guarda en caché
 * Request: { materiales: string[] }
 * Response: { exitosos: PrecioCache[], errores: { material, error }[] }
 */
export async function POST(req: NextRequest) {
  try {
    const { materiales } = (await req.json()) as { materiales: string[] }

    if (!materiales || materiales.length === 0) {
      return NextResponse.json(
        { error: 'Se requieren materiales a buscar' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const exitosos: PrecioCache[] = []
    const errores: Array<{ material: string; error: string }> = []

    // Buscar cada material
    for (const material of materiales) {
      try {
        // Buscar en web (simulado - en producción usarías web_search real)
        const precioEncontrado = await buscarPrecioMaterial(material)

        if (precioEncontrado) {
          // Guardar/actualizar en caché
          const { data, error } = await supabase
            .from('precios_cache')
            .upsert({
              material_nombre: material,
              precio_unitario: precioEncontrado.precio_unitario,
              precio_minimo: precioEncontrado.precio_minimo,
              precio_maximo: precioEncontrado.precio_maximo,
              proveedor: precioEncontrado.proveedor,
              url_fuente: precioEncontrado.url_fuente,
              fecha_busqueda: new Date().toISOString(),
              valido_hasta: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }, {
              onConflict: 'material_nombre'
            })
            .select()
            .single()

          if (error) {
            errores.push({ material, error: error.message })
          } else if (data) {
            exitosos.push(data as PrecioCache)
          }
        } else {
          errores.push({ material, error: 'No se encontró precio para este material' })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errores.push({ material, error: msg })
      }
    }

    return NextResponse.json({
      exitosos,
      errores,
      resumen: `${exitosos.length}/${materiales.length} precios actualizados`
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * Busca precios reales en web usando Claude web_search
 * Extrae información de precios actualizados de MercadoLibre y otros proveedores
 */
async function buscarPrecioMaterial(material: string): Promise<{
  precio_unitario: number
  precio_minimo?: number
  precio_maximo?: number
  proveedor?: string
  url_fuente?: string
} | null> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 1024,
      tools: [
        {
          type: 'web_search',
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Busca el precio actual (ARS) de "${material}" en Argentina (MercadoLibre, ferreterías online, etc).

Responde EXACTAMENTE en este formato JSON (sin markdown):
{
  "precio_unitario": número,
  "precio_minimo": número,
  "precio_maximo": número,
  "proveedor": "nombre",
  "url_fuente": "url"
}

Usa precios reales encontrados en la búsqueda. Si no encuentras el producto exacto, busca alternativas similares.`,
        },
      ],
    })

    // Extraer respuesta de texto del response
    let respuestaTexto = ''
    for (const block of response.content) {
      if (block.type === 'text') {
        respuestaTexto = block.text
        break
      }
    }

    // Parsear JSON de la respuesta
    const jsonMatch = respuestaTexto.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn(`No se pudo extraer JSON para ${material}:`, respuestaTexto)
      return null
    }

    const precio = JSON.parse(jsonMatch[0])

    // Validar que tiene los campos necesarios
    if (!precio.precio_unitario || typeof precio.precio_unitario !== 'number') {
      console.warn(`Precio inválido para ${material}:`, precio)
      return null
    }

    return {
      precio_unitario: precio.precio_unitario,
      precio_minimo: precio.precio_minimo || precio.precio_unitario * 0.9,
      precio_maximo: precio.precio_maximo || precio.precio_unitario * 1.1,
      proveedor: precio.proveedor || 'Mercado Online',
      url_fuente: precio.url_fuente || undefined,
    }
  } catch (err) {
    console.error(`Error buscando precio para ${material}:`, err)
    return null
  }
}
