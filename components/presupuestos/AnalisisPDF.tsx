import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { formatARS } from '@/lib/utils'
import type { AnalisisData, Presupuesto } from '@/lib/types'

const EMPRESA_NOMBRE = process.env.NEXT_PUBLIC_EMPRESA_NOMBRE ?? 'Empresa de Pintura'
const EMPRESA_CUIT = process.env.NEXT_PUBLIC_EMPRESA_CUIT ?? '—'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, padding: 36, color: '#1e293b', backgroundColor: '#ffffff' },
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

  clienteInfo: { marginBottom: 12 },
  clienteNombre: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  clienteObra: { fontSize: 10, color: '#64748b' },

  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 8, color: '#ffffff', backgroundColor: '#FFD600', padding: 6, borderRadius: 3 },

  // Tarjetas de métricas clave
  metricasGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  metricaCard: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, backgroundColor: '#f8fafc' },
  metricaLabel: { fontSize: 7, color: '#94a3b8', marginBottom: 3, textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
  metricaValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#0a0a0a' },
  metricaSubtext: { fontSize: 7, color: '#64748b', marginTop: 2 },

  // Tabla compacta
  table: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 4 },
  th: { fontSize: 7, fontFamily: 'Helvetica-Bold', padding: '4 6', color: '#475569', flex: 1 },
  td: { fontSize: 8, padding: '4 6', flex: 1, color: '#1e293b' },
  right: { textAlign: 'right' },

  // Barra visual de distribución de costos
  barContainer: { marginVertical: 6, height: 20, flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  barSection: { height: '100%', justifyContent: 'center', alignItems: 'center' },
  barLabel: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#ffffff' },

  // Resaltado importante
  highlight: { backgroundColor: '#FEF3C7', padding: 8, borderRadius: 3, borderLeftWidth: 3, borderLeftColor: '#FFD600', marginVertical: 8 },
  highlightText: { fontSize: 8, color: '#1e293b', marginBottom: 2 },

  footer: { marginTop: 12, fontSize: 7, color: '#94a3b8', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTopVertical: 8 },
})

