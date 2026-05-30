'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { AnalisisPDF } from './AnalisisPDF'
import type { Presupuesto, AnalisisData } from '@/lib/types'

interface Props {
  presupuesto: Presupuesto
  analisis: AnalisisData | null
  className?: string
}

export default function AnalisisPDFDownload({ presupuesto, analisis, className = '' }: Props) {
  if (!analisis) return null

  // Add timestamp to force fresh PDF generation and avoid browser cache
  const timestamp = new Date().getTime()
  const nombre = `analisis-${presupuesto.cliente.replace(/\s+/g, '-').toLowerCase() || 'sin-nombre'}-${timestamp}.pdf`

  return (
    <PDFDownloadLink
      document={<AnalisisPDF presupuesto={presupuesto} analisis={analisis} />}
      fileName={nombre}
      className={className}
    >
      {({ loading }) => (loading ? 'Generando PDF...' : '📊 Análisis')}
    </PDFDownloadLink>
  )
}
