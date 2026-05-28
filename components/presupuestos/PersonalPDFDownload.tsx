'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { PersonalPDF } from './PersonalPDF'
import type { Presupuesto, PersonalData } from '@/lib/types'

interface Props {
  presupuesto: Presupuesto
  personal: PersonalData | null
  className?: string
}

export default function PersonalPDFDownload({ presupuesto, personal, className = '' }: Props) {
  if (!personal) return null

  const nombre = `personal-${presupuesto.cliente.replace(/\s+/g, '-').toLowerCase() || 'sin-nombre'}.pdf`

  return (
    <PDFDownloadLink
      document={<PersonalPDF presupuesto={presupuesto} personal={personal} />}
      fileName={nombre}
      className={className}
    >
      {({ loading }) => (loading ? 'Generando PDF...' : '👥 Personal')}
    </PDFDownloadLink>
  )
}
