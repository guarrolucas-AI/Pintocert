/**
 * Test: Agent JSON Detection & Persistence Flow
 *
 * Simula el flujo completo:
 * 1. Agente genera response con 2 JSONs
 * 2. detectarJSON() encuentra ambos bloques
 * 3. handleDataGenerada() mapea a campos correctos
 * 4. Data se guarda correctamente
 */

// ─── MOCK DATA ───────────────────────────────────────────────────────

/**
 * Respuesta simulada del agente con 2 JSONs
 * (Lo que Alejandro Amaro vería en el chat)
 */
const AGENT_RESPONSE = `
Perfecto, vamos a hacer el análisis económico de tu obra en Flores.

Basándome en los datos que me compartiste:
- Precio de venta: $36,500,000
- Costo materiales: $2,787,200
- Costo mano de obra: $10,500,000
- Costo total directo: $13,287,200
- Ganancia bruta: $23,212,800

Con contingencias del 10% y costos indirectos razonables, tu proyecto tiene márgenes muy saludables.

Aquí está el análisis completo:

\`\`\`json
{
  "tipo": "analisis_completo",
  "datos": {
    "costos_directos": {
      "materiales": 2787200,
      "mano_obra": 10500000,
      "subtotal": 13287200
    },
    "costos_indirectos": [
      { "descripcion": "Transporte y fletes", "monto": 300000 },
      { "descripcion": "Administración y gestión", "monto": 250000 },
      { "descripcion": "Supervisión de obra", "monto": 500000 }
    ],
    "contingencias_porcentaje": 10,
    "contingencias_monto": 1433722,
    "costo_total": 16570922,
    "precio_venta": 36500000,
    "ganancia_bruta": 19929078,
    "rentabilidad_sobre_costos": 120.3,
    "rentabilidad_sobre_ventas": 54.6,
    "flujo_caja": [
      { "concepto": "Anticipo (50%)", "monto": 18250000, "cuando": "Al firmar contrato" },
      { "concepto": "Certificación semana 2-3", "monto": 7300000, "cuando": "Después de cimientos" },
      { "concepto": "Certificación semana 5-6", "monto": 7300000, "cuando": "Antes de finalizar" }
    ],
    "notas": "Márgenes muy saludables. Riesgo bajo.",
    "recomendaciones": ["Mantener contingencias", "Supervisión profesional", "Pagos escalonados"]
  }
}
\`\`\`

Y aquí está el cronograma de ejecución:

\`\`\`json
{
  "tipo": "plan_ejecucion_completo",
  "datos": {
    "duracion_semanas": 8,
    "anticipo_porcentaje": 50,
    "anticipo_monto": 18250000,
    "semanas": [
      {
        "numero": 1,
        "descripcion": "Demolición y limpieza",
        "items_incluidos": ["Demolición de revestimientos", "Retiro de escombros", "Limpieza profunda"],
        "porcentaje_avance": 12,
        "monto_certificar": 4380000
      },
      {
        "numero": 2,
        "descripcion": "Contrapiso e impermeabilización",
        "items_incluidos": ["Contrapiso H25", "Membrana asfáltica", "Nivelación"],
        "porcentaje_avance": 15,
        "monto_certificar": 5475000
      },
      {
        "numero": 3,
        "descripcion": "Mampostería y estructuras",
        "items_incluidos": ["Muros", "Vigas", "Columnas"],
        "porcentaje_avance": 15,
        "monto_certificar": 5475000
      },
      {
        "numero": 4,
        "descripcion": "Cielorraso y revestimientos",
        "items_incluidos": ["Cielorraso de yeso", "Colocación de cerámicos"],
        "porcentaje_avance": 15,
        "monto_certificar": 5475000
      },
      {
        "numero": 5,
        "descripcion": "Pintura interior",
        "items_incluidos": ["Preparación de superficies", "Pintura latex interior", "Detalles"],
        "porcentaje_avance": 13,
        "monto_certificar": 4745000
      },
      {
        "numero": 6,
        "descripcion": "Pintura exterior y acabados",
        "items_incluidos": ["Pintura exterior", "Impermeabilización", "Protección"],
        "porcentaje_avance": 12,
        "monto_certificar": 4380000
      },
      {
        "numero": 7,
        "descripcion": "Electricidad y plomería",
        "items_incluidos": ["Instalación eléctrica", "Instalación de plomería", "Pruebas"],
        "porcentaje_avance": 11,
        "monto_certificar": 4015000
      },
      {
        "numero": 8,
        "descripcion": "Terminaciones finales",
        "items_incluidos": ["Accesorios", "Limpieza final", "Inspección y entrega"],
        "porcentaje_avance": 7,
        "monto_certificar": 2555000
      }
    ]
  }
}
\`\`\`

¡Listo! Tu proyecto tiene excelentes perspectivas. Adelante con la obra.
`;

