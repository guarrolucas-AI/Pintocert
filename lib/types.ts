export type Rol = 'admin' | 'capataz' | 'operario'
export type EstadoObra = 'borrador' | 'enviado_aprobacion' | 'aprobado' | 'en_ejecucion' | 'terminado' | 'pausado' | 'rechazado'
export type EstadoCertificado = 'borrador' | 'aprobado'

export interface Perfil {
  id: string
  nombre: string
  email: string
  rol: Rol
  created_at: string
}

export interface Obra {
  id: string
  nombre: string
  direccion: string
  cliente: string
  presupuesto_total: number
  fecha_inicio: string | null
  estado: EstadoObra
  notas: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ItemObra {
  id: string
  obra_id: string
  descripcion: string
  presupuesto: number
  orden: number
  created_at: string
}

export interface Certificado {
  id: string
  obra_id: string
  numero: number
  fecha_medicion: string
  periodo_mes: number
  periodo_anio: number
  estado: EstadoCertificado
  notas: string | null
  created_by: string
  created_at: string
}

export interface CertificadoItem {
  id: string
  certificado_id: string
  item_id: string
  pct_acumulado_anterior: number
  pct_periodo: number
  pct_acumulado_total: number
  importe_periodo: number
  importe_acumulado_anterior: number
  importe_acumulado_total: number
}

// Lo que devuelve la vista obras_avance (obra_id en vez de id)
export interface ObraConAvance {
  obra_id: string
  nombre: string
  direccion: string
  cliente: string
  presupuesto_total: number
  fecha_inicio: string | null
  estado: EstadoObra
  notas: string | null
  created_by: string
  created_at: string
  updated_at: string
  ejecutado_total: number
  total_certificados: number
}

export interface CertificadoConItems extends Certificado {
  obra?: Obra
  items: (CertificadoItem & { item: ItemObra })[]
}

export interface Pago {
  id: string
  obra_id: string
  fecha_pago: string
  importe: number
  referencia: string | null
  notas: string | null
  comprobante_url: string | null
  created_by: string
  created_at: string
}

// ─── Presupuestos ───────────────────────────────────────────────────────────

export type EstadoPresupuesto = 'borrador' | 'enviado_aprobacion' | 'aprobado' | 'en_ejecucion' | 'terminado' | 'pausado' | 'rechazado'
export type ModuloAgente = 'presupuesto' | 'materiales' | 'personal' | 'herramientas' | 'analisis' | 'plan_ejecucion'

export interface ItemPresupuesto {
  descripcion: string
  unidad: string       // 'm²', 'm lineal', 'global', 'unidad', etc.
  cantidad: number
  precio_unitario: number
  subtotal: number
}

// Estructuras generadas por el agente IA
export interface MaterialItem {
  descripcion: string
  unidad: string
  cantidad: number
  precio_estimado?: number
  precio_minimo?: number
  precio_maximo?: number
  proveedores?: { nombre: string; precio: number; url?: string }[]
  notas?: string
}

export interface MaterialesData {
  materiales: MaterialItem[]
  total_estimado: number
  notas?: string
}

export interface ColaboradorPlan {
  especialidad: string
  cantidad: number
  dias: number
  costo_dia: number
  subtotal: number
}

export interface PersonalData {
  colaboradores: ColaboradorPlan[]
  total_mano_obra: number
  duracion_total_dias: number
  notas?: string
}

export interface HerramientaItem {
  nombre: string
  tipo: 'propio' | 'alquiler'
  costo_estimado?: number
  observaciones?: string
}

export interface MedidaSeguridad {
  categoria: string
  medidas: string[]
  normativa?: string
}

export interface HerramientasData {
  herramientas: HerramientaItem[]
  medidas_seguridad: MedidaSeguridad[]
  notas?: string
}

export interface AnalisisData {
  costos_directos: { materiales: number; mano_obra: number; subtotal: number }
  costos_indirectos: { descripcion: string; monto: number }[]
  contingencias_porcentaje: number
  contingencias_monto: number
  costo_total: number
  precio_venta: number
  ganancia_bruta: number
  rentabilidad_sobre_costos: number
  rentabilidad_sobre_ventas: number
  flujo_caja: { concepto: string; monto: number; cuando: string }[]
  notas?: string
  recomendaciones?: string[]
}

export interface PlanEjecucionData {
  duracion_semanas: number
  anticipo_porcentaje: number
  anticipo_monto: number
  semanas: {
    numero: number
    descripcion: string
    items_incluidos: string[]
    porcentaje_avance: number
    monto_certificar: number
  }[]
}

export interface Presupuesto {
  id: string
  estado: EstadoPresupuesto
  cliente: string
  cliente_email: string | null
  cliente_telefono: string | null
  obra_descripcion: string
  obra_direccion: string
  obra_localidad: string
  obra_provincia: string
  items: ItemPresupuesto[]
  iva_porcentaje: number
  subtotal: number
  monto_iva: number
  total: number
  anticipo: number | null
  validez_dias: number
  notas: string | null
  lista_materiales: MaterialesData | null
  plan_personal: PersonalData | null
  herramientas_seguridad: HerramientasData | null
  analisis_economico: AnalisisData | null
  obra_id: string | null
  fecha_aprobacion: string | null
  plan_ejecucion: PlanEjecucionData | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface MensajeChat {
  role: 'user' | 'assistant'
  content: string
}

export interface PresupuestoMensajes {
  id: string
  presupuesto_id: string
  modulo: ModuloAgente
  messages: MensajeChat[]
  updated_at: string
}

export interface PrecioCache {
  id: string
  material_nombre: string
  precio_unitario: number
  precio_minimo?: number
  precio_maximo?: number
  proveedor?: string
  url_fuente?: string
  fecha_busqueda: string
  valido_hasta: string
  created_at: string
  updated_at: string
}

// ─── Gastos de Obra ────────────────────────────────────────────────────────

export interface GastoObra {
  id: string
  obra_id: string
  fecha: string
  categoria: string  // 'materiales' | 'mano_obra' | 'otros' | custom category name
  descripcion: string
  monto: number
  comprobante_numero?: string
  proveedor?: string
  comprobante_url?: string  // Optional image/PDF URL
  notas?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface CategoriaGastoPersonalizado {
  id: string
  user_id: string
  nombre: string
  color_hex?: string
  activa: boolean
  created_at: string
}

// ─── Fotos de Obra ─────────────────────────────────────────────────────────

export interface FotoObra {
  id: string
  obra_id: string
  foto_url: string  // Public URL from Supabase Storage
  titulo: string
  descripcion?: string
  fecha_foto: string  // Date when photo was taken
  tags?: string[]  // For categorizing (frente, costado, interior, etc)
  created_by: string
  created_at: string
  updated_at: string
}

// ─── Cash Flow ─────────────────────────────────────────────────────────────

export interface FlujoCajaReal {
  id: string
  obra_id: string
  mes: number  // 1-12
  anio: number
  ingresos_total: number
  ingresos_certificados: number
  ingresos_otros: number
  egresos_total: number
  egresos_materiales: number
  egresos_mano_obra: number
  egresos_otros: number
  saldo_mes: number
  saldo_acumulado: number
  created_at: string
  updated_at: string
}

export interface FlujoCajaProyectado {
  id: string
  presupuesto_id: string
  obra_id?: string
  fecha_inicio: string
  ingresos_total: number
  ingresos_por_mes: Array<{ mes: number; monto: number }>
  egresos_total: number
  egresos_por_mes: Array<{ mes: number; monto: number }>
  saldo_proyectado: number
  created_at: string
  updated_at: string
}

// ─── Contabilidad Central ──────────────────────────────────────────────

export interface GastoCentral {
  id: string
  fecha: string
  tipo_gasto: 'sueldo' | 'combustible' | 'maquina' | 'material' | 'retiro_socio' | 'otro'
  categoria: string  // Custom category for organization
  descripcion: string
  monto: number
  comprobante_numero?: string
  proveedor?: string
  comprobante_url?: string  // Public URL from Supabase Storage
  notas?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface CategoriaGastoCentral {
  id: string
  nombre: string
  color_hex?: string
  activa: boolean
  created_at: string
  updated_at: string
}

export interface FlujoCajaCentral {
  id: string
  mes: number  // 1-12
  anio: number
  ingresos_total: number  // Always 0 for central expenses
  egresos_total: number
  egresos_sueldo: number
  egresos_combustible: number
  egresos_maquina: number
  egresos_material: number
  egresos_retiro_socio: number
  egresos_otro: number
  saldo_mes: number  // Negative (expenses reduce balance)
  saldo_acumulado: number
  created_at: string
  updated_at: string
}

// ─── Dashboard KPIs ───────────────────────────────────────────────────────

export interface KPISnapshot {
  periodo_mes: number
  periodo_anio: number
  presupuestos_generados: { cantidad: number; monto: number }
  presupuestos_aprobados: { cantidad: number; monto: number }
  obras_activas: number
  ingresos_proyectados_mes: number
  ingresos_reales_mes: number
  egresos_proyectados_mes: number
  egresos_reales_mes: number
  ganancia_proyectada_mes: number
  ganancia_real_mes: number
}

export interface DashboardKPIs {
  presupuestadoTotal: number
  ejecutadoTotal: number
  saldoTotal: number
  porcentajeAvancePromedio: number
  totalObras: number
  obrasPorEstado: Record<EstadoObra, number>
  montosPorEstado: Record<EstadoObra, number>
}
