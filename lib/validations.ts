import { z } from 'zod'

export const obraSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  direccion: z.string().min(1, 'La dirección es requerida'),
  cliente: z.string().min(1, 'El cliente es requerido'),
  presupuesto_total: z.number().min(0, 'El presupuesto debe ser positivo'),
  fecha_inicio: z.string().optional().nullable(),
  estado: z.enum(['borrador', 'enviado_aprobacion', 'aprobado', 'en_ejecucion', 'terminado', 'pausado', 'rechazado']),
  notas: z.string().optional().nullable(),
})

export type ObraFormData = z.infer<typeof obraSchema>

export const itemSchema = z.object({
  descripcion: z.string().min(1, 'La descripción es requerida'),
  presupuesto: z.number().min(0, 'El presupuesto debe ser positivo'),
  orden: z.number().int().min(0),
})

export type ItemFormData = z.infer<typeof itemSchema>

export const certificadoSchema = z.object({
  fecha_medicion: z.string().min(1, 'La fecha de medición es requerida'),
  periodo_mes: z.number().int().min(1).max(12),
  periodo_anio: z.number().int().min(2020).max(2099),
  notas: z.string().optional().nullable(),
})

export type CertificadoFormData = z.infer<typeof certificadoSchema>
