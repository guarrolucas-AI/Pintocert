import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatARS } from '@/lib/utils'
import type { AnalisisData, Presupuesto } from '@/lib/types'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, padding: 36, color: '#1e293b' },
  header: {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#FFD600',
  },
  titulo: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#0a0a0a', marginBottom: 2 },
  subtitulo: { fontSize: 10, color: '#64748b', marginBottom: 8 },

  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 6, color: '#475569', backgroundColor: '#f1f5f9', padding: 6 },

  infoGrid: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 8, color: '#94a3b8', marginBottom: 2 },
  infoValue: { fontSize: 10, fontFamily: 'Helvetica-Bold' },

  table: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  th: { fontSize: 8, fontFamily: 'Helvetica-Bold', padding: '6 8', color: '#64748b', flex: 1 },
  td: { fontSize: 8, padding: '6 8', flex: 1 },
  right: { textAlign: 'right' },

  totalBox: { marginTop: 8, padding: 8, backgroundColor: '#FFD600', borderRadius: 4, alignItems: 'center' },
  totalLabel: { fontSize: 9, color: '#0a0a0a' },
  totalValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0a0a0a' },
})

export function AnalisisPDF({ presupuesto, analisis }: { presupuesto: Presupuesto; analisis: AnalisisData }) {
  if (!analisis) {
    return (
      <Document title={`analisis-${presupuesto.cliente}`}>
        <Page size="A4" style={s.page}>
          <Text>No hay datos de análisis disponibles</Text>
        </Page>
      </Document>
    )
  }

  const gananciaLabel = (analisis.rentabilidad_sobre_ventas ?? 0) >= 0 ? 'Ganancia Bruta' : 'Pérdida'

  return (
    <Document title={`analisis-${presupuesto.cliente}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.titulo}>Análisis Económico-Financiero</Text>
          <Text style={s.subtitulo}>
            {presupuesto.cliente} • {presupuesto.obra_descripcion}
          </Text>
        </View>

        {/* Costos Directos */}
        {analisis.costos_directos && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Costos Directos</Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.th, { flex: 2 }]}>Concepto</Text>
                <Text style={[s.th, s.right]}>Monto</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={[s.td, { flex: 2 }]}>Materiales</Text>
                <Text style={[s.td, s.right]}>{formatARS(analisis.costos_directos.materiales ?? 0)}</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={[s.td, { flex: 2 }]}>Mano de Obra</Text>
                <Text style={[s.td, s.right]}>{formatARS(analisis.costos_directos.mano_obra ?? 0)}</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={[s.th, { flex: 2 }]}>Subtotal Costos Directos</Text>
                <Text style={[s.th, s.right]}>{formatARS(analisis.costos_directos.subtotal ?? 0)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Costos Indirectos */}
        {analisis.costos_indirectos && analisis.costos_indirectos.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Costos Indirectos</Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.th, { flex: 2 }]}>Descripción</Text>
                <Text style={[s.th, s.right]}>Monto</Text>
              </View>
              {analisis.costos_indirectos.map((ci, idx) => (
                <View key={idx} style={s.tableRow}>
                  <Text style={[s.td, { flex: 2 }]}>{ci.descripcion}</Text>
                  <Text style={[s.td, s.right]}>{formatARS(ci.monto)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Resumen de precios */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Resumen de Precios</Text>
          <View style={s.infoGrid}>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Costo Total</Text>
              <Text style={s.infoValue}>{formatARS(analisis.costo_total ?? 0)}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Precio de Venta (sin IVA)</Text>
              <Text style={s.infoValue}>{formatARS(analisis.precio_venta ?? 0)}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>{gananciaLabel}</Text>
              <Text style={[s.infoValue, { color: (analisis.ganancia_bruta ?? 0) >= 0 ? '#16a34a' : '#dc2626' }]}>
                {formatARS(analisis.ganancia_bruta ?? 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Rentabilidad */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Indicadores de Rentabilidad</Text>
          <View style={s.infoGrid}>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Rentabilidad sobre Costos</Text>
              <Text style={s.infoValue}>{((analisis.rentabilidad_sobre_costos ?? 0) as number).toFixed(1)}%</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Rentabilidad sobre Ventas</Text>
              <Text style={s.infoValue}>{((analisis.rentabilidad_sobre_ventas ?? 0) as number).toFixed(1)}%</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Contingencia</Text>
              <Text style={s.infoValue}>
                {((analisis.contingencias_porcentaje ?? 0) as number).toFixed(1)}% ({formatARS(analisis.contingencias_monto ?? 0)})
              </Text>
            </View>
          </View>
        </View>

        {/* Flujo de caja */}
        {analisis.flujo_caja && analisis.flujo_caja.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Flujo de Caja Proyectado</Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.th, { flex: 1.5 }]}>Concepto</Text>
                <Text style={[s.th, { flex: 1.5 }]}>Momento</Text>
                <Text style={[s.th, s.right]}>Monto</Text>
              </View>
              {analisis.flujo_caja.map((fc, idx) => (
                <View key={idx} style={s.tableRow}>
                  <Text style={[s.td, { flex: 1.5 }]}>{fc.concepto}</Text>
                  <Text style={[s.td, { flex: 1.5 }]}>{fc.cuando}</Text>
                  <Text style={[s.td, s.right]}>{formatARS(fc.monto)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Page>
    </Document>
  )
}
