'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { obraSchema, type ObraFormData } from '@/lib/validations'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { Obra } from '@/lib/types'

interface ObraFormProps {
  defaultValues?: Partial<Obra>
  onSubmit: (data: ObraFormData) => Promise<void>
  submitLabel?: string
}

export function ObraForm({ defaultValues, onSubmit, submitLabel = 'Guardar' }: ObraFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ObraFormData>({
    resolver: zodResolver(obraSchema),
    defaultValues: {
      nombre: defaultValues?.nombre ?? '',
      direccion: defaultValues?.direccion ?? '',
      cliente: defaultValues?.cliente ?? '',
      presupuesto_total: defaultValues?.presupuesto_total ?? 0,
      fecha_inicio: defaultValues?.fecha_inicio ?? null,
      estado: defaultValues?.estado ?? 'activo',
      notas: defaultValues?.notas ?? null,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="nombre">Nombre de la obra *</Label>
          <Input id="nombre" placeholder="Casa Palermo" {...register('nombre')} />
          {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="direccion">Dirección *</Label>
          <Input id="direccion" placeholder="Av. Corrientes 1234, CABA" {...register('direccion')} />
          {errors.direccion && <p className="text-xs text-destructive">{errors.direccion.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cliente">Cliente (comitente) *</Label>
          <Input id="cliente" placeholder="Razón social o nombre" {...register('cliente')} />
          {errors.cliente && <p className="text-xs text-destructive">{errors.cliente.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="presupuesto_total">Presupuesto total ($ARS) *</Label>
          <Input
            id="presupuesto_total"
            type="number"
            min={0}
            step={1000}
            placeholder="4800000"
            {...register('presupuesto_total', { valueAsNumber: true })}
          />
          {errors.presupuesto_total && (
            <p className="text-xs text-destructive">{errors.presupuesto_total.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fecha_inicio">Fecha de inicio</Label>
          <Input id="fecha_inicio" type="date" {...register('fecha_inicio')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estado">Estado</Label>
          <Select id="estado" {...register('estado')}>
            <option value="activo">Activo</option>
            <option value="pausado">Pausado</option>
            <option value="terminado">Terminado</option>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notas">Notas</Label>
          <Textarea
            id="notas"
            placeholder="Observaciones generales de la obra…"
            rows={3}
            {...register('notas')}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
