import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { formatARS, nombreMes } from '@/lib/utils'
import type { CertificadoConItems } from '@/lib/types'

const EMPRESA_NOMBRE = process.env.NEXT_PUBLIC_EMPRESA_NOMBRE ?? 'Empresa de Pintura'
const EMPRESA_CUIT = process.env.NEXT_PUBLIC_EMPRESA_CUIT ?? '—'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    padding: 36,
    color: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 3,
    borderBottomColor: '#FFD600',
    paddingBottom: 10,
    backgroundColor: '#0a0a0a',
    padding: 12,
    borderRadius: 4,
  },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end' },
  logo: { width: 130, height: 34, objectFit: 'contain' },
  empresa: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#ffffff', marginBottom: 1 },
  cuit: { fontSize: 8, color: '#a3a3a3' },
  titulo: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#FFD600', marginBottom: 1 },
  fechaEmision: { fontSize: 7, color: '#a3a3a3' },

  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 6, color: '#475569' },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  infoItem: { width: '30%', marginBottom: 6 },
  infoLabel: { fontSize: 7, color: '#94a3b8', marginBottom: 1 },
  infoValue: { fontSize: 8, fontFamily: 'Helvetica-Bold' },

  table: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tableRowLast: { flexDirection: 'row' },
  tableFooter: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderTopWidth: 1, borderTopColor: '#e2e8f0' },

  th: { fontSize: 7, fontFamily: 'Helvetica-Bold', padding: '4 6', color: '#64748b' },
  td: { fontSize: 7, padding: '4 6' },
  right: { textAlign: 'right' },
  bold: { fontFamily: 'Helvetica-Bold' },
  primary: { color: '#0f172a' },

  col1: { width: '5%' },
  col2: { width: '25%' },
  col3: { width: '12%' },
  col4: { width: '9%' },
  col5: { width: '12%' },
  col6: { width: '9%' },
  col7: { width: '12%' },
  col8: { width: '9%' },
  col9: { width: '12%' },

  totalesGrid: { flexDirection: 'row', gap: 8, marginTop: 8 },
  totalBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
  },
  totalBoxPrimary: {
    flex: 1,
    backgroundColor: '#FFD600',
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
  },
  totalLabel: { fontSize: 7, color: '#94a3b8', marginBottom: 3 },
  totalLabelPrimary: { fontSize: 7, color: '#0a0a0a', marginBottom: 3 },
  totalValue: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  totalValuePrimary: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0a0a0a' },

  firmasGrid: { flexDirection: 'row', marginTop: 48, gap: 16 },
  firmaItem: { flex: 1, alignItems: 'center' },
  firmaLinea: { borderTopWidth: 1, borderTopColor: '#94a3b8', width: '100%', paddingTop: 4 },
  firmaLabel: { fontSize: 7, color: '#475569', textAlign: 'center' },

  notasBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
  },
  notasLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#64748b', marginBottom: 3 },
  notasText: { fontSize: 7 },
})

interface Props {
  cert: CertificadoConItems
}

