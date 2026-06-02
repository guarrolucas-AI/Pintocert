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
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900">Categorías de Gastos Centrales</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showForm
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              : 'bg-yellow-600 text-white hover:bg-yellow-700'
          }`}
        >
          {showForm ? 'Cancelar' : '+ Nueva Categoría'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm flex gap-3 items-start">
          <span className="text-lg">⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm flex gap-3 items-start">
          <span className="text-lg">✓</span>
          <div>{success}</div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nombre <span className="text-red-600">*</span></label>
              <Input
                placeholder="Ej: Servicios, Seguros, etc."
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="h-10 w-16 rounded-md border border-slate-200 cursor-pointer"
                />
                <Input
                  type="text"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  placeholder="#000000"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={isLoading}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !nombre}
              className="px-4 py-2 bg-yellow-600 text-white text-sm font-semibold rounded-lg hover:bg-yellow-700 disabled:opacity-50"
            >
              {isLoading ? 'Creando...' : 'Crear Categoría'}
            </button>
          </div>
        </form>
      )}

      {/* Categories List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categorias.map((categoria) => (
          <div
            key={categoria.id}
            className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full border-2"
                style={{
                  backgroundColor: categoria.color_hex || '#8B5CF6',
                  borderColor: categoria.color_hex || '#8B5CF6',
                }}
              />
              <span className="font-medium text-slate-900">{categoria.nombre}</span>
            </div>
            <button
              onClick={() => handleDelete(categoria.id)}
              disabled={isLoading}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {categorias.length === 0 && !showForm && (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-slate-600 font-medium">No hay categorías</p>
          <p className="text-sm text-slate-500 mt-1">Crea la primera usando el botón arriba</p>
        </div>
      )}
    </div>
  )
}
