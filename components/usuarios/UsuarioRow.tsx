'use client'
import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { eliminarUsuario, cambiarRolUsuario, updateUsuario, resetearPassword } from '@/lib/actions/usuarios'
import { toast } from 'sonner'
import type { Perfil } from '@/lib/types'
import { KeyRound } from 'lucide-react'

const ROLES_DISPONIBLES = ['admin', 'capataz', 'operario']

export function UsuarioRow({ perfil, currentUserId }: { perfil: Perfil; currentUserId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editingRole, setEditingRole] = useState(false)
  const [selectedRole, setSelectedRole] = useState(perfil.rol)
  const [editingProfile, setEditingProfile] = useState(false)
  const [nombre, setNombre] = useState(perfil.nombre)
  const [email, setEmail] = useState(perfil.email)
  const [editingPassword, setEditingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const isSelf = perfil.id === currentUserId

  function handleDelete() {
    if (!confirm(`¿Eliminar a ${perfil.nombre}? Esta acción no se puede deshacer.`)) return
    startTransition(async () => {
      const res = await eliminarUsuario(perfil.id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Usuario eliminado')
        router.refresh()
      }
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
        router.refresh()
      }
    })
  }

  function handleUpdateProfile() {
    if (nombre === perfil.nombre && email === perfil.email) {
      setEditingProfile(false)
      return
    }
    if (!nombre.trim() || !email.trim()) {
      toast.error('Nombre y email son requeridos')
      return
    }
    startTransition(async () => {
      const res = await updateUsuario(perfil.id, { nombre, email })
      if (res.error) {
        toast.error(res.error)
        setNombre(perfil.nombre)
        setEmail(perfil.email)
      } else {
        toast.success('Usuario actualizado')
        setEditingProfile(false)
        router.refresh()
      }
    })
  }

  function handleResetPassword() {
    if (newPassword.length < 6) {
      toast.error('Mínimo 6 caracteres')
      return
    }
    startTransition(async () => {
      const res = await resetearPassword(perfil.id, newPassword)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Contraseña de ${perfil.nombre} actualizada`)
        setEditingPassword(false)
        setNewPassword('')
      }
    })
  }

  function handleCancelEdit() {
    setEditingProfile(false)
    setNombre(perfil.nombre)
    setEmail(perfil.email)
  }

  // Fixed date format to avoid server/client hydration mismatch
  const fechaDesde = (() => {
    const d = new Date(perfil.created_at)
    return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`
  })()

  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3">
        {editingProfile ? (
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="text-sm border border-slate-200 rounded px-2 py-1 w-full"
            disabled={isPending}
          />
        ) : (
          <div className="flex items-center justify-between group">
            <div className="font-medium text-slate-900">
              {perfil.nombre}
              {isSelf && <span className="ml-2 text-xs text-muted-foreground">(vos)</span>}
            </div>
            {!isSelf && !editingProfile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingProfile(true)}
                disabled={isPending}
                className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100"
              >
                ✎
              </Button>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {editingProfile ? (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="text-sm border border-slate-200 rounded px-2 py-1 w-full"
            disabled={isPending}
          />
        ) : (
          <div className="text-muted-foreground text-sm">{perfil.email}</div>
        )}
      </td>
      <td className="px-4 py-3">
        {editingProfile ? (
          <div className="flex gap-2 items-center">
            <Button size="sm" variant="ghost" onClick={handleUpdateProfile} disabled={isPending} className="h-7 px-2 text-xs">✓</Button>
            <Button size="sm" variant="ghost" onClick={handleCancelEdit} disabled={isPending} className="h-7 px-2 text-xs">✕</Button>
          </div>
        ) : editingRole ? (
          <div className="flex gap-2 items-center">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'capataz' | 'operario')}
              className="text-sm border border-slate-200 rounded px-2 py-1 bg-white"
            >
              {ROLES_DISPONIBLES.map((r) => (
                <option key={r} value={r} className="capitalize">{r}</option>
              ))}
            </select>
            <Button size="sm" variant="ghost" onClick={handleChangeRole} disabled={isPending} className="h-7 px-2 text-xs">✓</Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditingRole(false); setSelectedRole(perfil.rol) }} disabled={isPending} className="h-7 px-2 text-xs">✕</Button>
          </div>
        ) : (
          <Badge
            variant={perfil.rol === 'admin' ? 'success' : 'warning'}
            className="capitalize cursor-pointer hover:opacity-80"
            onClick={() => { setEditingRole(true); setSelectedRole(perfil.rol) }}
            title="Click para editar"
          >
            {perfil.rol}
          </Badge>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {fechaDesde}
      </td>
      <td className="px-4 py-3 text-right">
        {!isSelf && !editingProfile && (
          <div className="flex items-center justify-end gap-2">
            {editingPassword ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nueva contraseña"
                  className="text-xs border border-slate-200 rounded px-2 py-1 w-36"
                  minLength={6}
                  autoComplete="off"
                  disabled={isPending}
                />
                <Button size="sm" variant="ghost" onClick={handleResetPassword} disabled={isPending || newPassword.length < 6} className="h-7 px-2 text-xs text-green-700">✓</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingPassword(false); setNewPassword('') }} disabled={isPending} className="h-7 px-2 text-xs">✕</Button>
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => setEditingPassword(true)}
                  className="text-slate-600 border-slate-200 hover:bg-slate-50 gap-1"
                  title="Cambiar contraseña"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Pass
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={handleDelete}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  Eliminar
                </Button>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}
