'use client'
import { useTransition, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { eliminarUsuario, cambiarRolUsuario } from '@/lib/actions/usuarios'
import { toast } from 'sonner'
import type { Perfil } from '@/lib/types'

const ROLES_DISPONIBLES = ['admin', 'capataz', 'operario']

export function UsuarioRow({ perfil, currentUserId }: { perfil: Perfil; currentUserId: string }) {
  const [isPending, startTransition] = useTransition()
  const [editingRole, setEditingRole] = useState(false)
  const [selectedRole, setSelectedRole] = useState(perfil.rol)
  const isSelf = perfil.id === currentUserId

  function handleDelete() {
    if (!confirm(`¿Eliminar a ${perfil.nombre}? Esta acción no se puede deshacer.`)) return
    startTransition(async () => {
      const res = await eliminarUsuario(perfil.id)
      if (res.error) toast.error(res.error)
      else toast.success('Usuario eliminado')
    })
  }

  function handleChangeRole() {
    if (selectedRole === perfil.rol) {
      setEditingRole(false)
      return
    }
    startTransition(async () => {
      const res = await cambiarRolUsuario(perfil.id, selectedRole)
      if (res.error) {
        toast.error(res.error)
        setSelectedRole(perfil.rol)
      } else {
        toast.success(`Rol cambiado a ${selectedRole}`)
        setEditingRole(false)
      }
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
        {editingRole ? (
          <div className="flex gap-2 items-center">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as "admin" | "capataz" | "operario")}
              className="text-sm border border-slate-200 rounded px-2 py-1 bg-white"
            >
              {ROLES_DISPONIBLES.map((r) => (
                <option key={r} value={r} className="capitalize">
                  {r}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleChangeRole}
              disabled={isPending}
              className="h-7 px-2 text-xs"
            >
              ✓
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditingRole(false)
                setSelectedRole(perfil.rol)
              }}
              disabled={isPending}
              className="h-7 px-2 text-xs"
            >
              ✕
            </Button>
          </div>
        ) : (
          <Badge
            variant={perfil.rol === 'admin' ? 'success' : 'warning'}
            className="capitalize cursor-pointer hover:opacity-80"
            onClick={() => {
              setEditingRole(true)
              setSelectedRole(perfil.rol)
            }}
            title="Click para editar"
          >
            {perfil.rol}
          </Badge>
        )}
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
