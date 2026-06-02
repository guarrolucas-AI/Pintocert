import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { BarChart3, FileText } from 'lucide-react'

export default function ContabilidadPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Contabilidad' }]} />

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Contabilidad</h1>
        <p className="text-slate-600 mt-2">Gestiona los registros financieros de la empresa</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Central Accounting */}
        <Link href="/contabilidad/central">
          <div className="border-2 border-slate-200 rounded-lg p-6 hover:border-slate-400 hover:bg-slate-50 transition-all cursor-pointer h-full">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">Contabilidad Central</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Registra gastos generales: sueldos, combustible, máquinas, materiales, etc.
                </p>
                <div className="mt-4">
                  <Button variant="outline" size="sm">
                    Ir a Central →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Reports (Coming Soon) */}
        <div className="border-2 border-slate-200 rounded-lg p-6 opacity-50 cursor-not-allowed h-full">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-100 rounded-lg">
              <FileText className="w-6 h-6 text-slate-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">Reportes</h2>
              <p className="text-sm text-slate-600 mt-1">
                Análisis financiero y reportes consolidados
              </p>
              <div className="mt-4">
                <span className="inline-block px-3 py-1 bg-slate-200 text-slate-700 text-xs font-medium rounded">
                  Próximamente
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
