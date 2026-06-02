'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createGastoCentral } from '@/lib/actions/gastos_central'
import type { CategoriaGastoCentral } from '@/lib/types'

const TIPOS_GASTO = [
  { value: 'sueldo', label: 'Sueldo', color: '#10B981' },
  { value: 'combustible', label: 'Combustible', color: '#F59E0B' },
  { value: 'maquina', label: 'Máquina', color: '#6366F1' },
  { value: 'material', label: 'Material', color: '#3B82F6' },
  { value: 'retiro_socio', label: 'Retiro de Socio', color: '#EF4444' },
  { value: 'otro', label: 'Otro', color: '#8B5CF6' },
]

interface CentralGastoFormProps {
  categorias: CategoriaGastoCentral[]
  onSuccess?: () => void
}

export function CentralGastoForm({ categorias, onSuccess }: CentralGastoFormProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo_gasto: 'otro',
    categoria: categorias[0]?.nombre || '',
    descripcion: '',
    monto: '',
    comprobante_numero: '',
    proveedor: '',
    notas: '',
    comprobante_archivo: null as File | null,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await createGastoCentral({
        fecha: formData.fecha,
        tipo_gasto: formData.tipo_gasto,
        categoria: formData.categoria,
        descripcion: formData.descripcion,
        monto: parseFloat(formData.monto),
        comprobante_numero: formData.comprobante_numero || undefined,
        proveedor: formData.proveedor || undefined,
        notas: formData.notas || undefined,
        comprobante_archivo: formData.comprobante_archivo || undefined,
      })

      if (result.error) {
        setError(result.error)
      } else {
        // Reset form
        setFormData({
          fecha: new Date().toISOString().split('T')[0],
          tipo_gasto: 'otro',
          categoria: categorias[0]?.nombre || '',
          descripcion: '',
          monto: '',
          comprobante_numero: '',
          proveedor: '',
          notas: '',
          comprobante_archivo: null,
        })
        setIsExpanded(false)
        onSuccess?.()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear gasto')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isExpanded) {
    return (
      <Button
        onClick={() => setIsExpanded(true)}
        className="w-full"
      >
        + Agregar Gasto Central
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4 bg-slate-50">
      <h3 className="font-semibold text-lg">Nuevo Gasto Central</h3>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Fecha */}
        <div>
          <label className="block text-sm font-medium mb-1">Fecha</label>
          <Input
            type="date"
            value={formData.fecha}
            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
            required
          />
        </div>

        {/* Monto */}
        <div>
          <label className="block text-sm font-medium mb-1">Monto (ARS)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.monto}
            onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Tipo de Gasto */}
      <div>
        <label className="block text-sm font-medium mb-2">Tipo de Gasto</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TIPOS_GASTO.map((tipo) => (
            <label key={tipo.value} className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="tipo_gasto"
                value={tipo.value}
                checked={formData.tipo_gasto === tipo.value}
                onChange={(e) => setFormData({ ...formData, tipo_gasto: e.target.value })}
                className="mr-2"
              />
              <span className="text-sm">{tipo.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Categoría */}
      <div>
        <label className="block text-sm font-medium mb-1">Categoría</label>
        <select
          value={formData.categoria}
          onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
          className="w-full px-3 py-2 border rounded-md text-sm"
          required
        >
          <option value="">Seleccionar categoría</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.nombre}>
              {cat.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium mb-1">Descripción</label>
        <Textarea
          placeholder="Detalles del gasto"
          value={formData.descripcion}
          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Comprobante Número */}
        <div>
          <label className="block text-sm font-medium mb-1">N° Comprobante</label>
          <Input
            placeholder="Ej: 001-00001234"
            value={formData.comprobante_numero}
            onChange={(e) => setFormData({ ...formData, comprobante_numero: e.target.value })}
          />
        </div>

        {/* Proveedor */}
        <div>
          <label className="block text-sm font-medium mb-1">Proveedor</label>
          <Input
            placeholder="Nombre del proveedor"
            value={formData.proveedor}
            onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
          />
        </div>
      </div>

      {/* Archivo Comprobante */}
      <div>
        <label className="block text-sm font-medium mb-1">Archivo Comprobante (PDF/JPG)</label>
        <Input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={(e) => setFormData({ ...formData, comprobante_archivo: e.target.files?.[0] || null })}
        />
        <p className="text-xs text-slate-500 mt-1">Máximo 10 MB</p>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium mb-1">Notas (Opcional)</label>
        <Textarea
          placeholder="Notas adicionales"
          value={formData.notas}
          onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
          rows={2}
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsExpanded(false)}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !formData.descripcion || !formData.monto}
        >
          {isLoading ? 'Guardando...' : 'Guardar Gasto'}
        </Button>
      </div>
    </form>
  )
}
