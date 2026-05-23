import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PrecioCache } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 120

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
 * Simula búsqueda de precio en mercado
 * En producción: usaría web_search real
 */
async function buscarPrecioMaterial(material: string): Promise<{
  precio_unitario: number
  precio_minimo?: number
  precio_maximo?: number
  proveedor?: string
  url_fuente?: string
} | null> {
  // Precios de ejemplo - en producción harías web_search real
  const preciosEjemplo: Record<string, any> = {
    'pintura sinteplast interior': {
      precio_unitario: 4800,
      precio_minimo: 4500,
      precio_maximo: 5200,
      proveedor: 'MercadoLibre',
    },
    'pintura sinteplast exterior': {
      precio_unitario: 5800,
      precio_minimo: 5500,
      precio_maximo: 6200,
      proveedor: 'MercadoLibre',
    },
    'fijador sinteplast': {
      precio_unitario: 18000,
      precio_minimo: 16500,
      precio_maximo: 19500,
      proveedor: 'MercadoLibre',
    },
    'impermeabilizante sinteplast': {
      precio_unitario: 12500,
      precio_minimo: 11500,
      precio_maximo: 13500,
      proveedor: 'MercadoLibre',
    },
  }

  const clave = material.toLowerCase()
  return preciosEjemplo[clave] || null
}
