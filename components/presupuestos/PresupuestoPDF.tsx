import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { formatARS } from '@/lib/utils'
import type { Presupuesto } from '@/lib/types'

const EMPRESA_NOMBRE = process.env.NEXT_PUBLIC_EMPRESA_NOMBRE ?? 'Empresa de Pintura'
const EMPRESA_CUIT = process.env.NEXT_PUBLIC_EMPRESA_CUIT ?? '—'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 8, padding: 36, color: '#1e293b' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 3,
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
  titulo: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#FFD600', marginBottom: 1 },
  fechaEmision: { fontSize: 7, color: '#a3a3a3' },

  badge: {
    backgroundColor: '#FFD600',
    color: '#0a0a0a',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginTop: 4,
    alignSelf: 'flex-end',
  },

  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 6, color: '#475569' },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  infoItem: { width: '30%', marginBottom: 6 },
  infoItem50: { width: '47%', marginBottom: 6 },
  infoLabel: { fontSize: 7, color: '#94a3b8', marginBottom: 1 },
  infoValue: { fontSize: 8, fontFamily: 'Helvetica-Bold' },

  // Tabla de ítems
  table: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tableRowLast: { flexDirection: 'row' },
  tableFooter: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  th: { fontSize: 7, fontFamily: 'Helvetica-Bold', padding: '4 6', color: '#64748b' },
  td: { fontSize: 7, padding: '4 6' },
  right: { textAlign: 'right' },
  bold: { fontFamily: 'Helvetica-Bold' },

  cN: { width: '5%' },
  cDesc: { width: '35%' },
  cUnidad: { width: '10%' },
  cCant: { width: '10%', textAlign: 'right' },
  cPU: { width: '20%', textAlign: 'right' },
  cSub: { width: '20%', textAlign: 'right' },

  // Totales
  totalesContainer: { marginTop: 8, alignItems: 'flex-end' },
  totalesBox: { width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingHorizontal: 8 },
  totalRowBorder: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  totalLabel: { fontSize: 7, color: '#64748b' },
  totalValue: { fontSize: 8, fontFamily: 'Helvetica-Bold' },

  // Anticipo destacado
  anticipoBox: {
    backgroundColor: '#FFD600',
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  anticipoLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#0a0a0a' },
  anticipoValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#0a0a0a' },

  // Notas y condiciones
  notasBox: { backgroundColor: '#f8fafc', borderRadius: 4, padding: 8, marginTop: 8 },
  notasLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#64748b', marginBottom: 3 },
  notasText: { fontSize: 7 },

  condicionesGrid: { flexDirection: 'row', gap: 8, marginTop: 8 },
  condicionItem: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, padding: 6 },
  condicionLabel: { fontSize: 7, color: '#94a3b8', marginBottom: 2 },
  condicionValue: { fontSize: 7, fontFamily: 'Helvetica-Bold' },

  // Firmas
  firmasGrid: { flexDirection: 'row', marginTop: 40, gap: 16 },
  firmaItem: { flex: 1, alignItems: 'center' },
  firmaLinea: { borderTopWidth: 1, borderTopColor: '#94a3b8', width: '100%', paddingTop: 4 },
  firmaLabel: { fontSize: 7, color: '#475569', textAlign: 'center' },
})

interface Props {
  presupuesto: Presupuesto
}

