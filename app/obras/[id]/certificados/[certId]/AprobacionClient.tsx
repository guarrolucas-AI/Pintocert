'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
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
import { CheckCircle } from 'lucide-react'

export function AprobacionClient({ certId, obraId }: { certId: string; obraId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function aprobar() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('certificados')
      .update({ estado: 'aprobado' })
      .eq('id', certId)
    setLoading(false)
    setOpen(false)
    if (error) {
      toast.error('Error al aprobar: ' + error.message)
    } else {
      toast.success('Certificado aprobado')
      router.refresh()
    }
  }

  return (
    <>
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 flex items-center justify-between gap-4">
        <p className="text-sm text-yellow-800">
          Este certificado está en estado <strong>borrador</strong>. Aprobalo para incluirlo en el avance oficial de la obra.
        </p>
        <Button onClick={() => setOpen(true)} className="shrink-0 bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-4 w-4" />
          Aprobar
        </Button>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aprobar este certificado?</AlertDialogTitle>
            <AlertDialogDescription>
              Una vez aprobado, este certificado se considerará oficial y se incluirá en el avance de la obra. Esta acción no se puede deshacer desde el sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={aprobar} disabled={loading}>
              {loading ? 'Aprobando…' : 'Aprobar certificado'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
