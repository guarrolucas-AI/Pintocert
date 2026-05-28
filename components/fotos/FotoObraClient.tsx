'use client'

import { useState } from 'react'
import { FotoObraUpload } from './FotoObraUpload'
import { FotoObraGaleria } from './FotoObraGaleria'
import { FotoObraTimeline } from './FotoObraTimeline'
import type { FotoObra } from '@/lib/types'

interface FotoObraClientProps {
  obraId: string
  fotosInitial: FotoObra[]
}

type TabType = 'galeria' | 'timeline'

export function FotoObraClient({ obraId, fotosInitial }: FotoObraClientProps) {
  const [fotos, setFotos] = useState<FotoObra[]>(fotosInitial)
  const [activeTab, setActiveTab] = useState<TabType>('galeria')

  const handleFotoUploaded = () => {
    // Refetch fotos would be done via a refresh action
    // For now, we'll just show a message
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Galería de Fotos</h2>
        <FotoObraUpload obraId={obraId} onFotoUploaded={handleFotoUploaded} />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('galeria')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'galeria'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Galería ({fotos.length})
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'timeline'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Timeline
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'galeria' && (
          <FotoObraGaleria fotos={fotos} onFotoDeleted={handleFotoUploaded} />
        )}
        {activeTab === 'timeline' && <FotoObraTimeline fotos={fotos} />}
      </div>
    </div>
  )
}
