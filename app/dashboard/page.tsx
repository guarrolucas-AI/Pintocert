import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { ObraCard } from '@/components/obras/ObraCard'
import type { ObraConAvance } from '@/lib/types'
import { Plus } from 'lucide-react'

export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const [{ data: obras, error }, { data: perfil }] = await Promise.all([
    supabase.from('obras_avance').select('*').order('created_at', { ascending: false }),
    admin.from('perfiles').select('rol').eq('id', user.id).single(),
  ])

  if (error) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Error al cargar las obras: {error.message}
      </div>
    )
  }

  const canCreate = perfil?.rol === 'admin' || perfil?.rol === 'capataz'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Obras</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {obras?.length ?? 0} obra{obras?.length !== 1 ? 's' : ''} registrada{obras?.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/obras/nueva">
              <Plus className="h-4 w-4" />
              Nueva obra
            </Link>
          </Button>
        )}
      </div>

      {!obras || obras.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-12 text-center">
          <div className="text-4xl mb-3">🏗️</div>
          <h3 className="font-semibold text-slate-900">No hay obras todavía</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Creá la primera obra para empezar a certificar avances.
          </p>
          {canCreate && (
            <Button asChild>
              <Link href="/obras/nueva">
                <Plus className="h-4 w-4" />
                Nueva obra
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(obras as ObraConAvance[]).map((obra) => (
            <ObraCard key={obra.obra_id} obra={obra} />
          ))}
        </div>
      )}
    </div>
  )
}
