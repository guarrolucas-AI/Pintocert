-- Update price cache for painting materials - May 2026
-- Materiales de pintura actualizados a Mayo 2026 (mercado argentino)

-- Pintura Latex Exterior Impermeabilizante
INSERT INTO precios_cache (
  material_nombre,
  precio_unitario,
  precio_minimo,
  precio_maximo,
  proveedor,
  fecha_busqueda,
  valido_hasta
) VALUES (
  'Pintura latex exterior impermeabilizante (por litro)',
  7200,
  6900,
  7200,
  'Duralba/Alba',
  NOW(),
  NOW() + INTERVAL '30 days'
) ON CONFLICT (material_nombre) DO UPDATE SET
  precio_unitario = 7200,
  precio_minimo = 6900,
  precio_maximo = 7200,
  proveedor = 'Duralba/Alba',
  fecha_busqueda = NOW(),
  valido_hasta = NOW() + INTERVAL '30 days';

-- Esmalte Sintético
INSERT INTO precios_cache (
  material_nombre,
  precio_unitario,
  precio_minimo,
  precio_maximo,
  proveedor,
  fecha_busqueda,
  valido_hasta
) VALUES (
  'Esmalte sintético (por litro)',
  10700,
  9400,
  12000,
  'Alba',
  NOW(),
  NOW() + INTERVAL '30 days'
) ON CONFLICT (material_nombre) DO UPDATE SET
  precio_unitario = 10700,
  precio_minimo = 9400,
  precio_maximo = 12000,
  proveedor = 'Alba',
  fecha_busqueda = NOW(),
  valido_hasta = NOW() + INTERVAL '30 days';

-- Sellador Fijador
INSERT INTO precios_cache (
  material_nombre,
  precio_unitario,
  precio_minimo,
  precio_maximo,
  proveedor,
  fecha_busqueda,
  valido_hasta
) VALUES (
  'Sellador fijador (por litro)',
  8700,
  4780,
  10875,
  'Genérico',
  NOW(),
  NOW() + INTERVAL '30 days'
) ON CONFLICT (material_nombre) DO UPDATE SET
  precio_unitario = 8700,
  precio_minimo = 4780,
  precio_maximo = 10875,
  proveedor = 'Genérico',
  fecha_busqueda = NOW(),
  valido_hasta = NOW() + INTERVAL '30 days';

-- Thinner
INSERT INTO precios_cache (
  material_nombre,
  precio_unitario,
  precio_minimo,
  precio_maximo,
  proveedor,
  fecha_busqueda,
  valido_hasta
) VALUES (
  'Thinner (por litro)',
  6500,
  5200,
  7900,
  'Genérico',
  NOW(),
  NOW() + INTERVAL '30 days'
) ON CONFLICT (material_nombre) DO UPDATE SET
  precio_unitario = 6500,
  precio_minimo = 5200,
  precio_maximo = 7900,
  proveedor = 'Genérico',
  fecha_busqueda = NOW(),
  valido_hasta = NOW() + INTERVAL '30 days';
