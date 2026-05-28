import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { formatARS } from '@/lib/utils'
import type { MaterialesData, Presupuesto } from '@/lib/types'

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
  subtitulo: { fontSize: 9, color: '#64748b', marginBottom: 8 },

  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 6, color: '#475569', backgroundColor: '#f1f5f9', padding: 6 },

  infoGrid: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 8, color: '#94a3b8', marginBottom: 2 },
  infoValue: { fontSize: 10, fontFamily: 'Helvetica-Bold' },

  // Tabla
  table: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tableFooter: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  th: { fontSize: 8, fontFamily: 'Helvetica-Bold', padding: '6 8', color: '#64748b', flex: 1 },
  td: { fontSize: 8, padding: '6 8', flex: 1 },
  right: { textAlign: 'right' },

  total: { marginTop: 8, alignItems: 'flex-end' },
  totalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  totalValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#FFD600' },

  notas: { marginTop: 12, fontSize: 8, color: '#64748b', padding: 8, backgroundColor: '#f8fafc', borderRadius: 4 },
})

export function MaterialesPDF({ presupuesto, materiales }: { presupuesto: Presupuesto; materiales: MaterialesData }) {
  return (
    <Document title={`materiales-${presupuesto.cliente}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Image src="/logo-white.png" style={s.logo} />
            <Text style={s.empresa}>{EMPRESA_NOMBRE}</Text>
            <Text style={s.cuit}>CUIT: {EMPRESA_CUIT}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.titulo}>Materiales</Text>
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

        {/* Información del proyecto */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Información del Proyecto</Text>
          <View style={s.infoGrid}>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Cliente</Text>
              <Text style={s.infoValue}>{presupuesto.cliente}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Ubicación</Text>
              <Text style={s.infoValue}>
                {presupuesto.obra_localidad}, {presupuesto.obra_provincia}
              </Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Dirección</Text>
              <Text style={s.infoValue}>{presupuesto.obra_direccion}</Text>
            </View>
          </View>
        </View>

        {/* Tabla de materiales */}
        {materiales.materiales && materiales.materiales.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Materiales Requeridos</Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.th, { flex: 2 }]}>Material</Text>
                <Text style={s.th}>Cantidad</Text>
                <Text style={s.th}>Unidad</Text>
                <Text style={[s.th, s.right]}>Precio Unitario</Text>
                <Text style={[s.th, s.right]}>Subtotal</Text>
              </View>
              {materiales.materiales.map((mat, idx) => {
                const precio = mat.precio_estimado ?? 0
                return (
                  <View key={idx} style={s.tableRow}>
                    <Text style={[s.td, { flex: 2 }]}>{mat.descripcion}</Text>
                    <Text style={s.td}>{mat.cantidad}</Text>
                    <Text style={s.td}>{mat.unidad}</Text>
                    <Text style={[s.td, s.right]}>{formatARS(precio)}</Text>
                    <Text style={[s.td, s.right]}>{formatARS(mat.cantidad * precio)}</Text>
                  </View>
                )
              })}
              <View style={s.tableFooter}>
                <Text style={[s.td, { flex: 2 }]} />
                <Text style={s.td} />
                <Text style={s.td} />
                <Text style={[s.th, s.right]}>TOTAL</Text>
                <Text style={[s.th, s.right]}>{formatARS(materiales.total_estimado)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Resumen */}
        <View style={s.total}>
          <Text style={s.totalLabel}>Costo Total de Materiales</Text>
          <Text style={s.totalValue}>{formatARS(materiales.total_estimado)}</Text>
        </View>

        {/* Notas */}
        {materiales.notas && (
          <View style={s.notas}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>Notas:</Text>
            <Text>{materiales.notas}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}
