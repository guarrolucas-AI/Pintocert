'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { PlanEjecucionPDF } from './PlanEjecucionPDF'
import type { Presupuesto, PlanEjecucionData } from '@/lib/types'

interface Props {
  presupuesto: Presupuesto
  plan: PlanEjecucionData | null
  className?: string
}

export default function PlanEjecucionPDFDownload({ presupuesto, plan, className = '' }: Props) {
  if (!plan) return null

  const nombre = `plan-ejecucion-${presupuesto.cliente.replace(/\s+/g, '-').toLowerCase() || 'sin-nombre'}.pdf`

  return (
    <PDFDownloadLink
      document={<PlanEjecucionPDF presupuesto={presupuesto} plan={plan} />}
      fileName={nombre}
      className={className}
    >
      {({ loading }) => (loading ? 'Generando PDF...' : '📅 Plan de Obra')}
    </PDFDownloadLink>
  )
}