export function PresupuestoPDF({ presupuesto: p }: Props) {
  const subtotal = p.items.reduce((acc, item) => acc + item.subtotal, 0)
  const iva = subtotal * (p.iva_porcentaje / 100)
  const total = subtotal + iva
  // Usar el anticipo del presupuesto si existe, sino calcular como 35%
  const anticipo = p.anticipo ?? (total * 0.35)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Encabezado */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Image src="/logo-white.png" style={s.logo} />
            <Text style={s.empresa}>{EMPRESA_NOMBRE}</Text>
            <Text style={s.cuit}>CUIT: {EMPRESA_CUIT}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.titulo}>PRESUPUESTO DE OBRA</Text>
            <Text style={s.fechaEmision}>
              Emitido el {new Date().toLocaleDateString('es-AR')}
            </Text>
            <Text style={s.badge}>VÁLIDO {p.validez_dias} DÍAS</Text>
          </View>
        </View>

        {/* Datos del cliente y la obra */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>DATOS DEL CLIENTE Y LA OBRA</Text>
          <View style={s.infoGrid}>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Cliente / Comitente</Text>
              <Text style={s.infoValue}>{p.cliente || '—'}</Text>
            </View>
            {p.cliente_email && (
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>Email</Text>
                <Text style={s.infoValue}>{p.cliente_email}</Text>
              </View>
            )}
            {p.cliente_telefono && (
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>Teléfono</Text>
                <Text style={s.infoValue}>{p.cliente_telefono}</Text>
              </View>
            )}
            <View style={s.infoItem50}>
              <Text style={s.infoLabel}>Dirección de la obra</Text>
              <Text style={s.infoValue}>{p.obra_direccion || '—'}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Localidad / Provincia</Text>
              <Text style={s.infoValue}>{p.obra_localidad}, {p.obra_provincia}</Text>
            </View>
          </View>
          {p.obra_descripcion && (
            <View style={[s.notasBox, { marginTop: 4 }]}>
              <Text style={s.notasLabel}>Descripción de la obra</Text>
              <Text style={s.notasText}>{p.obra_descripcion}</Text>
            </View>
          )}
        </View>

        {/* Tabla de ítems */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>DETALLE DE TRABAJOS</Text>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, s.cN]}>N°</Text>
              <Text style={[s.th, s.cDesc]}>Descripción</Text>
              <Text style={[s.th, s.cUnidad]}>Unidad</Text>
              <Text style={[s.th, s.cCant]}>Cant.</Text>
              <Text style={[s.th, s.cPU, s.right]}>Precio unit.</Text>
              <Text style={[s.th, s.cSub, s.right]}>Subtotal</Text>
            </View>

            {p.items.map((item, idx) => (
              <View
                key={idx}
                style={idx < p.items.length - 1 ? s.tableRow : s.tableRowLast}
              >
                <Text style={[s.td, s.cN]}>{idx + 1}</Text>
                <Text style={[s.td, s.cDesc, s.bold]}>{item.descripcion}</Text>
                <Text style={[s.td, s.cUnidad]}>{item.unidad}</Text>
                <Text style={[s.td, s.cCant, s.right]}>{item.cantidad}</Text>
                <Text style={[s.td, s.cPU, s.right]}>{formatARS(item.precio_unitario)}</Text>
                <Text style={[s.td, s.cSub, s.right]}>{formatARS(item.subtotal)}</Text>
              </View>
            ))}

            <View style={s.tableFooter}>
              <Text style={[s.td, s.cN]} />
              <Text style={[s.td, s.cDesc, s.bold]}>TOTALES</Text>
              <Text style={[s.td, s.cUnidad]} />
              <Text style={[s.td, s.cCant]} />
              <Text style={[s.td, s.cPU]} />
              <Text style={[s.td, s.cSub, s.right, s.bold]}>{formatARS(subtotal)}</Text>
            </View>
          </View>
        </View>

        {/* Totales y anticipo */}
        <View style={s.totalesContainer}>
          <View style={s.totalesBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Subtotal sin IVA</Text>
              <Text style={s.totalValue}>{formatARS(subtotal)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>IVA ({p.iva_porcentaje}%)</Text>
              <Text style={s.totalValue}>{formatARS(iva)}</Text>
            </View>
            <View style={[s.totalRowBorder, { backgroundColor: '#f1f5f9', borderRadius: 4 }]}>
              <Text style={[s.totalLabel, { fontFamily: 'Helvetica-Bold', color: '#0f172a', fontSize: 9 }]}>
                TOTAL
              </Text>
              <Text style={[s.totalValue, { fontSize: 11 }]}>{formatARS(total)}</Text>
            </View>
          </View>
        </View>

        {/* Anticipo */}
        <View style={s.anticipoBox}>
          <Text style={s.anticipoLabel}>ANTICIPO DE OBRA</Text>
          <Text style={s.anticipoValue}>{formatARS(anticipo)}</Text>
        </View>

        {/* Condiciones */}
        <View style={s.condicionesGrid}>
          <View style={s.condicionItem}>
            <Text style={s.condicionLabel}>Validez del presupuesto</Text>
            <Text style={s.condicionValue}>{p.validez_dias} días corridos</Text>
          </View>
          <View style={s.condicionItem}>
            <Text style={s.condicionLabel}>Forma de pago</Text>
            <Text style={s.condicionValue}>35% anticipo + certificaciones semanales</Text>
          </View>
          <View style={s.condicionItem}>
            <Text style={s.condicionLabel}>Moneda</Text>
            <Text style={s.condicionValue}>Pesos argentinos (ARS)</Text>
          </View>
        </View>

        {p.notas && (
          <View style={s.notasBox}>
            <Text style={s.notasLabel}>Notas y condiciones adicionales</Text>
            <Text style={s.notasText}>{p.notas}</Text>
          </View>
        )}

        {/* Firmas */}
        <View style={s.firmasGrid}>
          {['Empresa contratista', 'Conformidad del cliente'].map((firma) => (
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
