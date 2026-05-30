import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://weaqinaawvplrdgvdiuo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlYXFpbmFhd3ZwbHJkZ3ZkaXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIyMjIzMiwiZXhwIjoyMDk0Nzk4MjMyfQ.gR1HuhldAW0ePUD3osPrF--EUQD7xn3bzeFxWfd7dRs'
)

async function testPDF() {
  const { data, error } = await supabase
    .from('presupuestos')
    .select('id, cliente, subtotal, analisis_economico')
    .not('analisis_economico', 'is', null)
    .limit(1)

  if (error) {
    console.error('Error:', error)
    return
  }

  if (data && data.length > 0) {
    const presupuesto = data[0]
    console.log('Presupuesto ID:', presupuesto.id)
    console.log('Cliente:', presupuesto.cliente)
    console.log('Subtotal:', presupuesto.subtotal)
    console.log('Análisis:', JSON.stringify(presupuesto.analisis_economico, null, 2))
  } else {
    console.log('No presupuestos found with análisis_economico')
  }
}

testPDF()
