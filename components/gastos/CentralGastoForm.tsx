'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createGastoCentral } from '@/lib/actions/gastos_central'
import type { CategoriaGastoCentral } from '@/lib/types'

const TIPOS_GASTO = [
  { value: 'sueldo', label: 'Sueldo', bgColor: 'bg-red-50', borderColor: 'border-red-300', textColor: 'text-red-900', dotColor: 'bg-red-600' },
  { value: 'combustible', label: 'Combustible', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', textColor: 'text-orange-900', dotColor: 'bg-orange-600' },
  { value: 'maquina', label: 'Máquina', bgColor: 'bg-blue-50', borderColor: 'border-blue-300', textColor: 'text-blue-900', dotColor: 'bg-blue-600' },
  { value: 'material', label: 'Material', bgColor: 'bg-green-50', borderColor: 'border-green-300', textColor: 'text-green-900', dotColor: 'bg-green-600' },
  { value: 'retiro_socio', label: 'Retiro de Socio', bgColor: 'bg-purple-50', borderColor: 'border-purple-300', textColor: 'text-purple-900', dotColor: 'bg-purple-600' },
  { value: 'otro', label: 'Otro', bgColor: 'bg-slate-50', borderColor: 'border-slate-300', textColor: 'text-slate-900', dotColor: 'bg-slate-600' },
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
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full py-3 px-4 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-colors"
      >
        + Agregar Gasto Central
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Nuevo Gasto Central</h3>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="text-slate-400 hover:text-slate-600 text-xl"
          title="Cerrar formulario"
        >
          ✕
        </button>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-sm flex gap-3 items-start">
          <span className="text-xl">⚠️</span>
          <div>{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Fecha */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Fecha</label>
          <Input
            type="date"
            value={formData.fecha}
            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>

        {/* Monto */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Monto (₡)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.monto}
            onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>
      </div>

      {/* Tipo de Gasto */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Gasto</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {TIPOS_GASTO.map((tipo) => (
            <label
              key={tipo.value}
              className={`
                relative rounded-lg border-2 p-3 cursor-pointer transition-all text-center
                ${formData.tipo_gasto === tipo.value
                  ? `${tipo.bgColor} ${tipo.borderColor} ring-2 ring-offset-2 ring-slate-400`
                  : `border-slate-200 bg-white hover:${tipo.bgColor}`
                }
              `}
            >
              <input
                type="radio"
                name="tipo_gasto"
                value={tipo.value}
                checked={formData.tipo_gasto === tipo.value}
                onChange={(e) => setFormData({ ...formData, tipo_gasto: e.target.value })}
                className="sr-only"
              />
              <div className="flex flex-col items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${tipo.dotColor}`}></div>
                <span className="text-xs font-medium text-slate-700">{tipo.label}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Categoría */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Categoría</label>
        <select
          value={formData.categoria}
          onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
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
        <label className="block text-sm font-medium text-slate-700 mb-2">Descripción <span className="text-red-600">*</span></label>
        <Textarea
          placeholder="Detalles del gasto"
          value={formData.descripcion}
          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          required
          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Comprobante Número */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">N° Comprobante</label>
          <Input
            placeholder="Ej: 001-00001234"
            value={formData.comprobante_numero}
            onChange={(e) => setFormData({ ...formData, comprobante_numero: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>

        {/* Proveedor */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Proveedor</label>
          <Input
            placeholder="Nombre del proveedor"
            value={formData.proveedor}
            onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>
      </div>

      {/* Archivo Comprobante */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Archivo Comprobante (PDF/JPG)</label>
        <div className="relative">
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setFormData({ ...formData, comprobante_archivo: e.target.files?.[0] || null })}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">Máximo 10 MB (PDF, JPG, PNG, WebP)</p>
        {formData.comprobante_archivo && (
          <p className="text-xs text-green-600 mt-1">✓ {formData.comprobante_archivo.name}</p>
        )}
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Notas (Opcional)</label>
        <Textarea
          placeholder="Notas adicionales"
          value={formData.notas}
          onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          disabled={isLoading}
          className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading || !formData.descripcion || !formData.monto}
          className="px-4 py-2 bg-yellow-600 text-white text-sm font-semibold rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Guardando...' : 'Guardar Gasto'}
        </button>
      </div>
    </form>
  )
}