export function CertPDF({ cert }: Props) {
  const obra = cert.obra!
  const totalPeriodo = cert.items.reduce((s, ci) => s + ci.importe_periodo, 0)
  const totalAcumAnterior = cert.items.reduce((s, ci) => s + ci.importe_acumulado_anterior, 0)
  const totalAcumTotal = cert.items.reduce((s, ci) => s + ci.importe_acumulado_total, 0)
  const saldo = obra.presupuesto_total - totalAcumTotal

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* Encabezado */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Image src="/Logo Flipping Nuevo.png" style={s.logo} />
            <Text style={s.empresa}>{EMPRESA_NOMBRE}</Text>
            <Text style={s.cuit}>CUIT: {EMPRESA_CUIT}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.titulo}>CERTIFICADO DE AVANCE DE OBRA N° {cert.numero}</Text>
            <Text style={s.fechaEmision}>
              Emitido el {new Date().toLocaleDateString('es-AR')}
            </Text>
          </View>
        </View>

        {/* Datos de la obra */}
        <View style={s.section}>
          <View style={s.infoGrid}>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Obra</Text>
              <Text style={s.infoValue}>{obra.nombre}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Dirección</Text>
              <Text style={s.infoValue}>{obra.direccion}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Comitente</Text>
              <Text style={s.infoValue}>{obra.cliente}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Período</Text>
              <Text style={s.infoValue}>
                {nombreMes(cert.periodo_mes)} {cert.periodo_anio}
              </Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Fecha de medición</Text>
              <Text style={s.infoValue}>
                {new Date(cert.fecha_medicion + 'T12:00:00').toLocaleDateString('es-AR')}
              </Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Monto de contrato</Text>
              <Text style={s.infoValue}>{formatARS(obra.presupuesto_total)}</Text>
            </View>
          </View>
        </View>

        {/* Tabla de ítems */}
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.th, s.col1]}>N°</Text>
            <Text style={[s.th, s.col2]}>Descripción</Text>
            <Text style={[s.th, s.col3, s.right]}>Presupuesto</Text>
            <Text style={[s.th, s.col4, s.right]}>Ac. ant. %</Text>
            <Text style={[s.th, s.col5, s.right]}>Ac. ant. $</Text>
            <Text style={[s.th, s.col6, s.right]}>P. cert. %</Text>
            <Text style={[s.th, s.col7, s.right]}>P. cert. $</Text>
            <Text style={[s.th, s.col8, s.right]}>Ac. tot. %</Text>
            <Text style={[s.th, s.col9, s.right]}>Ac. tot. $</Text>
          </View>

          {cert.items.map((ci, idx) => (
            <View key={ci.id} style={idx < cert.items.length - 1 ? s.tableRow : s.tableRowLast}>
              <Text style={[s.td, s.col1]}>{idx + 1}</Text>
              <Text style={[s.td, s.col2, s.bold]}>{ci.item?.descripcion}</Text>
              <Text style={[s.td, s.col3, s.right]}>{formatARS(ci.item?.presupuesto ?? 0)}</Text>
              <Text style={[s.td, s.col4, s.right]}>
                {ci.pct_acumulado_anterior.toFixed(1)}%
              </Text>
              <Text style={[s.td, s.col5, s.right]}>
                {formatARS(ci.importe_acumulado_anterior)}
              </Text>
              <Text style={[s.td, s.col6, s.right, s.bold]}>{ci.pct_periodo.toFixed(1)}%</Text>
              <Text style={[s.td, s.col7, s.right, s.bold]}>
                {formatARS(ci.importe_periodo)}
              </Text>
              <Text style={[s.td, s.col8, s.right]}>
                {ci.pct_acumulado_total.toFixed(1)}%
              </Text>
              <Text style={[s.td, s.col9, s.right]}>
                {formatARS(ci.importe_acumulado_total)}
              </Text>
            </View>
          ))}

          <View style={s.tableFooter}>
            <Text style={[s.td, s.col1]} />
            <Text style={[s.td, s.col2, s.bold]}>TOTALES</Text>
            <Text style={[s.td, s.col3, s.right, s.bold]}>
              {formatARS(obra.presupuesto_total)}
            </Text>
            <Text style={[s.td, s.col4]} />
            <Text style={[s.td, s.col5, s.right, s.bold]}>
              {formatARS(totalAcumAnterior)}
            </Text>
            <Text style={[s.td, s.col6]} />
            <Text style={[s.td, s.col7, s.right, s.bold]}>{formatARS(totalPeriodo)}</Text>
            <Text style={[s.td, s.col8]} />
            <Text style={[s.td, s.col9, s.right, s.bold]}>{formatARS(totalAcumTotal)}</Text>
          </View>
        </View>

        {/* Totales resumen */}
        <View style={s.totalesGrid}>
          <View style={s.totalBoxPrimary}>
            <Text style={s.totalLabelPrimary}>Presente certificado</Text>
            <Text style={s.totalValuePrimary}>{formatARS(totalPeriodo)}</Text>
          </View>
          <View style={s.totalBox}>
            <Text style={s.totalLabel}>Acumulado a origen</Text>
            <Text style={s.totalValue}>{formatARS(totalAcumTotal)}</Text>
          </View>
          <View style={s.totalBox}>
            <Text style={s.totalLabel}>Saldo de contrato</Text>
            <Text style={s.totalValue}>{formatARS(saldo)}</Text>
          </View>
        </View>

        {cert.notas && (
          <View style={s.notasBox}>
            <Text style={s.notasLabel}>Notas</Text>
            <Text style={s.notasText}>{cert.notas}</Text>
          </View>
        )}

        {/* Firmas */}
        <View style={s.firmasGrid}>
          {['Empresa contratista', 'Inspector / Capataz', 'Comitente'].map((firma) => (
            <View key={firma} style={s.firmaItem}>
              <View style={s.firmaLinea}>
                <Text style={s.firmaLabel}>{firma}</Text>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}
