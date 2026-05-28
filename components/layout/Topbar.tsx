'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { Perfil } from '@/lib/types'
import { Menu, X } from 'lucide-react'

interface TopbarProps {
  perfil: Perfil | null
}

export function Topbar({ perfil }: TopbarProps) {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
              className="h-9 w-auto object-contain brightness-0 invert"
              priority
            />
            <span className="hidden sm:block text-white font-bold tracking-widest text-sm uppercase">
              Flipping Houses
            </span>
          </Link>
          <Link
            href="/presupuestos"
            className="text-sm text-white/60 hover:text-white transition-colors hidden sm:block"
          >
            Presupuestos
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

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden text-white/60 hover:text-white transition-colors"
            title={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

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

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-white/10 bg-[#1a1a1a] py-3 px-4 space-y-3">
          <Link
            href="/presupuestos"
            className="block text-sm text-white/70 hover:text-white transition-colors py-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            Presupuestos
          </Link>
          {perfil?.rol === 'admin' && (
            <Link
              href="/usuarios"
              className="block text-sm text-white/70 hover:text-white transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Usuarios
            </Link>
          )}
          {perfil && (
            <div className="border-t border-white/10 pt-3 mt-3 text-sm text-white/70">
              <p>{perfil.nombre}</p>
              <p className="text-xs text-white/50 mt-1">
                Rol: <span className="capitalize font-semibold text-white/70">{perfil.rol}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
