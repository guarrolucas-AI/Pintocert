'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { crearColaborador } from '@/lib/actions/usuarios'
import { toast } from 'sonner'
import { UserPlus, X } from 'lucide-react'

export function InviteForm() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    startTransition(async () => {
      const res = await crearColaborador(formData)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Usuario creado. Compartile las credenciales.')
        setOpen(false)
        form.reset()
      }
    })
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Invitar colaborador
      </Button>
    )
  }

  return (
    <div className="rounded-lg border bg-white p-4 space-y-4 w-full max-w-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Invitar colaborador</h3>
        <button type="button" onClick={() => setOpen(false)}>
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="nombre">Nombre completo</Label>
          <Input id="nombre" name="nombre" required placeholder="Juan Pérez" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="juan@empresa.com" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rol">Rol</Label>
          <select
            id="rol"
            name="rol"
            defaultValue="capataz"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="capataz">Capataz — puede crear y editar certificados</option>
            <option value="admin">Admin — acceso completo</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Contraseña temporal</Label>
          <Input
            id="password"
            name="password"
            type="text"
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            autoComplete="off"
          />
        </div>
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Creando…' : 'Crear usuario'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Compartile el email y la contraseña temporal al colaborador por WhatsApp o en persona.
        </p>
      </form>
    </div>
  )
}
