import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://weaqinaawvplrdgvdiuo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlYXFpbmFhd3ZwbHJkZ3ZkaXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIyMjIzMiwiZXhwIjoyMDk0Nzk4MjMyfQ.gR1HuhldAW0ePUD3osPrF--EUQD7xn3bzeFxWfd7dRs'
)

const { data, error } = await supabase
  .from('presupuestos')
  .update({
    subtotal: 35055000,
    monto_iva: 7361550,
    total: 42416550,
    updated_at: new Date().toISOString()
  })
  .eq('id', '95620221-c5dc-4e76-86e2-3f069f8e1390')
  .select()

if (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}

console.log('✅ Presupuesto actualizado:')
console.log(JSON.stringify(data, null, 2))
