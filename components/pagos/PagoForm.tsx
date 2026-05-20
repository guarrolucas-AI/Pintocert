'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registrarPago } from '@/lib/actions/pagos'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'

export function PagoForm({ obraId }: { obraId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    startTransition(async () => {
      const res = await registrarPago(obraId, formData)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Cobro registrado')
        setOpen(false)
        form.reset()
      }
    })
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Registrar cobro
      </Button>
    )
  }

  return (
    <div className="rounded-lg border bg-white p-4 space-y-3 max-w-md">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 text-sm">Registrar cobro</h3>
        <button type="button" onClick={() => setOpen(false)}>
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="fecha_pago">Fecha</Label>
            <Input
              id="fecha_pago"
              name="fecha_pago"
              type="date"
              required
              defaultValue={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="importe">Importe ($)</Label>
            <Input
              id="importe"
              name="importe"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="referencia">
            Referencia <span className="text-muted-foreground text-xs">(opcional)</span>
          </Label>
          <Input id="referencia" name="referencia" placeholder="Nro. de transferencia, cheque…" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="notas">
            Notas <span className="text-muted-foreground text-xs">(opcional)</span>
          </Label>
          <Input id="notas" name="notas" placeholder="Observaciones…" />
        </div>
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Guardando…' : 'Guardar cobro'}
        </Button>
      </form>
    </div>
  )
}
