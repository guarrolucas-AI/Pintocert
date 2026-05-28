'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { GastoObraForm } from '@/components/gastos/GastoObraForm'
import { GastosTable } from '@/components/gastos/GastosTable'
import { CategoriasModal } from '@/components/gastos/CategoriasModal'
import { getGastosByObra, getCategoriasPersonalizadasUsuario } from '@/lib/actions/gastos'
import { Settings } from 'lucide-react'
import type { GastoObra, CategoriaGastoPersonalizado } from '@/lib/types'

interface GastosViewProps {
  obraId: string
}

export function GastosView({ obraId }: GastosViewProps) {
  const [gastos, setGastos] = useState<GastoObra[]>([])
  const [categorias, setCategorias] = useState<CategoriaGastoPersonalizado[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadGastos = async () => {
    const { data, error } = await getGastosByObra(obraId)
    if (!error && data) {
      setGastos(data)
    }
  }

  const loadCategorias = async () => {
    const { data, error } = await getCategoriasPersonalizadasUsuario()
    if (!error && data) {
      setCategorias(data)
    }
  }

  useEffect(() => {
    const cargarDatos = async () => {
      setIsLoading(true)
      await Promise.all([loadGastos(), loadCategorias()])
      setIsLoading(false)
    }
    cargarDatos()
  }, [obraId])

  const handleGastoAdded = () => {
    loadGastos()
  }

  const handleCategoriaAdded = () => {
    loadCategorias()
  }

  const handleCategoriaDeleted = () => {
    loadCategorias()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Gastos de la Obra</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsModalOpen(true)}
        >
          <Settings className="w-4 h-4 mr-2" />
          Categorías
        </Button>
      </div>

      {/* Modal de Categorías */}
      <CategoriasModal
        categorias={categorias}
        onCategoriaAdded={handleCategoriaAdded}
        onCategoriaDeleted={handleCategoriaDeleted}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Formulario para nuevo gasto */}
      <GastoObraForm obraId={obraId} onSuccess={handleGastoAdded} />

      {/* Tabla de gastos */}
      {!isLoading && (
        <GastosTable
          gastos={gastos}
          categoriasPersonalizadas={categorias}
          obraId={obraId}
          onGastoDeleted={handleGastoAdded}
        />
      )}

      {isLoading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando gastos...</p>
        </div>
      )}
    </div>
  )
}
