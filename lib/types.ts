export type Rol = 'admin' | 'capataz' | 'operario'
export type EstadoObra = 'activo' | 'pausado' | 'terminado'
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
