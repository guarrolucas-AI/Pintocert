'use client'
import { useState, useTransition, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registrarPago } from '@/lib/actions/pagos'
import { toast } from 'sonner'
import { Plus, X, Clipboard, Upload, ImageIcon } from 'lucide-react'

export function PagoForm({ obraId }: { obraId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Paste listener — activo solo cuando el form está abierto
  useEffect(() => {
    if (!open) return
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) setFile(file)
          break
        }
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [open])

  function setFile(file: File) {
    setComprobante(file)
    setPreview(URL.createObjectURL(file))
  }

  function clearFile() {
    setComprobante(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setFile(file)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    if (comprobante) formData.set('comprobante', comprobante)
    startTransition(async () => {
      const res = await registrarPago(obraId, formData)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Cobro registrado')
        setOpen(false)
        form.reset()
        clearFile()
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
        <button type="button" onClick={() => { setOpen(false); clearFile() }}>
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

        {/* Comprobante */}
        <div className="space-y-1">
          <Label>Comprobante <span className="text-muted-foreground text-xs">(opcional)</span></Label>

          {preview ? (
            <div className="relative inline-block">
              <img
                src={preview}
                alt="Comprobante"
                className="h-28 w-auto rounded border object-contain bg-slate-50"
              />
              <button
                type="button"
                onClick={clearFile}
                className="absolute -top-1.5 -right-1.5 bg-white border rounded-full p-0.5 shadow-sm hover:bg-red-50 transition-colors"
              >
                <X className="h-3 w-3 text-slate-500" />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-4 w-4 shrink-0" />
              <span>
                <span className="font-medium text-slate-700">Hacé click</span> para subir
                {' '}o <span className="font-medium text-slate-700">Ctrl+V</span> para pegar
              </span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Guardando…' : 'Guardar cobro'}
        </Button>
      </form>
    </div>
  )
}
