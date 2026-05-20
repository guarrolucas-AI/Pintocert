'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { CertForm, type RowData } from '@/components/certificados/CertForm'
import type { ItemObra, CertificadoItem } from '@/lib/types'
import type { CertificadoFormData } from '@/lib/validations'

interface Props {
  obraId: string
  userId: string
  items: ItemObra[]
  ultimosCertItems: Record<string, CertificadoItem>
  numeroCert: number
}

export function NuevoCertClient({ obraId, userId, items, ultimosCertItems, numeroCert }: Props) {
  const router = useRouter()

  async function handleSubmit(data: CertificadoFormData, rows: RowData[]) {
    const supabase = createClient()

    // Crear certificado
    const { data: cert, error: certError } = await supabase
      .from('certificados')
      .insert([
        {
          obra_id: obraId,
          numero: numeroCert,
          fecha_medicion: data.fecha_medicion,
          periodo_mes: data.periodo_mes,
          periodo_anio: data.periodo_anio,
          notas: data.notas || null,
          estado: 'borrador',
          created_by: userId,
        },
      ])
      .select()
      .single()

    if (certError) {
      toast.error('Error al crear certificado: ' + certError.message)
      return
    }

    // Insertar items del certificado
    const { error: itemsError } = await supabase.from('certificado_items').insert(
      rows.map((row) => ({ certificado_id: cert.id, ...row }))
    )

    if (itemsError) {
      toast.error('Error al guardar ítems: ' + itemsError.message)
      return
    }

    toast.success(`Certificado #${numeroCert} creado como borrador`)
    router.push(`/obras/${obraId}/certificados/${cert.id}`)
    router.refresh()
  }

  return (
    <div className="rounded-lg border bg-white p-6">
      <CertForm
        obraId={obraId}
        items={items}
        ultimosCertItems={ultimosCertItems}
        numeroCert={numeroCert}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