function BarraProgreso({ materiales = 0, mano_obra = 0, otros = 0 }: { materiales?: number; mano_obra?: number; otros?: number }) {
  const total = Math.max(materiales + mano_obra + otros, 1)
  const matPct = (materiales / total) * 100
  const moaPct = (mano_obra / total) * 100
  const otrosPct = (otros / total) * 100

  return (
    <View style={s.barContainer}>
      {materiales > 0 && (
        <View style={[s.barSection, { width: `${matPct}%`, backgroundColor: '#3B82F6' }]}>
          {matPct > 10 && <Text style={s.barLabel}>MAT</Text>}
        </View>
      )}
      {mano_obra > 0 && (
        <View style={[s.barSection, { width: `${moaPct}%`, backgroundColor: '#10B981' }]}>
          {moaPct > 10 && <Text style={s.barLabel}>MO</Text>}
        </View>
      )}
      {otros > 0 && (
        <View style={[s.barSection, { width: `${otrosPct}%`, backgroundColor: '#F59E0B' }]}>
          {otrosPct > 10 && <Text style={s.barLabel}>OTROS</Text>}
        </View>
      )}
    </View>
  )
}

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

  // Valores del análisis con fallbacks del presupuesto
  const costo = analisis.costo_total ?? presupuesto.total ?? 0
  // precio_venta debería venir del análisis, pero fallback al subtotal del presupuesto
  const ventaDelAnalisis = analisis.precio_venta ?? 0
  const venta = ventaDelAnalisis > 0 ? ventaDelAnalisis : presupuesto.subtotal ?? 0

  // IVA es un costo que debe restarse de la ganancia
  const montoIVA = presupuesto.monto_iva ?? 0
  const ganancia = analisis.ganancia_bruta ?? Math.max(0, venta - costo - montoIVA)
  const rentabilidad = analisis.rentabilidad_sobre_ventas ?? (venta > 0 ? (ganancia / venta) * 100 : 0)

  const materiales = analisis.costos_directos?.materiales ?? 0
  const manoObra = analisis.costos_directos?.mano_obra ?? 0

  // Combinar IVA con otros costos indirectos
  const costosIndirectosBase = analisis.costos_indirectos ?? []
  const costosIndirectosCombinados = montoIVA > 0
    ? [{ descripcion: 'IVA (21%)', monto: montoIVA }, ...costosIndirectosBase]
    : costosIndirectosBase
  const costoIndirecto = costosIndirectosCombinados.reduce((sum, ci) => sum + (ci.monto ?? 0), 0)

  return (
    <Document title={`analisis-${presupuesto.cliente}`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Image src="/logo-white.png" style={s.logo} />
            <Text style={s.empresa}>{EMPRESA_NOMBRE}</Text>
            <Text style={s.cuit}>CUIT: {EMPRESA_CUIT}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.titulo}>Análisis Económico</Text>
          </View>
        </View>

        {/* Información del cliente */}
        <View style={s.clienteInfo}>
          <Text style={s.clienteNombre}>{presupuesto.cliente}</Text>
          <Text style={s.clienteObra}>{presupuesto.obra_descripcion}</Text>
        </View>

        {/* KPIs Principales - Tarjetas */}
        <View style={s.metricasGrid}>
          <View style={s.metricaCard}>
            <Text style={s.metricaLabel}>Costo Total</Text>
            <Text style={s.metricaValue}>{formatARS(costo)}</Text>
            <Text style={s.metricaSubtext}>de la obra</Text>
          </View>
          <View style={s.metricaCard}>
            <Text style={s.metricaLabel}>Precio Venta</Text>
            <Text style={s.metricaValue}>{formatARS(venta)}</Text>
            <Text style={s.metricaSubtext}>sin IVA</Text>
          </View>
          <View style={[s.metricaCard, { backgroundColor: ganancia >= 0 ? '#DCFCE7' : '#FEE2E2' }]}>
            <Text style={s.metricaLabel}>Ganancia</Text>
            <Text style={[s.metricaValue, { color: ganancia >= 0 ? '#16A34A' : '#DC2626' }]}>
              {formatARS(ganancia)}
            </Text>
            <Text style={s.metricaSubtext}>{rentabilidad.toFixed(1)}% de margen</Text>
          </View>
        </View>

        {/* Distribución de Costos */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Distribución de Costos</Text>
          <BarraProgreso materiales={materiales} mano_obra={manoObra} otros={costoIndirecto} />
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 2 }]}>Concepto</Text>
              <Text style={[s.th, s.right]}>Monto</Text>
              <Text style={[s.th, s.right]}>% del costo</Text>
            </View>
            {materiales > 0 && (
              <View style={s.tableRow}>
                <Text style={[s.td, { flex: 2 }]}>🔨 Materiales</Text>
                <Text style={[s.td, s.right]}>{formatARS(materiales)}</Text>
                <Text style={[s.td, s.right]}>{costo > 0 ? ((materiales / costo) * 100).toFixed(0) : 0}%</Text>
              </View>
            )}
            {manoObra > 0 && (
              <View style={s.tableRow}>
                <Text style={[s.td, { flex: 2 }]}>👷 Mano de Obra</Text>
                <Text style={[s.td, s.right]}>{formatARS(manoObra)}</Text>
                <Text style={[s.td, s.right]}>{costo > 0 ? ((manoObra / costo) * 100).toFixed(0) : 0}%</Text>
              </View>
            )}
            {costosIndirectosCombinados.filter(ci => ci.monto > 0).map((ci, idx) => (
              <View key={idx} style={s.tableRow}>
                <Text style={[s.td, { flex: 2 }]}>{ci.descripcion}</Text>
                <Text style={[s.td, s.right]}>{formatARS(ci.monto)}</Text>
                <Text style={[s.td, s.right]}>{costo > 0 ? ((ci.monto / costo) * 100).toFixed(0) : 0}%</Text>
              </View>
            ))}
            <View style={[s.tableRow, { backgroundColor: '#f1f5f9' }]}>
              <Text style={[s.th, { flex: 2 }]}>TOTAL COSTO</Text>
              <Text style={[s.th, s.right]}>{formatARS(costo)}</Text>
              <Text style={[s.th, s.right]}>100%</Text>
            </View>
          </View>
        </View>

        {/* Margen de Ganancia */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Margen de Ganancia</Text>
          <View style={[s.highlight, { borderLeftColor: ganancia >= 0 ? '#10B981' : '#EF4444' }]}>
            <Text style={s.highlightText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Ganancia Bruta:</Text> {formatARS(ganancia)}
            </Text>
            <Text style={s.highlightText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Rentabilidad sobre Ventas:</Text> {rentabilidad.toFixed(1)}%
            </Text>
            {analisis.rentabilidad_sobre_costos && (
              <Text style={s.highlightText}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>Rentabilidad sobre Costos:</Text>{' '}
                {(analisis.rentabilidad_sobre_costos as number).toFixed(1)}%
              </Text>
            )}
          </View>
        </View>

        {/* Contingencias */}
        {(analisis.contingencias_monto ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Contingencias</Text>
            <View style={s.highlight}>
              <Text style={s.highlightText}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                  {((analisis.contingencias_porcentaje ?? 0) as number).toFixed(1)}%
                </Text>{' '}
                ({formatARS(analisis.contingencias_monto ?? 0)}) reservado para imprevistos
              </Text>
            </View>
          </View>
        )}

        {/* Flujo de Caja */}
        {(analisis.flujo_caja ?? []).length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Flujo de Caja Proyectado</Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.th, { flex: 1.5 }]}>Concepto</Text>
                <Text style={[s.th, { flex: 1 }]}>Momento</Text>
                <Text style={[s.th, s.right]}>Monto</Text>
              </View>
              {(analisis.flujo_caja ?? []).map((fc, idx) => (
                <View key={idx} style={s.tableRow}>
                  <Text style={[s.td, { flex: 1.5 }]}>{fc.concepto}</Text>
                  <Text style={[s.td, { flex: 1 }]}>{fc.cuando}</Text>
                  <Text style={[s.td, s.right]}>{formatARS(fc.monto)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <Text>Análisis generado automáticamente. Requiere revisión de contabilidad.</Text>
        </View>
      </Page>
    </Document>
  )
}
