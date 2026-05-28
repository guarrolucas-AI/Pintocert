'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { FotoObra } from '@/lib/types'

interface FotoObraTimelineProps {
  fotos: FotoObra[]
}

export function FotoObraTimeline({ fotos }: FotoObraTimelineProps) {
  const [selectedFoto, setSelectedFoto] = useState<FotoObra | null>(null)

  if (fotos.length === 0) return null

  // Group fotos by date
  const fotosPorFecha = fotos.reduce(
    (acc, foto) => {
      const fecha = new Date(foto.fecha_foto).toLocaleDateString('es-AR')
      if (!acc[fecha]) acc[fecha] = []
      acc[fecha].push(foto)
      return acc
    },
    {} as Record<string, FotoObra[]>
  )

  const fechasOrdenadas = Object.keys(fotosPorFecha).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-slate-900">Timeline de Progreso</h3>

      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-200" />

        {/* Timeline Items */}
        <div className="space-y-4 pl-16">
          {fechasOrdenadas.map((fecha) => (
            <div key={fecha} className="space-y-2">
              {/* Date */}
              <div className="relative">
                <div className="absolute -left-13 top-1 w-8 h-8 bg-blue-500 rounded-full border-4 border-white flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <p className="font-medium text-slate-900">{fecha}</p>
              </div>

              {/* Fotos for this date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fotosPorFecha[fecha].map((foto) => (
                  <div
                    key={foto.id}
                    onClick={() => setSelectedFoto(foto)}
                    className="rounded-lg border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                  >
                    <div className="relative bg-slate-100 aspect-video overflow-hidden">
                      <img
                        src={foto.foto_url}
                        alt={foto.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-2">
                      <p className="text-sm font-medium text-slate-900 truncate">{foto.titulo}</p>
                      {foto.tags && foto.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {foto.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {foto.tags.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{foto.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal for full view */}
      {selectedFoto && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-40"
          onClick={() => setSelectedFoto(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedFoto.foto_url}
              alt={selectedFoto.titulo}
              className="w-full rounded-lg"
            />
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">{selectedFoto.titulo}</h3>
              {selectedFoto.descripcion && (
                <p className="text-sm text-muted-foreground">{selectedFoto.descripcion}</p>
              )}
              <p className="text-xs text-slate-500">
                {new Date(selectedFoto.fecha_foto).toLocaleDateString('es-AR')}
              </p>
              {selectedFoto.tags && selectedFoto.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedFoto.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
