'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { CertForm, type RowData } from '@/components/certificados/CertForm'
import type { ItemObra, CertificadoItem, Certificado } from '@/lib/types'
import type { CertificadoFormData } from '@/lib/validations'

interface Props {
  cert: Certificado
  items: ItemObra[]
  ultimosCertItems: Record<string, CertificadoItem>
  initialPcts: Record<string, number>
}

export function EditCertClient({ cert, items, ultimosCertItems, initialPcts }: Props) {
  const router = useRouter()

  const initialValues: CertificadoFormData = {
    fecha_medicion: cert.fecha_medicion,
    periodo_mes: cert.periodo_mes,
    periodo_anio: cert.periodo_anio,
    notas: cert.notas ?? null,
  }

  async function handleSubmit(data: CertificadoFormData, rows: RowData[]) {
    const supabase = createClient()

    const { error: certError } = await supabase
      .from('certificados')
      .update({
        fecha_medicion: data.fecha_medicion,
        periodo_mes: data.periodo_mes,
        periodo_anio: data.periodo_anio,
        notas: data.notas || null,
      })
      .eq('id', cert.id)

    if (certError) {
      toast.error('Error al actualizar certificado: ' + certError.message)
      return
    }

    const { error: deleteError } = await supabase
      .from('certificado_items')
      .delete()
      .eq('certificado_id', cert.id)

    if (deleteError) {
      toast.error('Error al actualizar ítems: ' + deleteError.message)
      return
    }

    const { error: insertError } = await supabase
      .from('certificado_items')
      .insert(rows.map((row) => ({ certificado_id: cert.id, ...row })))

    if (insertError) {
      toast.error('Error al guardar ítems: ' + insertError.message)
      return
    }

    toast.success('Certificado actualizado')
    window.location.href = `/obras/${cert.obra_id}/certificados/${cert.id}`
  }

  return (
    <div className="rounded-lg border bg-white p-6">
      <CertForm
        obraId={cert.obra_id}
        items={items}
        ultimosCertItems={ultimosCertItems}
        numeroCert={cert.numero}
        onSubmit={handleSubmit}
        initialValues={initialValues}
        initialPcts={initialPcts}
        submitLabel="Guardar cambios"
      />
    </div>
  )
}
