'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Archive, Trash2 } from 'lucide-react'
import { archivarObra, eliminarObra } from '@/app/obras/[id]/actions'

interface ObraActionsProps {
  obraId: string
  estadoActual: string
}

export function ObraActions({ obraId, estadoActual }: ObraActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'archivar' | 'eliminar' | null>(null)

  async function handleArchivar() {
    if (!confirm('¿Archivar esta obra? No aparecerá en el dashboard pero se puede recuperar.')) return
    setLoading('archivar')
    const { error } = await archivarObra(obraId)
    setLoading(null)
    if (error) {
      toast.error('Error: ' + error)
    } else {
      toast.success('Obra archivada')
      router.push('/dashboard')
    }
  }

  async function handleEliminar() {
    if (!confirm('⚠️ ¿ELIMINAR esta obra permanentemente? Se borrarán todos sus certificados, ítems y pagos. Esta acción NO se puede deshacer.')) return
    if (!confirm('Segunda confirmación: ¿Estás seguro? No hay vuelta atrás.')) return
    setLoading('eliminar')
    const { error } = await eliminarObra(obraId)
    setLoading(null)
    if (error) {
      toast.error('Error: ' + error)
    } else {
      toast.success('Obra eliminada')
      router.push('/dashboard')
    }
  }

  if (estadoActual === 'archivado') return null

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleArchivar}
        disabled={loading !== null}
        className="text-slate-500 border-slate-200 hover:bg-slate-50"
        title="Archivar obra (no aparece en el listado)"
      >
        <Archive className="w-4 h-4" />
        {loading === 'archivar' ? 'Archivando...' : 'Archivar'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleEliminar}
        disabled={loading !== null}
        className="text-red-500 border-red-200 hover:bg-red-50"
        title="Eliminar obra permanentemente"
      >
        <Trash2 className="w-4 h-4" />
        {loading === 'eliminar' ? 'Eliminando...' : 'Eliminar'}
      </Button>
    </div>
  )
}
