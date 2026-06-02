import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { BarChart3, FileText } from 'lucide-react'

export default function ContabilidadPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <Breadcrumb items={[
            { label: 'Inicio', href: '/' },
            { label: 'Contabilidad' },
          ]} />

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">Contabilidad</h1>
            <p className="text-slate-600">Gestiona los registros financieros de la empresa</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Central Accounting */}
            <Link href="/contabilidad/central">
              <div className="bg-white border border-slate-200 rounded-lg p-6 hover:border-yellow-400 hover:shadow-md transition-all cursor-pointer h-full">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <BarChart3 className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-slate-900">Contabilidad Central</h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Registra gastos generales: sueldos, combustible, máquinas, materiales, y más.
                    </p>
                    <div className="mt-4">
                      <button className="px-3 py-1.5 text-sm font-medium border border-yellow-300 text-yellow-700 hover:bg-yellow-50 rounded-md transition-colors">
                        Abrir →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Reports (Coming Soon) */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 opacity-50 cursor-not-allowed h-full">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
                  <FileText className="w-6 h-6 text-slate-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-900">Reportes</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Análisis financiero y reportes consolidados
                  </p>
                  <div className="mt-4">
                    <span className="inline-block px-3 py-1 bg-slate-200 text-slate-700 text-xs font-medium rounded-md">
                      Próximamente
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  )
}
