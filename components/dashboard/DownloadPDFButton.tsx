'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Loader2 } from 'lucide-react'
import { downloadDashboardPDF } from './DashboardPDFReport'
import type { ObraConAvance } from '@/lib/types'
import type { DashboardKPIs } from '@/lib/types'

interface DownloadPDFButtonProps {
  obras: ObraConAvance[]
  kpis: DashboardKPIs
}

export function DownloadPDFButton({ obras, kpis }: DownloadPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = async () => {
    try {
      setIsGenerating(true)
      await downloadDashboardPDF(obras, kpis)
    } catch (error) {
      console.error('Error generating PDF:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={isGenerating}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generando...
        </>
      ) : (
        <>
          <FileText className="w-4 h-4" />
          Descargar PDF
        </>
      )}
    </Button>
  )
}
