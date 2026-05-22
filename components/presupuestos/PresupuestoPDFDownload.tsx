'use client'

import dynamic from 'next/dynamic'
import type { Presupuesto } from '@/lib/types'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((m) => m.PDFDownloadLink),
  { ssr: false }
)
const PresupuestoPDFComp = dynamic(
  () => import('./PresupuestoPDF').then((m) => m.PresupuestoPDF),
  { ssr: false }
)

interface Props {
  presupuesto: Presupuesto
  className?: string
}

export default function PresupuestoPDFDownload({ presupuesto, className = '' }: Props) {
  const nombre = `presupuesto-${presupuesto.cliente.replace(/\s+/g, '-').toLowerCase() || 'sin-nombre'}.pdf`

  return (
    <PDFDownloadLink
      document={<PresupuestoPDFComp presupuesto={presupuesto} />}
      fileName={nombre}
      className={className}
    >
      {({ loading }) => (loading ? 'Generando PDF...' : 'Descargar PDF')}
    </PDFDownloadLink>
  )
}
