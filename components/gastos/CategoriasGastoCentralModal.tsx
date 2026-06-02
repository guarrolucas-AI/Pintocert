'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createCategoriaGastoCentral, deleteCategoriaGastoCentral } from '@/lib/actions/gastos_central'
import { Trash2 } from 'lucide-react'
import type { CategoriaGastoCentral } from '@/lib/types'

interface CategoriasGastoCentralModalProps {
  categorias: CategoriaGastoCentral[]
  onSuccess?: () => void
}

export function CategoriasGastoCentralModal({
  categorias,
  onSuccess,
}: CategoriasGastoCentralModalProps) {
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [colorHex, setColorHex] = useState('#8B5CF6')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      const result = await createCategoriaGastoCentral({
        nombre,
        color_hex: colorHex,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess('Categoría creada correctamente')
        setNombre('')
        setColorHex('#8B5CF6')
        setShowForm(false)
        onSuccess?.()
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (categoriaId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta categoría?')) return

    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      const result = await deleteCategoriaGastoCentral(categoriaId)

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess('Categoría eliminada correctamente')
        onSuccess?.()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Categorías de Gastos Centrales</h2>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'outline' : 'default'}>
          {showForm ? 'Cancelar' : '+ Nueva Categoría'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded text-sm">{error}</div>
      )}

      {success && (
        <div className="bg-green-100 text-green-700 p-3 rounded text-sm">{success}</div>
      )}

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="border rounded-lg p-4 space-y-4 bg-slate-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <Input
                placeholder="Ej: Servicios, Seguros, etc."
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="h-10 w-16 rounded cursor-pointer"
                />
                <Input
                  type="text"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !nombre}>
              {isLoading ? 'Creando...' : 'Crear Categoría'}
            </Button>
          </div>
        </form>
      )}

      {/* Categories List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categorias.map((categoria) => (
          <div
            key={categoria.id}
            className="border rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded"
                style={{ backgroundColor: categoria.color_hex || '#8B5CF6' }}
              />
              <span className="font-medium">{categoria.nombre}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDelete(categoria.id)}
              disabled={isLoading}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {categorias.length === 0 && !showForm && (
        <div className="text-center py-8 text-slate-500">
          No hay categorías. Crea la primera usando el botón arriba.
        </div>
      )}
    </div>
  )
}
