'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { deleteGastoCentral, updateGastoCentral } from '@/lib/actions/gastos_central'
import { formatARS } from '@/lib/utils'
import { Trash2, Edit2 } from 'lucide-react'
import type { GastoCentral, CategoriaGastoCentral } from '@/lib/types'

const TIPO_GASTO_COLORS: Record<string, { color: string; label: string }> = {
  sueldo: { color: '#10B981', label: 'Sueldo' },
  combustible: { color: '#F59E0B', label: 'Combustible' },
  maquina: { color: '#6366F1', label: 'Máquina' },
  material: { color: '#3B82F6', label: 'Material' },
  retiro_socio: { color: '#EF4444', label: 'Retiro de Socio' },
  otro: { color: '#8B5CF6', label: 'Otro' },
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
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterTipo === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterTipo('')}
        >
          Todos ({gastos.length})
        </Button>
        {Object.entries(TIPO_GASTO_COLORS).map(([tipo, { label, color }]) => {
          const count = gastos.filter((g) => g.tipo_gasto === tipo).length
          const total = tipoStats[tipo] || 0
          if (count === 0) return null

          return (
            <Button
              key={tipo}
              variant={filterTipo === tipo ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterTipo(filterTipo === tipo ? '' : tipo)}
              style={{
                backgroundColor: filterTipo === tipo ? color : 'transparent',
                color: filterTipo === tipo ? 'white' : color,
                borderColor: color,
              }}
            >
              {label} ({count}) - {formatARS(total)}
            </Button>
          )
        })}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3">Fecha</th>
              <th className="text-left py-2 px-3">Tipo</th>
              <th className="text-left py-2 px-3">Categoría</th>
              <th className="text-left py-2 px-3">Descripción</th>
              <th className="text-right py-2 px-3">Monto</th>
              <th className="text-center py-2 px-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredGastos.map((gasto) => (
              <tr key={gasto.id} className="border-b hover:bg-slate-50">
                <td className="py-2 px-3">{gasto.fecha}</td>
                <td className="py-2 px-3">
                  <span
                    style={{
                      backgroundColor: TIPO_GASTO_COLORS[gasto.tipo_gasto]?.color,
                      color: 'white',
                    }}
                    className="px-2 py-1 rounded text-xs font-medium"
                  >
                    {TIPO_GASTO_COLORS[gasto.tipo_gasto]?.label || gasto.tipo_gasto}
                  </span>
                </td>
                <td className="py-2 px-3">{gasto.categoria}</td>
                <td className="py-2 px-3">{gasto.descripcion}</td>
                <td className="text-right py-2 px-3 font-semibold">{formatARS(gasto.monto)}</td>
                <td className="text-center py-2 px-3 space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(gasto)}
                    disabled={isLoading}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(gasto.id)}
                    disabled={isLoading}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-2">
        {filteredGastos.map((gasto) => (
          <div key={gasto.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex gap-2 items-center">
                  <span
                    style={{
                      backgroundColor: TIPO_GASTO_COLORS[gasto.tipo_gasto]?.color,
                      color: 'white',
                    }}
                    className="px-2 py-1 rounded text-xs font-medium"
                  >
                    {TIPO_GASTO_COLORS[gasto.tipo_gasto]?.label}
                  </span>
                  <span className="text-xs text-slate-500">{gasto.fecha}</span>
                </div>
                <p className="font-medium mt-1">{gasto.descripcion}</p>
                <p className="text-xs text-slate-500">{gasto.categoria}</p>
              </div>
              <p className="text-right font-semibold">{formatARS(gasto.monto)}</p>
            </div>

            {editingId === gasto.id && (
              <div className="border-t pt-2 space-y-2">
                <textarea
                  value={editData.notas || ''}
                  onChange={(e) => setEditData({ ...editData, notas: e.target.value })}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="Notas"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSaveEdit(gasto.id)}
                    disabled={isLoading}
                  >
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {editingId !== gasto.id && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(gasto)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <Edit2 className="w-4 h-4 mr-1" /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(gasto.id)}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="border-t pt-4 flex justify-between items-center font-semibold text-lg">
        <span>Total Filtrado:</span>
        <span>{formatARS(totalFiltered)}</span>
      </div>
    </div>
  )
}
