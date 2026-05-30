import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://weaqinaawvplrdgvdiuo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlYXFpbmFhd3ZwbHJkZ3ZkaXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIyMjIzMiwiZXhwIjoyMDk0Nzk4MjMyfQ.gR1HuhldAW0ePUD3osPrF--EUQD7xn3bzeFxWfd7dRs'
)

async function check() {
  const { data } = await supabase
    .from('presupuestos')
    .select('*')
    .eq('cliente', 'Alejandro Amaro')
    .single()

  if (!data) {
    console.log('No presupuesto found for Alejandro Amaro')
    return
  }

  console.log('=== PRESUPUESTO ALEJANDRO AMARO ===')
  console.log('Subtotal:', data.subtotal)
  console.log('Monto IVA:', data.monto_iva)
  console.log('Total:', data.total)
  console.log()
  console.log('=== ANÁLISIS ECONÓMICO ===')
  const analisis = data.analisis_economico
  console.log(JSON.stringify(analisis, null, 2))
}

check()
