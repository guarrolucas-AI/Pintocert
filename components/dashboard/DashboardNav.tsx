import Link from 'next/link'

interface DashboardNavProps {
  current?: 'comercial' | 'flujo-caja' | 'analisis-gastos'
}

export function DashboardNav({ current = 'comercial' }: DashboardNavProps) {
  const dashboards = [
    {
      id: 'comercial',
      href: '/dashboard',
      title: 'Dashboard Comercial',
      description: 'KPIs y estado general de obras',
    },
    {
      id: 'flujo-caja',
      href: '/dashboard/flujo-caja',
      title: 'Flujo de Caja',
      description: 'Ingresos vs egresos mensuales',
    },
    {
      id: 'analisis-gastos',
      href: '/dashboard/analisis-gastos',
      title: 'Análisis de Gastos',
      description: 'Presupuesto vs gastos reales',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {dashboards.map((dashboard) => (
        <Link
          key={dashboard.id}
          href={dashboard.href}
          className={`rounded-lg border p-4 transition-colors ${
            current === dashboard.id
              ? 'border-blue-500 bg-blue-50 hover:bg-blue-100'
              : 'border-slate-200 hover:bg-slate-50'
          }`}
        >
          <p className={`font-semibold ${current === dashboard.id ? 'text-blue-900' : 'text-slate-900'}`}>
            {dashboard.title}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{dashboard.description}</p>
        </Link>
      ))}
    </div>
  )
}
