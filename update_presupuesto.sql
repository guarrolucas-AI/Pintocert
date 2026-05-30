-- Actualizar todos los presupuestos con subtotal incorrecto
-- Esta es una corrección temporal para el presupuesto que está siendo usado
-- En producción, necesitaría identificar el presupuesto específico

-- Para encontrar el presupuesto específico por ID, ejecuta:
-- SELECT id, subtotal, total, created_at FROM presupuestos 
-- WHERE subtotal = 23140568 ORDER BY updated_at DESC LIMIT 1;

-- Luego actualiza con:
-- UPDATE presupuestos 
-- SET subtotal = 35055000, 
--     monto_iva = 7361550, 
--     total = 42416550
-- WHERE id = 'PRESUPUESTO_ID_HERE'
-- AND created_by = 'user_id';
