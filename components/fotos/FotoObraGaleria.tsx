'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { deleteFotoObra } from '@/lib/actions/fotos'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, ZoomIn, X } from 'lucide-react'
import type { FotoObra } from '@/lib/types'

interface FotoObraGaleriaProps {
  fotos: FotoObra[]
  onFotoDeleted?: () => void
}

export function FotoObraGaleria({ fotos, onFotoDeleted }: FotoObraGaleriaProps) {
  const [isPending, startTransition] = useTransition()
  const [selectedFoto, setSelectedFoto] = useState<FotoObra | null>(null)
  const [filterTag, setFilterTag] = useState<string>('')

  // Get all unique tags
  const allTags = Array.from(
    new Set(
      fotos
        .flatMap((f) => f.tags || [])
        .filter(Boolean)
    )
  )

  // Filter fotos by tag
  const filteredFotos = filterTag
    ? fotos.filter((f) => (f.tags || []).includes(filterTag))
    : fotos

  const handleDelete = (fotoId: string) => {
    if (!confirm('¿Eliminar esta foto?')) return

    startTransition(async () => {
      const { error } = await deleteFotoObra(fotoId)

      if (error) {
        toast.error(error)
        return
      }

      toast.success('Foto eliminada')
      onFotoDeleted?.()
    })
  }

  if (fotos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
        <p className="text-sm text-muted-foreground">No hay fotos de esta obra aún</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tag Filter */}
      {allTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Filtrar por categoría:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterTag('')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filterTag === ''
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Todas ({fotos.length})
            </button>
            {allTags.map((tag) => {
              const count = fotos.filter((f) => (f.tags || []).includes(tag)).length
              return (
                <button
                  key={tag}
                  onClick={() => setFilterTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filterTag === tag
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {tag} ({count})
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFotos.map((foto) => (
          <div
            key={foto.id}
            className="rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* Image */}
            <div className="relative bg-slate-100 aspect-video overflow-hidden group">
              <img
                src={foto.foto_url}
                alt={foto.titulo}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <button
                onClick={() => setSelectedFoto(foto)}
                className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center"
              >
                <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              {/* Date Badge */}
              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {new Date(foto.fecha_foto).toLocaleDateString('es-AR')}
              </div>
            </div>

            {/* Info */}
            <div className="p-3 space-y-2">
              <h3 className="font-medium text-slate-900 truncate">{foto.titulo}</h3>

              {foto.descripcion && (
                <p className="text-xs text-muted-foreground line-clamp-2">{foto.descripcion}</p>
              )}

              {/* Tags */}
              {foto.tags && foto.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {foto.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Delete Button */}
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(foto.id)}
                  disabled={isPending}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredFotos.length === 0 && filterTag && (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm text-muted-foreground">No hay fotos con la categoría "{filterTag}"</p>
        </div>
      )}

      {/* Full Screen Modal */}
      {selectedFoto && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <button
            onClick={() => setSelectedFoto(null)}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div className="max-w-4xl w-full space-y-4">
            <img
              src={selectedFoto.foto_url}
              alt={selectedFoto.titulo}
              className="w-full h-auto rounded-lg"
            />

            <div className="bg-slate-900 rounded-lg p-4 text-white space-y-2">
              <h2 className="text-xl font-semibold">{selectedFoto.titulo}</h2>
              {selectedFoto.descripcion && (
                <p className="text-sm text-slate-300">{selectedFoto.descripcion}</p>
              )}
              <p className="text-xs text-slate-400">
                {new Date(selectedFoto.fecha_foto).toLocaleDateString('es-AR')}
              </p>
              {selectedFoto.tags && selectedFoto.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedFoto.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
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
