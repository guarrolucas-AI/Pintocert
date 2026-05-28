'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { MaterialesPDF } from './MaterialesPDF'
import type { Presupuesto, MaterialesData } from '@/lib/types'

interface Props {
  presupuesto: Presupuesto
  materiales: MaterialesData | null
  className?: string
}

export default function MaterialesPDFDownload({ presupuesto, materiales, className = '' }: Props) {
  if (!materiales) return null

  const nombre = `materiales-${presupuesto.cliente.replace(/\s+/g, '-').toLowerCase() || 'sin-nombre'}.pdf`

  return (
    <PDFDownloadLink
      document={<MaterialesPDF presupuesto={presupuesto} materiales={materiales} />}
      fileName={nombre}
      className={className}
    >
      {({ loading }) => (loading ? 'Generando PDF...' : '📋 Materiales')}
    </PDFDownloadLink>
  )
}
