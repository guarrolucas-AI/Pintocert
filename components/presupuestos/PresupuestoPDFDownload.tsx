'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { PresupuestoPDF } from './PresupuestoPDF'
import type { Presupuesto } from '@/lib/types'

interface Props {
  presupuesto: Presupuesto
  className?: string
}

export default function PresupuestoPDFDownload({ presupuesto, className = '' }: Props) {
  const nombre = `presupuesto-${presupuesto.cliente.replace(/\s+/g, '-').toLowerCase() || 'sin-nombre'}.pdf`

  return (
    <PDFDownloadLink
      document={<PresupuestoPDF presupuesto={presupuesto} />}
      fileName={nombre}
      className={className}
    >
      {({ loading }) => (loading ? 'Generando PDF...' : 'Descargar PDF')}
    </PDFDownloadLink>
  )
}
