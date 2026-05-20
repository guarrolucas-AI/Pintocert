'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatARS } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { ItemObra } from '@/lib/types'
import { Plus, Trash2 } from 'lucide-react'

interface ItemsTableProps {
  items: ItemObra[]
  obraId: string
  canEdit: boolean
}

interface ItemRow {
  id?: string
  descripcion: string
  presupuesto: number
  orden: number
  isNew?: boolean
}

export function ItemsTable({ items: initialItems, obraId, canEdit }: ItemsTableProps) {
  const [items, setItems] = useState<ItemRow[]>(initialItems)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  function addItem() {
    setItems((prev) => [
      ...prev,
      { descripcion: '', presupuesto: 0, orden: prev.length + 1, isNew: true },
    ])
  }

  function updateItem(idx: number, field: keyof ItemRow, value: string | number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))
  }

  async function saveItems() {
    setSaving(true)
    const supabase = createClient()
    const newItems = items.filter((it) => it.isNew && it.descripcion.trim())
    if (newItems.length === 0) {
      setSaving(false)
      return
    }
    const { error } = await supabase.from('items_obra').insert(
      newItems.map((it, i) => ({
        obra_id: obraId,
        descripcion: it.descripcion,
        presupuesto: it.presupuesto,
        orden: items.length - newItems.length + i + 1,
      }))
    )
    setSaving(false)
    if (error) {
      toast.error('Error al guardar: ' + error.message)
    } else {
      toast.success('Ítems guardados')
      window.location.reload()
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    const supabase = createClient()
    const { error } = await supabase.from('items_obra').delete().eq('id', deleteId)
    setDeleteId(null)
    if (error) {
      toast.error('Error al eliminar: ' + error.message)
    } else {
      setItems((prev) => prev.filter((it) => it.id !== deleteId))
      toast.success('Ítem eliminado')
    }
  }

  const hasNew = items.some((it) => it.isNew)
  const total = items.reduce((s, it) => s + Number(it.presupuesto), 0)

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-xs text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">N°</th>
              <th className="px-4 py-3 text-left font-medium">Descripción</th>
              <th className="px-4 py-3 text-right font-medium">Presupuesto</th>
              {canEdit && <th className="px-4 py-3 w-10" />}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id ?? `new-${idx}`} className="border-b last:border-0">
                <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                <td className="px-4 py-3">
                  {item.isNew ? (
                    <Input
                      value={item.descripcion}
                      onChange={(e) => updateItem(idx, 'descripcion', e.target.value)}
                      placeholder="Descripción del ítem"
                      className="h-8 text-sm"
                    />
                  ) : (
                    item.descripcion
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {item.isNew ? (
                    <Input
                      type="number"
                      value={item.presupuesto}
                      onChange={(e) => updateItem(idx, 'presupuesto', Number(e.target.value))}
                      className="h-8 text-sm text-right w-36 ml-auto"
                    />
                  ) : (
                    <span className="font-medium">{formatARS(item.presupuesto)}</span>
                  )}
                </td>
                {canEdit && (
                  <td className="px-4 py-3">
                    {item.id && (
                      <button
                        onClick={() => setDeleteId(item.id!)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Eliminar ítem"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            <tr className="bg-slate-50 font-semibold">
              <td className="px-4 py-3" colSpan={2}>
                Total
              </td>
              <td className="px-4 py-3 text-right">{formatARS(total)}</td>
              {canEdit && <td />}
            </tr>
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" />
            Agregar ítem
          </Button>
          {hasNew && (
            <Button size="sm" onClick={saveItems} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar ítems'}
            </Button>
          )}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ítem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El ítem será eliminado de la obra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
