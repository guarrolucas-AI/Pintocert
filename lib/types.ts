export type Rol = 'admin' | 'capataz' | 'operario'
export type EstadoObra = 'activo' | 'pausado' | 'terminado' | 'archivado'
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
  created_by: string
  created_at: string
}

// ─── Presupuestos ───────────────────────────────────────────────────────────

export type EstadoPresupuesto = 'borrador' | 'pendiente' | 'aprobado' | 'rechazado'
export type ModuloAgente = 'presupuesto' | 'materiales' | 'personal' | 'herramientas' | 'analisis'

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