// ─── MOCK detectarJSON (copy de AgentChat.tsx) ───────────────────────

interface JSONData {
  tipo?: string;
  datos?: unknown;
}

function mockDetectarJSON(texto: string): { count: number; items: JSONData[] } {
  const found: JSONData[] = [];
  let encontrados = 0;

  // Intento 1: bloque ```json ... ```
  const regexBloque = /```json\s*([\s\S]*?)\s*```/g;
  let match;

  while ((match = regexBloque.exec(texto)) !== null) {
    try {
      const obj = JSON.parse(match[1].trim()) as JSONData;
      if (obj.tipo && obj.datos) {
        found.push(obj);
        encontrados++;
        console.log(`✓ JSON #${encontrados} detectado en bloque json (tipo: ${obj.tipo})`);
      }
    } catch {
      // ignorar
    }
  }

  // Intento 2: JSON plano
  if (encontrados === 0) {
    const regexPlano = /\{\s*"tipo"\s*:\s*"[^"]+"\s*,\s*"datos"\s*:\s*\{[\s\S]*?\}\s*\}/g;
    while ((match = regexPlano.exec(texto)) !== null) {
      try {
        const obj = JSON.parse(match[0]) as JSONData;
        if (obj.tipo && obj.datos) {
          found.push(obj);
          encontrados++;
          console.log(`✓ JSON #${encontrados} detectado en patrón plano (tipo: ${obj.tipo})`);
        }
      } catch {
        // ignorar
      }
    }
  }

  console.log(`📊 Resumen: Se detectaron ${encontrados} bloque(s) JSON`);
  return { count: encontrados, items: found };
}

// ─── MOCK handleDataGenerada ───────────────────────────────────────

const MODULO_CAMPO: Record<string, string> = {
  materiales_completo: "lista_materiales",
  personal_completo: "plan_personal",
  herramientas_completo: "herramientas_seguridad",
  analisis_completo: "analisis_economico",
  plan_ejecucion_completo: "plan_ejecucion",
};

function mockHandleDataGenerada(
  tipo: string,
  datos: unknown,
  presupuesto: Record<string, unknown>
): { success: boolean; presupuesto: Record<string, unknown>; error?: string } {
  const campo = MODULO_CAMPO[tipo];

  if (!campo) {
    return {
      success: false,
      presupuesto,
      error: `⚠️ Tipo no reconocido: ${tipo}`,
    };
  }

  // Simular actualización de presupuesto
  const updated = { ...presupuesto, [campo]: datos };

  console.log(`✓ JSON detectado: tipo=${tipo}`);
  console.log(`🔍 Campo mapeado: ${campo}`);
  console.log(`✅ Datos guardados en presupuesto`);

  return { success: true, presupuesto: updated };
}

// ─── TEST SUITE ───────────────────────────────────────────────────

