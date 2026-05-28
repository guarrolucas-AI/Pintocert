'use client'

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { pdf } from '@react-pdf/renderer'
import { formatARS } from '@/lib/utils'
import type { ObraConAvance } from '@/lib/types'
import type { DashboardKPIs } from '@/lib/types'
import { getEstadoLabel } from '@/lib/dashboard-utils'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 20,
  },
  date: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
  },
  kpiContainer: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
  },
  kpiLabel: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 2,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableCell: {
    fontSize: 9,
    flex: 1,
    color: '#334155',
  },
  tableCellHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    flex: 1,
    color: '#0f172a',
  },
  tableCellNarrow: {
    fontSize: 9,
    flex: 0.6,
    color: '#334155',
  },
  tableCellHeaderNarrow: {
    fontSize: 9,
    fontWeight: 'bold',
    flex: 0.6,
    color: '#0f172a',
  },
  negativeText: {
    color: '#dc2626',
  },
  footer: {
    marginTop: 30,
    fontSize: 9,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTopVertical: 10,
  },
})

interface DashboardPDFReportProps {
  obras: ObraConAvance[]
  kpis: DashboardKPIs
}

export function DashboardPDFReport({ obras, kpis }: DashboardPDFReportProps) {
  const ReportDocument = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard Comercial</Text>
          <Text style={styles.subtitle}>Estado financiero de obras</Text>
          <Text style={styles.date}>
            Generado: {new Date().toLocaleDateString('es-AR')} a las{' '}
            {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {/* KPI Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen Financiero</Text>
          <View style={styles.kpiContainer}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Presupuestado</Text>
              <Text style={styles.kpiValue}>{formatARS(kpis.presupuestadoTotal)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Ejecutado</Text>
              <Text style={styles.kpiValue}>{formatARS(kpis.ejecutadoTotal)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Saldo</Text>
              <Text
                style={{
                  ...styles.kpiValue,
                  ...(kpis.saldoTotal < 0 ? styles.negativeText : {}),
                }}
              >
                {formatARS(kpis.saldoTotal)}
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>% Avance</Text>
              <Text style={styles.kpiValue}>{kpis.porcentajeAvancePromedio}%</Text>
            </View>
          </View>
        </View>

        {/* Estado Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Obras por Estado</Text>
          <View style={styles.kpiContainer}>
            {Object.entries(kpis.obrasPorEstado)
              .filter(([, count]) => count > 0)
              .map(([estado, count]) => (
                <View key={estado} style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>{getEstadoLabel(estado as any)}</Text>
                  <Text style={styles.kpiValue}>{count}</Text>
                  <Text style={{ fontSize: 8, color: '#64748b', marginTop: 4 }}>
                    {formatARS((kpis.montosPorEstado as any)[estado] || 0)}
                  </Text>
                </View>
              ))}
          </View>
        </View>

        {/* Obras Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle de Obras</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.tableCellHeader, flex: 2 }}>Obra</Text>
              <Text style={{ ...styles.tableCellHeader, flex: 1.5 }}>Cliente</Text>
              <Text style={styles.tableCellHeader}>Presupuesto</Text>
              <Text style={styles.tableCellHeader}>Ejecutado</Text>
              <Text style={styles.tableCellHeader}>Saldo</Text>
              <Text style={styles.tableCellHeaderNarrow}>% Ejec</Text>
              <Text style={styles.tableCellHeaderNarrow}>Estado</Text>
            </View>

            {/* Table Rows */}
            {obras.map((obra) => {
              const saldo = obra.presupuesto_total - obra.ejecutado_total
              const porcentajeEjecucion =
                obra.presupuesto_total > 0
                  ? Math.round((obra.ejecutado_total / obra.presupuesto_total) * 100)
                  : 0

              return (
                <View key={obra.obra_id} style={styles.tableRow}>
                  <Text style={{ ...styles.tableCell, flex: 2 }}>{obra.nombre}</Text>
                  <Text style={{ ...styles.tableCell, flex: 1.5 }}>{obra.cliente}</Text>
                  <Text style={styles.tableCell}>${Math.round(obra.presupuesto_total / 1000)}k</Text>
                  <Text style={styles.tableCell}>${Math.round(obra.ejecutado_total / 1000)}k</Text>
                  <Text
                    style={{
                      ...styles.tableCell,
                      ...(saldo < 0 ? styles.negativeText : {}),
                    }}
                  >
                    ${Math.round(saldo / 1000)}k
                  </Text>
                  <Text style={styles.tableCellNarrow}>{porcentajeEjecucion}%</Text>
                  <Text style={styles.tableCellNarrow}>{getEstadoLabel(obra.estado)}</Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Reporte generado automáticamente desde PintoCert</Text>
        </View>
      </Page>
    </Document>
  )

  return ReportDocument
}

export async function downloadDashboardPDF(obras: ObraConAvance[], kpis: DashboardKPIs) {
  const blob = await pdf(<DashboardPDFReport obras={obras} kpis={kpis} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dashboard-comercial-${new Date().toISOString().split('T')[0]}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
