'use client'
import { useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { eliminarUsuario } from '@/lib/actions/usuarios'
import { toast } from 'sonner'
import type { Perfil } from '@/lib/types'

export function UsuarioRow({ perfil, currentUserId }: { perfil: Perfil; currentUserId: string }) {
  const [isPending, startTransition] = useTransition()
  const isSelf = perfil.id === currentUserId

  function handleDelete() {
    if (!confirm(`¿Eliminar a ${perfil.nombre}? Esta acción no se puede deshacer.`)) return
    startTransition(async () => {
      const res = await eliminarUsuario(perfil.id)
      if (res.error) toast.error(res.error)
      else toast.success('Usuario eliminado')
    })
  }

  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3 font-medium text-slate-900">
        {perfil.nombre}
        {isSelf && <span className="ml-2 text-xs text-muted-foreground">(vos)</span>}
      </td>
      <td className="px-4 py-3 text-muted-foreground text-sm">{perfil.email}</td>
      <td className="px-4 py-3">
        <Badge variant={perfil.rol === 'admin' ? 'success' : 'warning'} className="capitalize">
          {perfil.rol}
        </Badge>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {new Date(perfil.created_at).toLocaleDateString('es-AR')}
      </td>
      <td className="px-4 py-3 text-right">
        {!isSelf && (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleDelete}
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            Eliminar
          </Button>
        )}
      </td>
    </tr>
  )
}
