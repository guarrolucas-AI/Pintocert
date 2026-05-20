'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ObraForm } from '@/components/obras/ObraForm'
import type { Obra } from '@/lib/types'
import type { ObraFormData } from '@/lib/validations'

export function EditarObraClient({ obra }: { obra: Obra }) {
  const router = useRouter()

  async function handleSubmit(data: ObraFormData) {
    const supabase = createClient()
    const { error } = await supabase.from('obras').update(data).eq('id', obra.id)
    if (error) {
      toast.error('Error al guardar: ' + error.message)
      return
    }
    toast.success('Obra actualizada')
    router.push(`/obras/${obra.id}`)
    router.refresh()
  }

  return (
    <ObraForm defaultValues={obra} onSubmit={handleSubmit} submitLabel="Guardar cambios" />
  )
}
