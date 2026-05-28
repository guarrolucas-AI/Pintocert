'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { recalculateFlujoCajaForAllObras } from '@/lib/actions/gastos'
import { RotateCw, AlertCircle, CheckCircle } from 'lucide-react'

export function RecalculateFlujoCajaButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRecalculate = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await recalculateFlujoCajaForAllObras()
      if (response.error) {
        setError(response.error)
      } else {
        setResult(response)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={handleRecalculate}
        disabled={loading}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Recalculando...' : 'Recalcular Flujo de Caja'}
      </Button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">
            <p className="font-medium">Error al recalcular</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-700">
            <p className="font-medium">{result.mensaje}</p>
            {result.errores && result.errores.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold">Errores en:</p>
                <ul className="text-xs mt-1 space-y-0.5">
                  {result.errores.slice(0, 3).map((err: string, i: number) => (
                    <li key={i}>• {err}</li>
                  ))}
                  {result.errores.length > 3 && (
                    <li>• ... y {result.errores.length - 3} más</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