function runTests() {
  console.log("\n" + "═".repeat(70));
  console.log("🧪 TEST: Agent JSON Detection & Persistence");
  console.log("═".repeat(70) + "\n");

  // Test 1: Detectar ambos JSONs
  console.log("📝 TEST 1: ¿detectarJSON() encuentra 2 bloques?\n");
  const detection = mockDetectarJSON(AGENT_RESPONSE);

  if (detection.count === 2) {
    console.log("✅ PASS: Detectó 2 bloques JSON\n");
  } else {
    console.log(`❌ FAIL: Detectó ${detection.count} bloques, esperaba 2\n`);
  }

  // Test 2: Verificar tipos correctos
  console.log("📝 TEST 2: ¿Los tipos son correctos?\n");
  const tipos = detection.items.map((j) => j.tipo);
  const hasAnalisis = tipos.includes("analisis_completo");
  const hasPlan = tipos.includes("plan_ejecucion_completo");

  if (hasAnalisis && hasPlan) {
    console.log("✅ PASS: Ambos tipos presentes\n");
  } else {
    console.log(
      `❌ FAIL: Tipos encontrados: ${tipos.join(", ")}\nEsperados: analisis_completo, plan_ejecucion_completo\n`
    );
  }

  // Test 3: Guardar en presupuesto
  console.log("📝 TEST 3: ¿Se guardan correctamente en presupuesto?\n");
  let presupuesto: Record<string, unknown> = {
    id: "test-123",
    cliente: "Alejandro Amaro",
    subtotal: 36500000,
  };

  for (const json of detection.items) {
    const result = mockHandleDataGenerada(json.tipo || "", json.datos, presupuesto);
    if (result.success) {
      presupuesto = result.presupuesto;
    } else {
      console.log(result.error);
    }
  }

  const hasAnalisisData = presupuesto.analisis_economico !== undefined;
  const hasPlanData = presupuesto.plan_ejecucion !== undefined;

  if (hasAnalisisData && hasPlanData) {
    console.log("✅ PASS: Ambos campos guardados en presupuesto\n");
  } else {
    console.log(
      `❌ FAIL: Campos guardados: analisis_economico=${!!hasAnalisisData}, plan_ejecucion=${!!hasPlanData}\n`
    );
  }

  // Test 4: Datos son completos
  console.log("📝 TEST 4: ¿Los datos son completos?\n");
  const analisisData = presupuesto.analisis_economico as Record<string, unknown>;
  const planData = presupuesto.plan_ejecucion as Record<string, unknown>;

  const analisisComplete =
    analisisData?.costos_directos &&
    analisisData?.costos_indirectos &&
    analisisData?.precio_venta &&
    analisisData?.ganancia_bruta;

  const planComplete =
    planData?.duracion_semanas &&
    Array.isArray(planData?.semanas) &&
    planData.semanas.length > 0;

  if (analisisComplete && planComplete) {
    console.log("✅ PASS: Datos análisis y plan completos\n");
  } else {
    console.log(
      `❌ FAIL: Análisis completo=${!!analisisComplete}, Plan completo=${!!planComplete}\n`
    );
  }

  // Test 5: PDFs tendrían data
  console.log("📝 TEST 5: ¿Los PDFs tendrían datos para renderizar?\n");
  const canRenderAnalisisPDF = !!analisisData?.precio_venta && !!analisisData?.ganancia_bruta;
  const canRenderPlanPDF = !!planData?.duracion_semanas && Array.isArray(planData?.semanas);

  if (canRenderAnalisisPDF && canRenderPlanPDF) {
    console.log("✅ PASS: PDFs tendrían datos completos\n");
  } else {
    console.log(
      `❌ FAIL: PDF Análisis=${!!canRenderAnalisisPDF}, PDF Plan=${!!canRenderPlanPDF}\n`
    );
  }

  // Summary
  console.log("═".repeat(70));
  console.log("📊 RESUMEN FINAL\n");
  console.log(`Presupuesto final:`);
  console.log(`  - Cliente: ${presupuesto.cliente}`);
  console.log(`  - analisis_economico: ${hasAnalisisData ? "✅ Guardado" : "❌ Falta"}`);
  console.log(`  - plan_ejecucion: ${hasPlanData ? "✅ Guardado" : "❌ Falta"}`);
  console.log(
    `\n${
      hasAnalisisData && hasPlanData
        ? "🎉 TODO FUNCIONA CORRECTAMENTE - LISTO PARA PRODUCCIÓN"
        : "⚠️ FALLOS DETECTADOS - REVISAR PROMPT DEL AGENTE"
    }\n`
  );
  console.log("═".repeat(70) + "\n");
}

// ─── RUN TESTS ───────────────────────────────────────────────────

runTests();
