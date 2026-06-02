'use client'
import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { CentralGastoForm } from './CentralGastoForm'
import { CentralGastosTable } from './CentralGastosTable'
import { CategoriasGastoCentralModal } from './CategoriasGastoCentralModal'
import { FlujoCajaCentralChart } from './FlujoCajaCentralChart'
import { getGastosCentral, getCategoriasGastoCentral, getFlujoCajaCentral } from '@/lib/actions/gastos_central'
import type { GastoCentral, CategoriaGastoCentral, FlujoCajaCentral } from '@/lib/types'
import { AlertCircle } from 'lucide-react'

export function ContabilidadCentralView() {
  const [activeTab, setActiveTab] = useState('gastos')
  const [gastos, setGastos] = useState<GastoCentral[]>([])
  const [categorias, setCategorias] = useState<CategoriaGastoCentral[]>([])
  const [flujoCaja, setFlujoCaja] = useState<FlujoCajaCentral[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    loadData()
  }, [currentYear])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [gastosResult, categoriasResult, flujoCajaResult] = await Promise.all([
        getGastosCentral({}),
        getCategoriasGastoCentral(),
        getFlujoCajaCentral(currentYear),
      ])

      if (gastosResult.error) {
        setError(gastosResult.error)
      } else {
        setGastos(gastosResult.data || [])
      }

      if (categoriasResult.error) {
        setError(categoriasResult.error)
      } else {
        setCategorias(categoriasResult.data || [])
      }

      if (flujoCajaResult.error) {
        setError(flujoCajaResult.error)
      } else {
        setFlujoCaja(flujoCajaResult.data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    loadData()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <Breadcrumb
              items={[
                { label: 'Inicio', href: '/' },
                { label: 'Contabilidad', href: '/contabilidad' },
                { label: 'Central' },
              ]}
            />
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-500">Cargando contabilidad...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <Breadcrumb
            items={[
              { label: 'Inicio', href: '/' },
              { label: 'Contabilidad', href: '/contabilidad' },
              { label: 'Central' },
            ]}
          />

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">Contabilidad Central</h1>
            <p className="text-slate-600">Gestiona los gastos generales de la empresa</p>
          </div>

          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">{error}</p>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 w-full bg-white border-b border-slate-200">
              <TabsTrigger value="gastos" className="data-[state=active]:text-yellow-600 data-[state=active]:border-b-2 data-[state=active]:border-yellow-600">
                Gastos ({gastos.length})
              </TabsTrigger>
              <TabsTrigger value="categorias" className="data-[state=active]:text-yellow-600 data-[state=active]:border-b-2 data-[state=active]:border-yellow-600">
                Categorías
              </TabsTrigger>
              <TabsTrigger value="flujo" className="data-[state=active]:text-yellow-600 data-[state=active]:border-b-2 data-[state=active]:border-yellow-600">
                Flujo de Caja
              </TabsTrigger>
            </TabsList>

            {/* Gastos Tab */}
            <TabsContent value="gastos" className="space-y-6">
              <CentralGastoForm categorias={categorias} onSuccess={handleSuccess} />
              {gastos.length > 0 ? (
                <CentralGastosTable
                  gastos={gastos}
                  categorias={categorias}
                  onDelete={handleSuccess}
                  onUpdate={handleSuccess}
                />
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                  <p className="text-slate-600 font-medium">No hay gastos centrales</p>
                  <p className="text-sm text-slate-500 mt-1">Crea el primero usando el formulario arriba</p>
                </div>
              )}
            </TabsContent>

            {/* Categorías Tab */}
            <TabsContent value="categorias" className="space-y-6">
              <CategoriasGastoCentralModal categorias={categorias} onSuccess={handleSuccess} />
            </TabsContent>

            {/* Flujo de Caja Tab */}
            <TabsContent value="flujo" className="space-y-6">
              {flujoCaja.length > 0 ? (
                <FlujoCajaCentralChart flujoCaja={flujoCaja} anio={currentYear} />
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                  <p className="text-slate-600 font-medium">No hay datos de flujo de caja para {currentYear}</p>
                  <p className="text-sm text-slate-500 mt-1">Agrega gastos para ver el análisis</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
