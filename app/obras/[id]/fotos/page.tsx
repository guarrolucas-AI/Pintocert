import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { FotoObraClient } from '@/components/fotos/FotoObraClient'
import { getFotosObra } from '@/lib/actions/fotos'
import { ArrowLeft } from 'lucide-react'
import type { Obra } from '@/lib/types'

export const revalidate = 0

export default async function FotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get obra
  const { data: obra, error: obraError } = await supabase
    .from('obras')
    .select('*')
    .eq('id', id)
    .single()

  if (obraError || !obra) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Obra no encontrada
      </div>
    )
  }

  const obraData = obra as Obra

  // Get fotos
  const { data: fotos, error: fotosError } = await getFotosObra(id)

  if (fotosError) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Error al cargar fotos
      </div>
    )
  }

  const fotosData = fotos || []

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Obras', href: '/obras' },
          { label: obraData.nombre, href: `/obras/${obraData.id}` },
          { label: 'Fotos' },
        ]}
      />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{obraData.nombre}</h1>
          <p className="text-sm text-muted-foreground mt-1">Galería de fotos de progreso</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/obras/${obraData.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Volver a obra
          </Link>
        </Button>
      </div>

      {/* Foto Client Component */}
      <FotoObraClient obraId={id} fotosInitial={fotosData} />
    </div>
  )
}
