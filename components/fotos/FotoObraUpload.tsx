'use client'

import { useState } from 'react'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { uploadFotoObra } from '@/lib/actions/fotos'
import { Upload, X, Camera } from 'lucide-react'

interface FotoObraUploadProps {
  obraId: string
  onFotoUploaded?: () => void
}

export function FotoObraUpload({ obraId, onFotoUploaded }: FotoObraUploadProps) {
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fechaFoto, setFechaFoto] = useState(new Date().toISOString().split('T')[0])
  const [tags, setTags] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    if (!validMimes.includes(file.type)) {
      toast.error('Formato no válido. Usa JPG, PNG, WebP o AVIF')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 50 MB')
      return
    }

    setArchivo(file)

    // Generate preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = () => {
    if (!titulo.trim()) {
      toast.error('El título es requerido')
      return
    }

    if (!archivo) {
      toast.error('Selecciona una imagen')
      return
    }

    startTransition(async () => {
      const { error } = await uploadFotoObra({
        obraId,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        fechaFoto,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        archivo,
      })

      if (error) {
        toast.error(error)
        return
      }

      toast.success('Foto subida correctamente')
      setTitulo('')
      setDescripcion('')
      setTags('')
      setArchivo(null)
      setPreview('')
      setFechaFoto(new Date().toISOString().split('T')[0])
      setIsOpen(false)
      onFotoUploaded?.()
    })
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="gap-2"
        size="sm"
      >
        <Camera className="w-4 h-4" />
        Subir Foto
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Subir Foto de Obra</h2>
          <button
            onClick={() => setIsOpen(false)}
            disabled={isPending}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Preview */}
          {preview && (
            <div className="relative rounded-lg overflow-hidden bg-slate-100">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-64 object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setArchivo(null)
                  setPreview('')
                }}
                disabled={isPending}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* File Input */}
          {!preview && (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <input
                id="foto-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleFileChange}
                disabled={isPending}
                className="hidden"
              />
              <label htmlFor="foto-input" className="cursor-pointer block">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">Haz clic para seleccionar imagen</p>
                <p className="text-xs text-slate-500 mt-1">JPG, PNG, WebP o AVIF (máx 50 MB)</p>
              </label>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="titulo" className="text-xs font-medium">
                Título *
              </Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Inicio de cimientos"
                disabled={isPending}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="descripcion" className="text-xs font-medium">
                Descripción
              </Label>
              <textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalles adicionales..."
                disabled={isPending}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md text-sm resize-none"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fechaFoto" className="text-xs font-medium">
                  Fecha de Foto *
                </Label>
                <Input
                  id="fechaFoto"
                  type="date"
                  value={fechaFoto}
                  onChange={(e) => setFechaFoto(e.target.value)}
                  disabled={isPending}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="tags" className="text-xs font-medium">
                  Tags (separados por comas)
                </Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Ej: frente, estructuras"
                  disabled={isPending}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !archivo || !titulo.trim()}
            >
              {isPending ? 'Subiendo...' : 'Subir Foto'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
