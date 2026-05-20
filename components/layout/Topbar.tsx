'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { Perfil } from '@/lib/types'

interface TopbarProps {
  perfil: Perfil | null
}

export function Topbar({ perfil }: TopbarProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-[#0a0a0a] shadow-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Flipping Houses"
              width={140}
              height={36}
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>
          {perfil?.rol === 'admin' && (
            <Link
              href="/usuarios"
              className="text-sm text-white/60 hover:text-white transition-colors hidden sm:block"
            >
              Usuarios
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          {perfil && (
            <span className="hidden text-sm text-white/70 sm:block">
              {perfil.nombre}{' '}
              <span className="rounded-full bg-[#FFD600] text-[#0a0a0a] px-2 py-0.5 text-xs font-semibold capitalize">
                {perfil.rol}
              </span>
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
          >
            Salir
          </Button>
        </div>
      </div>
    </header>
  )
}
