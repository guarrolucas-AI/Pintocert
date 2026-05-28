import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { formatARS } from '@/lib/utils'
import type { PlanEjecucionData, Presupuesto } from '@/lib/types'

const EMPRESA_NOMBRE = process.env.NEXT_PUBLIC_EMPRESA_NOMBRE ?? 'Empresa de Pintura'
const EMPRESA_CUIT = process.env.NEXT_PUBLIC_EMPRESA_CUIT ?? '—'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, padding: 36, color: '#1e293b' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#FFD600',
    backgroundColor: '#0a0a0a',
    padding: 12,
    borderRadius: 4,
  },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end' },
  logo: { width: 130, height: 34, objectFit: 'contain' },
  empresa: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#ffffff', marginBottom: 1 },
  cuit: { fontSize: 8, color: '#a3a3a3' },
  titulo: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#FFD600', marginBottom: 1 },

  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 6, color: '#475569', backgroundColor: '#f1f5f9', padding: 6 },

  infoGrid: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 8, color: '#94a3b8', marginBottom: 2 },
  infoValue: { fontSize: 10, fontFamily: 'Helvetica-Bold' },

  // Tabla semanas
  table: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  th: { fontSize: 8, fontFamily: 'Helvetica-Bold', padding: '6 8', color: '#64748b', flex: 1 },
  td: { fontSize: 8, padding: '6 8', flex: 1 },
  right: { textAlign: 'right' },

  semanaBox: { marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, padding: 8, backgroundColor: '#f8fafc' },
  semanaHeader: { fontFamily: 'Helvetica-Bold', fontSize: 9, marginBottom: 4, color: '#475569' },
  itemsList: { marginBottom: 4, paddingLeft: 8 },
  itemText: { fontSize: 8, color: '#64748b', marginBottom: 2 },

  progressBar: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', backgroundColor: '#FFD600' },
})

export function PlanEjecucionPDF({ presupuesto, plan }: { presupuesto: Presupuesto; plan: PlanEjecucionData }) {
  if (!plan) {
    return (
      <Document title={`plan-ejecucion-${presupuesto.cliente}`}>
        <Page size="A4" style={s.page}>
          <Text>No hay datos de plan de ejecución disponibles</Text>
        </Page>
      </Document>
    )
  }

  return (
    <Document title={`plan-ejecucion-${presupuesto.cliente}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Image src="/logo-white.png" style={s.logo} />
            <Text style={s.empresa}>{EMPRESA_NOMBRE}</Text>
            <Text style={s.cuit}>CUIT: {EMPRESA_CUIT}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.titulo}>Plan de Obra</Text>
          </View>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>
            {presupuesto.cliente}
          </Text>
          <Text style={{ fontSize: 10, color: '#64748b' }}>
            {presupuesto.obra_descripcion}
          </Text>
        </View>

        {/* Información General */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Información General</Text>
          <View style={s.infoGrid}>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Duración Total</Text>
              <Text style={s.infoValue}>{plan.duracion_semanas} semanas</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Anticipo</Text>
              <Text style={s.infoValue}>{plan.anticipo_porcentaje}% ({formatARS(plan.anticipo_monto)})</Text>
            </View>
          </View>
        </View>

        {/* Detalle por Semana */}
        {plan.semanas && plan.semanas.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Cronograma de Ejecución</Text>
            {plan.semanas.map((semana, idx) => (
              <View key={idx} style={s.semanaBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={s.semanaHeader}>Semana {semana.numero}</Text>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#FFD600' }}>
                    {semana.porcentaje_avance}% - {formatARS(semana.monto_certificar)}
                  </Text>
                </View>

                <Text style={{ fontSize: 9, marginBottom: 4, color: '#475569' }}>
                  {semana.descripcion}
                </Text>

                {semana.items_incluidos && semana.items_incluidos.length > 0 && (
                  <View style={s.itemsList}>
                    <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 2, color: '#64748b' }}>
                      Ítems incluidos:
                    </Text>
                    {semana.items_incluidos.map((item, itemIdx) => (
                      <Text key={itemIdx} style={s.itemText}>
                        • {item}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Barra de progreso */}
                <View style={s.progressBar}>
                  <View style={[s.progressFill, { width: `${semana.porcentaje_avance}%` }]} />
                </View>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  )
}
