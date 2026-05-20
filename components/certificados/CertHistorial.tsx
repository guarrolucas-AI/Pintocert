import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { nombreMes } from '@/lib/utils'
import type { Certificado } from '@/lib/types'
import { FileText } from 'lucide-react'

interface CertHistorialProps {
  certificados: Certificado[]
  obraId: string
}

export function CertHistorial({ certificados, obraId }: CertHistorialProps) {
  if (certificados.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-white p-8 text-center">
        <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Todavía no hay certificados para esta obra.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-xs text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">N°</th>
            <th className="px-4 py-3 text-left font-medium">Período</th>
            <th className="px-4 py-3 text-left font-medium">Fecha medición</th>
            <th className="px-4 py-3 text-left font-medium">Estado</th>
            <th className="px-4 py-3 text-right font-medium">Ver</th>
          </tr>
        </thead>
        <tbody>
          {certificados.map((cert) => (
            <tr key={cert.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-medium">#{cert.numero}</td>
              <td className="px-4 py-3">
                {nombreMes(cert.periodo_mes)} {cert.periodo_anio}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(cert.fecha_medicion + 'T12:00:00').toLocaleDateString('es-AR')}
              </td>
              <td className="px-4 py-3">
                <Badge variant={cert.estado === 'aprobado' ? 'success' : 'warning'}>
                  {cert.estado === 'aprobado' ? 'Aprobado' : 'Borrador'}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/obras/${obraId}/certificados/${cert.id}`}
                  className="text-primary hover:underline font-medium text-xs"
                >
                  Ver →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
