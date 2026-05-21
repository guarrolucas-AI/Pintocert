'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { toast } from 'sonner'

type Mode = 'password' | 'magic'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      toast.error('Credenciales incorrectas: ' + error.message)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) {
      toast.error('Error al enviar el link: ' + error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="text-center pb-4 pt-8">
          <div className="flex justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-white.png"
              alt="Flipping Houses"
              className="h-14 w-auto object-contain"
            />
          </div>
          <p className="text-sm text-[#737373]">Sistema de certificados de avance de obra</p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-3">
              <div className="text-5xl">📬</div>
              <p className="text-sm text-muted-foreground">
                Te enviamos un link a <strong>{email}</strong>.
                <br />
                Revisá tu casilla y hacé clic para ingresar.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                Volver
              </Button>
            </div>
          ) : mode === 'password' ? (
            <form onSubmit={handlePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Ingresando…' : 'Ingresar'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                <button
                  type="button"
                  className="underline hover:text-foreground"
                  onClick={() => setMode('magic')}
                >
                  Preferís un link mágico por email
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleMagic} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando…' : 'Enviar link de acceso'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                <button
                  type="button"
                  className="underline hover:text-foreground"
                  onClick={() => setMode('password')}
                >
                  Ingresar con contraseña
                </button>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
