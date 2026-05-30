import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://weaqinaawvplrdgvdiuo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlYXFpbmFhd3ZwbHJkZ3ZkaXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIyMjIzMiwiZXhwIjoyMDk0Nzk4MjMyfQ.gR1HuhldAW0ePUD3osPrF--EUQD7xn3bzeFxWfd7dRs'
)

async function check() {
  const { data } = await supabase
    .from('presupuestos')
    .select('cliente, subtotal, monto_iva, total, lista_materiales, plan_personal, analisis_economico')
    .eq('cliente', 'Alejandro Amaro')
    .single()

  console.log('=== ANÁLISIS ECONÓMICO COMPLETO ===')
  console.log(JSON.stringify(data.analisis_economico, null, 2))
}

check()
