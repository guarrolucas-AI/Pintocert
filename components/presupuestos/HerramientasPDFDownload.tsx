'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { HerramientasPDF } from './HerramientasPDF'
import type { Presupuesto, HerramientasData } from '@/lib/types'

interface Props {
  presupuesto: Presupuesto
  herramientas: HerramientasData | null
  className?: string
}

export default function HerramientasPDFDownload({ presupuesto, herramientas, className = '' }: Props) {
  if (!herramientas) return null

  const nombre = `herramientas-${presupuesto.cliente.replace(/\s+/g, '-').toLowerCase() || 'sin-nombre'}.pdf`

  return (
    <PDFDownloadLink
      document={<HerramientasPDF presupuesto={presupuesto} herramientas={herramientas} />}
      fileName={nombre}
      className={className}
    >
      {({ loading }) => (loading ? 'Generando PDF...' : '🔧 Herramientas')}
    </PDFDownloadLink>
  )
}
