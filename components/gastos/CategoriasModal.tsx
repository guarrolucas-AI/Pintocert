'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createCategoriaPersonalizada, deleteCategoriaPersonalizada } from '@/lib/actions/gastos'
import { X, Plus, Trash2 } from 'lucide-react'
import type { CategoriaGastoPersonalizado } from '@/lib/types'

const categoriaNuevaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(50, 'Máximo 50 caracteres'),
  colorHex: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color debe ser válido (ej: #FF5733)'),
})

type CategoriaFormData = z.infer<typeof categoriaNuevaSchema>

const COLORES_SUGERIDOS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E9', // Light Blue
  '#F8B195', // Orange
  '#C39BD3', // Plum
]

interface CategoriasModalProps {
  categorias: CategoriaGastoPersonalizado[]
  onCategoriaAdded?: () => void
  onCategoriaDeleted?: () => void
  isOpen: boolean
  onClose: () => void
}

export function CategoriasModal({
  categorias,
  onCategoriaAdded,
  onCategoriaDeleted,
  isOpen,
  onClose,
}: CategoriasModalProps) {
  const [isPending, startTransition] = useTransition()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [colorSeleccionado, setColorSeleccionado] = useState(COLORES_SUGERIDOS[0])
  const [deletingCategoriaId, setDeletingCategoriaId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoriaFormData>({
    resolver: zodResolver(categoriaNuevaSchema),
    defaultValues: {
      nombre: '',
      colorHex: COLORES_SUGERIDOS[0],
    },
  })

  const onSubmit = (data: CategoriaFormData) => {
    startTransition(async () => {
      const { error } = await createCategoriaPersonalizada(data.nombre, colorSeleccionado)

      if (error) {
        toast.error('Error: ' + error)
        return
      }

      toast.success('Categoría creada')
      reset()
      setMostrarForm(false)
      setColorSeleccionado(COLORES_SUGERIDOS[0])
      onCategoriaAdded?.()
    })
  }

  const handleDelete = (categoriaId: string) => {
    if (!confirm('¿Eliminar esta categoría?')) return

    startTransition(async () => {
      const { error } = await deleteCategoriaPersonalizada(categoriaId)

      if (error) {
        toast.error('Error: ' + error)
        return
      }

      toast.success('Categoría eliminada')
      setDeletingCategoriaId(null)
      onCategoriaDeleted?.()
    })
  }

  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Categorías Personalizadas</h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isPending}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Categorías List */}
          <div className="space-y-3 mb-6">
            {categorias.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aún no tienes categorías personalizadas
              </p>
            ) : (
              categorias.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full shrink-0 border-2 border-slate-300"
                      style={{ backgroundColor: cat.color_hex }}
                    />
                    <p className="font-medium text-slate-900">{cat.nombre}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(cat.id)}
                    disabled={isPending || deletingCategoriaId === cat.id}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Separator */}
          {categorias.length > 0 && <div className="my-4 border-t border-slate-200" />}

          {/* New Category Form */}
          {!mostrarForm ? (
            <Button
              onClick={() => setMostrarForm(true)}
              disabled={isPending}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Categoría
            </Button>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  placeholder="Ej: Electricidad"
                  {...register('nombre')}
                  disabled={isPending}
                />
                {errors.nombre && (
                  <p className="text-xs text-destructive">{errors.nombre.message}</p>
                )}
              </div>

              {/* Color Selection */}
              <div className="space-y-3">
                <Label>Color</Label>

                {/* Suggested Colors */}
                <div className="grid grid-cols-5 gap-2">
                  {COLORES_SUGERIDOS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setColorSeleccionado(color)}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        colorSeleccionado === color
                          ? 'border-slate-900 scale-105 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>

                {/* Custom Color Picker */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      id="colorHex"
                      type="text"
                      placeholder="#FF5733"
                      value={colorSeleccionado}
                      onChange={(e) => setColorSeleccionado(e.target.value.toUpperCase())}
                      disabled={isPending}
                      maxLength={7}
                    />
                  </div>
                  <div
                    className="w-10 h-10 rounded-lg border-2 border-slate-200 shrink-0"
                    style={{ backgroundColor: colorSeleccionado }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMostrarForm(false)
                    reset()
                    setColorSeleccionado(COLORES_SUGERIDOS[0])
                  }}
                  disabled={isPending}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending} className="flex-1">
                  {isPending ? 'Guardando...' : 'Crear'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
