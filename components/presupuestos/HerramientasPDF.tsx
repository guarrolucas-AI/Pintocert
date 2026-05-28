import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatARS } from '@/lib/utils'
import type { HerramientasData, Presupuesto } from '@/lib/types'

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

  infoLabel: { fontSize: 8, color: '#94a3b8', marginBottom: 2 },
  infoValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 6 },

  // Tabla
  table: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  th: { fontSize: 8, fontFamily: 'Helvetica-Bold', padding: '6 8', color: '#64748b', flex: 1 },
  td: { fontSize: 8, padding: '6 8', flex: 1 },
  right: { textAlign: 'right' },

  badge: { fontSize: 7, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3, fontFamily: 'Helvetica-Bold' },
  badgePropio: { backgroundColor: '#dbeafe', color: '#0369a1' },
  badgeAlquiler: { backgroundColor: '#fef3c7', color: '#92400e' },

  notas: { marginTop: 12, fontSize: 8, color: '#64748b', padding: 8, backgroundColor: '#f8fafc', borderRadius: 4 },
})

export function HerramientasPDF({ presupuesto, herramientas }: { presupuesto: Presupuesto; herramientas: HerramientasData }) {
  return (
    <Document title={`herramientas-${presupuesto.cliente}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.titulo}>Plan de Herramientas y Seguridad</Text>
          <Text style={s.subtitulo}>
            {presupuesto.cliente} • {presupuesto.obra_descripcion}
          </Text>
        </View>

        {/* Herramientas */}
        {herramientas.herramientas && herramientas.herramientas.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Herramientas Requeridas</Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.th, { flex: 1.5 }]}>Nombre</Text>
                <Text style={s.th}>Tipo</Text>
                <Text style={[s.th, s.right]}>Costo Estimado</Text>
              </View>
              {herramientas.herramientas.map((her, idx) => (
                <View key={idx} style={s.tableRow}>
                  <Text style={[s.td, { flex: 1.5 }]}>{her.nombre}</Text>
                  <View style={[s.td, her.tipo === 'propio' ? s.badgePropio : s.badgeAlquiler, s.badge]}>
                    <Text style={{ color: 'inherit' }}>
                      {her.tipo === 'propio' ? 'Propio' : 'Alquiler'}
                    </Text>
                  </View>
                  <Text style={[s.td, s.right]}>
                    {her.costo_estimado ? formatARS(her.costo_estimado) : '—'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Medidas de seguridad */}
        {herramientas.medidas_seguridad && herramientas.medidas_seguridad.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Medidas de Seguridad</Text>
            {herramientas.medidas_seguridad.map((med, idx) => (
              <View key={idx} style={{ marginBottom: 8 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, marginBottom: 3 }}>
                  {med.categoria}
                </Text>
                <View style={{ paddingLeft: 8 }}>
                  {med.medidas.map((medida, midx) => (
                    <Text key={midx} style={{ fontSize: 8, marginBottom: 2, color: '#475569' }}>
                      • {medida}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Notas */}
        {herramientas.notas && (
          <View style={s.notas}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>Notas:</Text>
            <Text>{herramientas.notas}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}
