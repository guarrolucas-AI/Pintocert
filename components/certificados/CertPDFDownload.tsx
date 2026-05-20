'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import type { CertificadoConItems } from '@/lib/types'
import { CertPDF } from './CertPDF'

interface Props {
  cert: CertificadoConItems
}

export function CertPDFDownload({ cert }: Props) {
  return (
    <PDFDownloadLink
      document={<CertPDF cert={cert} />}
      fileName={`certificado-${cert.obra?.nombre ?? 'obra'}-nro${cert.numero}.pdf`}
    >
      {({ loading }: { loading: boolean }) => (
        <Button variant="outline" disabled={loading}>
          <Download className="h-4 w-4" />
          {loading ? 'Generando…' : 'Descargar PDF'}
        </Button>
      )}
    </PDFDownloadLink>
  )
}
