'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ObraForm } from '@/components/obras/ObraForm'
import type { ObraFormData } from '@/lib/validations'

export function NuevaObraClient({ userId }: { userId: string }) {
  const router = useRouter()

  async function handleSubmit(data: ObraFormData) {
    const supabase = createClient()
    const { data: obra, error } = await supabase
      .from('obras')
      .insert([{ ...data, created_by: userId }])
      .select()
      .single()

    if (error) {
      toast.error('Error al crear la obra: ' + error.message)
      return
    }

    toast.success('Obra creada correctamente')
    router.push(`/obras/${obra.id}`)
    router.refresh()
  }

  return <ObraForm onSubmit={handleSubmit} submitLabel="Crear obra" />
}
