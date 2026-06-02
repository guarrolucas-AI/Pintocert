'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { deleteGastoCentral, updateGastoCentral } from '@/lib/actions/gastos_central'
import { formatARS } from '@/lib/utils'
import { Trash2, Edit2 } from 'lucide-react'
import type { GastoCentral, CategoriaGastoCentral } from '@/lib/types'

const TIPO_GASTO_COLORS: Record<string, { label: string; bgColor: string; textColor: string; dotColor: string; borderColor: string }> = {
  sueldo: { label: 'Sueldo', bgColor: 'bg-red-50', textColor: 'text-red-900', dotColor: 'bg-red-600', borderColor: 'border-red-300' },
  combustible: { label: 'Combustible', bgColor: 'bg-orange-50', textColor: 'text-orange-900', dotColor: 'bg-orange-600', borderColor: 'border-orange-300' },
  maquina: { label: 'Máquina', bgColor: 'bg-blue-50', textColor: 'text-blue-900', dotColor: 'bg-blue-600', borderColor: 'border-blue-300' },
  material: { label: 'Material', bgColor: 'bg-green-50', textColor: 'text-green-900', dotColor: 'bg-green-600', borderColor: 'border-green-300' },
  retiro_socio: { label: 'Retiro de Socio', bgColor: 'bg-purple-50', textColor: 'text-purple-900', dotColor: 'bg-purple-600', borderColor: 'border-purple-300' },
  otro: { label: 'Otro', bgColor: 'bg-slate-50', textColor: 'text-slate-900', dotColor: 'bg-slate-600', borderColor: 'border-slate-300' },
}

interface CentralGastosTableProps {
  gastos: GastoCentral[]
  categorias: CategoriaGastoCentral[]
  onDelete?: () => void
  onUpdate?: () => void
}

export function CentralGastosTable({ gastos, categorias, onDelete, onUpdate }: CentralGastosTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<GastoCentral>>({})
  const [filterTipo, setFilterTipo] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const filteredGastos = filterTipo
    ? gastos.filter((g) => g.tipo_gasto === filterTipo)
    : gastos

  const totalFiltered = filteredGastos.reduce((sum, g) => sum + g.monto, 0)

  const handleEdit = (gasto: GastoCentral) => {
    setEditingId(gasto.id)
    setEditData(gasto)
  }

  const handleSaveEdit = async (gastoId: string) => {
    setIsLoading(true)
    try {
      const result = await updateGastoCentral(gastoId, editData)
      if (!result.error) {
        setEditingId(null)
        setEditData({})
        onUpdate?.()
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (gastoId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este gasto?')) return

    setIsLoading(true)
    try {
      const result = await deleteGastoCentral(gastoId)
      if (!result.error) {
        onDelete?.()
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (gastos.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No hay gastos centrales registrados
      </div>
    )
  }

  // Show filter stats
  const tipoStats = gastos.reduce(
    (acc, g) => ({
      ...acc,
      [g.tipo_gasto]: (acc[g.tipo_gasto] || 0) + g.monto,
    }),
    {} as Record<string, number>
  )

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-200">
        <button
          onClick={() => setFilterTipo('')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
            filterTipo === ''
              ? 'bg-yellow-600 text-white border-yellow-600'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todos ({gastos.length})
        </button>
        {Object.entries(TIPO_GASTO_COLORS).map(([tipo, { label, bgColor, textColor, dotColor }]) => {
          const count = gastos.filter((g) => g.tipo_gasto === tipo).length
          const total = tipoStats[tipo] || 0
          if (count === 0) return null

          return (
            <button
              key={tipo}
              onClick={() => setFilterTipo(filterTipo === tipo ? '' : tipo)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors flex items-center gap-1 ${
                filterTipo === tipo
                  ? `${bgColor} ${textColor} border-transparent ring-2 ring-offset-1 ring-slate-300`
                  : `bg-white ${textColor} border-slate-200 hover:${bgColor}`
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
              {label} ({count})
            </button>
          )
        })}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto bg-white border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-slate-900">Fecha</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-900">Tipo</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-900">Categoría</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-900">Descripción</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-900">Monto</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-900">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredGastos.map((gasto, idx) => (
              <tr key={gasto.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <td className="py-3 px-4 text-slate-600">{gasto.fecha}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${TIPO_GASTO_COLORS[gasto.tipo_gasto]?.dotColor || 'bg-slate-400'}`}></span>
                    <span className="text-sm font-medium text-slate-900">{TIPO_GASTO_COLORS[gasto.tipo_gasto]?.label}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-700">{gasto.categoria}</td>
                <td className="py-3 px-4 text-slate-600 max-w-md truncate">{gasto.descripcion}</td>
                <td className="text-right py-3 px-4 font-semibold text-slate-900">{formatARS(gasto.monto)}</td>
                <td className="text-center py-3 px-4 space-x-1">
                  <button
                    onClick={() => handleEdit(gasto)}
                    disabled={isLoading}
                    className="inline-block p-1.5 hover:bg-blue-50 text-blue-600 rounded transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(gasto.id)}
                    disabled={isLoading}
                    className="inline-block p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {filteredGastos.map((gasto) => (
          <div key={gasto.id} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            {/* Header with tipo and fecha */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${TIPO_GASTO_COLORS[gasto.tipo_gasto]?.dotColor}`}></span>
                <span className="text-sm font-medium text-slate-900">{TIPO_GASTO_COLORS[gasto.tipo_gasto]?.label}</span>
              </div>
              <span className="text-xs text-slate-500">{gasto.fecha}</span>
            </div>

            {/* Description and details */}
            <div className="space-y-1">
              <p className="font-medium text-slate-900">{gasto.descripcion}</p>
              <p className="text-xs text-slate-500">Categoría: {gasto.categoria}</p>
            </div>

            {/* Amount */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-slate-600 text-sm">Monto:</span>
              <span className="text-lg font-semibold text-slate-900">{formatARS(gasto.monto)}</span>
            </div>

            {/* Edit form */}
            {editingId === gasto.id && (
              <div className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-200">
                <textarea
                  value={editData.notas || ''}
                  onChange={(e) => setEditData({ ...editData, notas: e.target.value })}
                  className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Notas"
                />
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleSaveEdit(gasto.id)}
                    disabled={isLoading}
                    className="flex-1 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-md transition-colors"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    disabled={isLoading}
                    className="flex-1 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {editingId !== gasto.id && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleEdit(gasto)}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-md transition-colors"
                >
                  <Edit2 className="w-4 h-4" /> Editar
                </button>
                <button
                  onClick={() => handleDelete(gasto.id)}
                  disabled={isLoading}
                  className="px-3 py-1.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex justify-between items-center">
        <span className="text-sm font-medium text-slate-600">Total Filtrado:</span>
        <span className="text-2xl font-bold text-slate-900">{formatARS(totalFiltered)}</span>
      </div>
    </div>
  )
}
