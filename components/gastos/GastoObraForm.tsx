'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { toast } from 'sonner'
import { createGasto, getCategoriasPredefinidas, getCategoriasPersonalizadasUsuario } from '@/lib/actions/gastos'
import { Calendar, DollarSign, Package, Upload, X } from 'lucide-react'
import type { CategoriaGastoPersonalizado } from '@/lib/types'

const gastoSchema = z.object({
  fecha: z.string().refine(
    (date) => new Date(date) <= new Date(),
    'No se puede registrar gasto a fecha futura'
  ),
  categoria: z.string().min(1, 'Selecciona una categoría'),
  descripcion: z.string().min(3, 'La descripción debe tener al menos 3 caracteres'),
  monto: z.number().positive('El monto debe ser mayor a 0'),
  comprobante_numero: z.string().optional(),
  proveedor: z.string().optional(),
  notas: z.string().optional(),
})

type GastoFormData = z.infer<typeof gastoSchema>

interface GastoObraFormProps {
  obraId: string
  onSuccess?: () => void
}

const CATEGORIAS_PREDEFINIDAS = [
  { id: 'materiales', nombre: 'Materiales', color: '#3B82F6' },
  { id: 'mano_obra', nombre: 'Mano de Obra', color: '#10B981' },
  { id: 'otros', nombre: 'Otros', color: '#8B5CF6' },
  { id: 'seguros', nombre: 'Seguros', color: '#F59E0B' },
  { id: 'impuestos', nombre: 'Impuestos', color: '#EF4444' },
]

export function GastoObraForm({ obraId, onSuccess }: GastoObraFormProps) {
  const [isPending, startTransition] = useTransition()
  const [categoriasPersonalizadas, setCategoriasPersonalizadas] = useState<CategoriaGastoPersonalizado[]>([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GastoFormData>({
    resolver: zodResolver(gastoSchema),
    defaultValues: {
      fecha: new Date().toISOString().split('T')[0],
      categoria: 'materiales',
      descripcion: '',
      monto: 0,
      comprobante_numero: '',
      proveedor: '',
      notas: '',
    },
  })

  // Cargar categorías personalizadas cuando se abre el form
  const cargarCategorias = async () => {
    const { data } = await getCategoriasPersonalizadasUsuario()
    if (data) setCategoriasPersonalizadas(data)
    setMostrarForm(!mostrarForm)
  }

  const onSubmit = (data: GastoFormData) => {
    startTransition(async () => {
      const { error } = await createGasto({
        obra_id: obraId,
        fecha: data.fecha,
        categoria: data.categoria,
        descripcion: data.descripcion,
        monto: data.monto,
        comprobante_numero: data.comprobante_numero || undefined,
        proveedor: data.proveedor || undefined,
        notas: data.notas || undefined,
        comprobante_archivo: archivoSeleccionado || undefined,
      })

      if (error) {
        toast.error('Error: ' + error)
        return
      }

      toast.success('Gasto registrado correctamente')
      reset()
      setMostrarForm(false)
      setArchivoSeleccionado(null)
      onSuccess?.()
    })
  }

  const todasLasCategorias = [
    ...CATEGORIAS_PREDEFINIDAS,
    ...categoriasPersonalizadas.map((c) => ({ id: c.nombre, nombre: c.nombre, color: c.color_hex })),
  ]

  if (!mostrarForm) {
    return (
      <Button onClick={cargarCategorias} variant="outline" size="sm">
        <Package className="w-4 h-4 mr-2" />
        Registrar Gasto
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border p-4 bg-slate-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Nuevo Gasto</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setMostrarForm(false)}
          disabled={isPending}
        >
          ✕
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Fecha */}
        <div className="space-y-2">
          <Label htmlFor="fecha">Fecha *</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              id="fecha"
              type="date"
              {...register('fecha')}
              disabled={isPending}
              className="w-full pl-10 h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
            />
          </div>
          {errors.fecha && <p className="text-xs text-destructive">{errors.fecha.message}</p>}
        </div>

        {/* Categoría */}
        <div className="space-y-2">
          <Label htmlFor="categoria">Categoría *</Label>
          <select
            id="categoria"
            {...register('categoria')}
            disabled={isPending}
            className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          >
            {todasLasCategorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
          {errors.categoria && <p className="text-xs text-destructive">{errors.categoria.message}</p>}
        </div>

        {/* Descripción */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="descripcion">Descripción *</Label>
          <Textarea
            id="descripcion"
            placeholder="Ej: Pintura acrílica para fachada (2 baldes de 20L)"
            {...register('descripcion')}
            disabled={isPending}
            className="text-sm"
            rows={2}
          />
          {errors.descripcion && <p className="text-xs text-destructive">{errors.descripcion.message}</p>}
        </div>

        {/* Monto */}
        <div className="space-y-2">
          <Label htmlFor="monto">Monto ($) *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              id="monto"
              type="number"
              step="0.01"
              {...register('monto', { valueAsNumber: true })}
              disabled={isPending}
              placeholder="0.00"
              className="w-full pl-10 h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
            />
          </div>
          {errors.monto && <p className="text-xs text-destructive">{errors.monto.message}</p>}
        </div>

        {/* Comprobante */}
        <div className="space-y-2">
          <Label htmlFor="comprobante_numero">Comprobante #</Label>
          <input
            id="comprobante_numero"
            type="text"
            placeholder="Ej: FAC-001234"
            {...register('comprobante_numero')}
            disabled={isPending}
            className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          />
        </div>

        {/* Proveedor */}
        <div className="space-y-2">
          <Label htmlFor="proveedor">Proveedor</Label>
          <input
            id="proveedor"
            type="text"
            placeholder="Ej: Pinturas SA"
            {...register('proveedor')}
            disabled={isPending}
            className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          />
        </div>

        {/* Notas */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notas">Notas</Label>
          <Textarea
            id="notas"
            placeholder="Observaciones adicionales..."
            {...register('notas')}
            disabled={isPending}
            className="text-sm"
            rows={2}
          />
        </div>

        {/* Comprobante */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="comprobante">Comprobante (PDF o imagen)</Label>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-slate-400 transition-colors">
            <input
              id="comprobante"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  if (file.size > 10 * 1024 * 1024) {
                    toast.error('El archivo debe ser menor a 10 MB')
                    return
                  }
                  setArchivoSeleccionado(file)
                }
              }}
              disabled={isPending}
              className="hidden"
            />
            {archivoSeleccionado ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-slate-700 font-medium">{archivoSeleccionado.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setArchivoSeleccionado(null)}
                  disabled={isPending}
                  className="p-1 hover:bg-slate-200 rounded"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            ) : (
              <label htmlFor="comprobante" className="cursor-pointer block">
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Haz clic para subir o arrastra un archivo</p>
                <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG (máx 10 MB)</p>
              </label>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMostrarForm(false)}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Guardando...' : 'Guardar Gasto'}
        </Button>
      </div>
    </form>
  )
}
