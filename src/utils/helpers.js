// /src/utils/helpers.js

/**
 * Genera un enlace que añade el evento al Google Calendar
 */
export const generateGoogleCalendarLink = (title, daysFromStart, startDateMs, details) => {
  const d = startDateMs ? new Date(startDateMs) : new Date();
  d.setDate(d.getDate() + daysFromStart);
  const startStr = d.toISOString().replace(/-|:|\.\d\d\d/g, "");
  const endStr = startStr;
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(details)}`;
  return url;
};

/**
 * Simulador de color de la cerveza mediante el valor SRM a HEX
 */
export const getSrmColor = (srm) => {
  if (!srm) return '#F3CE72';
  const colors = [
    '#F3CE72', '#FFE699', '#FFD878', '#FFCA5A', '#FFBF42', '#FBB123', '#F8A600', '#F39C00', '#EA8F00',
    '#E58500', '#DE7C00', '#D77200', '#CF6900', '#CB6200', '#C35900', '#BB5100', '#B54C00', '#B04500',
    '#A63E00', '#A13700', '#9B3200', '#962D00', '#8E2900', '#882300', '#821E00', '#7B1A00', '#771900',
    '#701400', '#6A0E00', '#660D00', '#5E0B00', '#5A0A02', '#600903', '#520907', '#4C0505', '#470606',
    '#440607', '#3F0708', '#3B0607', '#3A070B', '#36080A'
  ];
  return colors[Math.min(Math.round(srm), colors.length - 1)];
};

/**
 * Motor de Estilos Visuales para categorías de Recetas
 */
export const getThemeForCategory = (category = '') => {
  const themes = {
    'Hazy IPA': { bg: 'bg-gradient-to-br from-amber-400 to-orange-500', border: 'border-orange-500', text: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-500' },
    'Doble Hazy': { bg: 'bg-gradient-to-br from-orange-500 to-red-600', border: 'border-red-500', text: 'text-red-600 dark:text-red-400', ring: 'ring-red-500' },
    'Triple Hazy': { bg: 'bg-gradient-to-br from-red-600 to-rose-900', border: 'border-rose-900', text: 'text-rose-700 dark:text-rose-400', ring: 'ring-rose-900' },
    'Neipa': { bg: 'bg-gradient-to-br from-yellow-400 to-amber-500', border: 'border-amber-500', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500' },
    'Pastry Stout': { bg: 'bg-gradient-to-br from-stone-800 to-neutral-900', border: 'border-neutral-900', text: 'text-neutral-900 dark:text-neutral-300', ring: 'ring-neutral-900' },
    'Sour': { bg: 'bg-gradient-to-br from-fuchsia-500 to-pink-600', border: 'border-pink-500', text: 'text-pink-600 dark:text-pink-400', ring: 'ring-pink-500' },
    'Pilsner': { bg: 'bg-gradient-to-br from-yellow-200 to-yellow-400', border: 'border-yellow-400', text: 'text-yellow-600 dark:text-yellow-400', ring: 'ring-yellow-400' }
  };
  return themes[category] || { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', border: 'border-amber-500', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500' };
};


export const initialRecipes = [
  {
    id: 'hazy-tamango-pro', category: 'Hazy IPA', name: "Jugosa Hazy IPA (Estilo Tamango)",
    description: "Una explosión tropical con cuerpo sedoso (avena/trigo) y perfil de mango/maracuyá. Amargor bajo, aroma infinito.",
    targetVolume: 20, og: 1.065, fg: 1.015, abv: 6.5, ibu: 42, colorSRM: 5,
    waterProfile: { Ca: 120, Mg: 15, SO4: 75, Cl: 200, HCO3: 50 },
    ingredients: {
      malts: [
        { name: "Malta Pilsen", amount: 4.5, unit: "kg", phase: "cooking", stepId: 2 },
        { name: "Avena en hojuelas", amount: 1.0, unit: "kg", phase: "cooking", stepId: 2 },
        { name: "Trigo en hojuelas", amount: 0.8, unit: "kg", phase: "cooking", stepId: 2 }
      ],
      hops: [
        { name: "Magnum", amount: 10, unit: "g", time: "60 min", stage: "Hervor", phase: "cooking", stepId: 4 },
        { name: "Citra", amount: 50, unit: "g", time: "20 min", stage: "Whirlpool (80°C)", phase: "cooking", stepId: 5 },
        { name: "Mosaic", amount: 50, unit: "g", time: "20 min", stage: "Whirlpool (80°C)", phase: "cooking", stepId: 5 },
        { name: "Citra", amount: 60, unit: "g", time: "Día 2", stage: "Dry Hop 1", phase: "fermenting", stepId: 7 },
        { name: "Mosaic", amount: 60, unit: "g", time: "Día 7", stage: "Dry Hop 2", phase: "fermenting", stepId: 8 }
      ],
      others: [
        { name: "Cloruro de Calcio (CaCl2)", amount: 8, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 1, time: "Start" },
        { name: "Sulfato de Calcio (CaSO4)", amount: 3, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 1, time: "Start" },
        { name: "Ácido Láctico (80%)", amount: 5, unit: "ml", phase: "cooking", category: "Sales Minerales", stepId: 2, time: "Mash" }
      ],
      water: { strike: 22, sparge: 12 }
    },
    steps: [
      { id: 1, phase: 'cooking', title: "Ajuste de Agua y Calentamiento", desc: "Calentar 22L a 71°C. Objetivo: Sedosidad.", details: "1. Calienta el agua de empaste.\n2. Agrega las Sales Minerales (CaCl2 y CaSO4) para alcanzar ratio Cloruro:Sulfato 2.5:1.\n3. Sanitiza todo el equipo de recirculación.", duration: 20 },
      { id: 2, phase: 'cooking', title: "Maceración (Mash)", desc: "67°C por 60 min. pH objetivo 5.3.", details: "1. Incorpora granos evitando grumos.\n2. Recircula suavemente para no compactar la cama.\n3. Mide pH a los 10 min y ajusta con Ácido Láctico si es necesario.", duration: 60 },
      { id: 3, phase: 'cooking', title: "Lavado (Sparge)", desc: "12L a 75°C. Extraer azúcares sin taninos.", details: "1. Realiza el Mash-out a 76°C por 10 min.\n2. Lava lentamente con agua a 75°C. No superes los 77°C para evitar astringencia.", duration: 25 },
      { id: 4, phase: 'cooking', title: "Hervor y Adición Amargor", desc: "Hervir 60 min. Adición técnica de Magnum.", details: "1. Rompe hervor y elimina la espuma inicial.\n2. Agrega Magnum a los 60 min restantes.\n3. Mantén un hervor vigoroso y constante.", duration: 60 },
      { id: 5, phase: 'cooking', title: "Whirlpool Aromático", desc: "Bajar a 80°C. Reposo de 20 min.", details: "1. Enfría el mosto rápidamente a 80°C.\n2. Agrega la carga masiva de Citra y Mosaic.\n3. Crea el remolino (Whirlpool) y deja reposar 20 min tapado para atrapar aromas.", duration: 20 },
      { id: 6, phase: 'fermenting', title: "Inoculación (Inoculation)", desc: "Enfriar a 18°C. Oxigenación extrema.", details: "1. Enfría a 18°C e inocula Verdant IPA.\n2. Oxigena intensamente el mosto para asegurar una fermentación saludable.", duration: 2 },
      { id: 7, phase: 'fermenting', title: "Dry Hop 1 (Biotransformación)", desc: "Día 2-3: Fermentación activa.", details: "1. Agrega 60g de Citra durante la fase de biotransformación (fermentación activa).\n2. El lúpulo reaccionará con la levadura para crear nuevos compuestos aromáticos.", duration: 5 },
      { id: 8, phase: 'fermenting', title: "Dry Hop 2 y D-Rest", desc: "Día 7: Mosaic y subida a 21°C.", details: "1. Agrega 60g de Mosaic.\n2. Sube la temperatura a 21°C por 48h para limpieza de diacetilo y terminación de fermentación.", duration: 7 },
      { id: 9, phase: 'bottling', title: "Cold Crash y Envasado", desc: "2°C por 48h. Evitar OXÍGENO.", details: "1. Baja a 2°C para clarificar.\n2. Empuja con CO2 al envasar. Usa 6g/L de dextrosa si carbonatas en botella.", duration: 60 }
    ],
    tips: [
      { title: "Oxidación", desc: "El oxígeno es el enemigo #1. Minimiza aperturas del fermentador." },
      { title: "Ratio Cl:SO4", desc: "Mantén Cloruros altos para esa textura 'jugosa'." }
    ], modifications: []
  },
  {
    id: 'doble-hazy-ipa-pro', category: 'Hazy IPA', name: "Nebulosa DDH - Doble Hazy",
    description: "Néctar espeso, 8.2% ABV y DDH masivo con Galaxy. Un golpe resinoso y tropical.",
    targetVolume: 20, og: 1.080, fg: 1.018, abv: 8.2, ibu: 55, colorSRM: 6,
    waterProfile: { Ca: 130, Mg: 15, SO4: 80, Cl: 220, HCO3: 50 },
    ingredients: {
      malts: [
        { name: "Malta Pilsen", amount: 6.0, unit: 'kg', phase: "cooking", stepId: 1 },
        { name: "Trigo en hojuelas", amount: 1.5, unit: 'kg', phase: "cooking", stepId: 1 },
        { name: "Avena en hojuelas", amount: 1.0, unit: 'kg', phase: "cooking", stepId: 1 }
      ],
      hops: [
        { name: "Magnum", amount: 15, unit: 'g', time: "60 min", stage: "Hervor", phase: "cooking", stepId: 2 },
        { name: "Galaxy", amount: 80, unit: 'g', time: "30 min", stage: "Whirlpool (78°C)", phase: "cooking", stepId: 3 },
        { name: "Citra", amount: 40, unit: 'g', time: "30 min", stage: "Whirlpool (78°C)", phase: "cooking", stepId: 3 },
        { name: "Galaxy", amount: 100, unit: 'g', time: "Día 4", stage: "Dry Hop 1", phase: "fermenting", stepId: 5 },
        { name: "Citra", amount: 50, unit: 'g', time: "Día 8", stage: "Dry Hop 2", phase: "fermenting", stepId: 6 }
      ],
      others: [
        { name: 'Irish Moss', amount: 5, unit: 'g', phase: 'cooking', category: 'Aditivos', stepId: 2, time: "15 min" },
        { name: "Cloruro de Calcio (CaCl2)", amount: 10, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 1, time: "Start" },
        { name: "Sulfato de Calcio (CaSO4)", amount: 4, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 1, time: "Start" }
      ],
      yeast: { name: 'Lallemand Verdant IPA', amount: 2, unit: 'sobres' },
      water: { strike: 25, sparge: 12 }
    },
    steps: [
      { id: 1, phase: 'cooking', title: "Maceración Densa", desc: "66°C por 60 min. Carga pesada.", details: "1. Integra 8.5kg de grano con cuidado.\n2. Agrega CaCl2 y CaSO4.\n3. Recircula lento para evitar compactación por la gran cantidad de proteínas.", duration: 60 },
      { id: 2, phase: 'cooking', title: "Hervor de Densidad", desc: "Hervir 60 min. Vigila el boil-over.", details: "1. Agrega Magnum al inicio (60 min).\n2. A los 15 min finales agrega Irish Moss para clarificar.\n3. Un mosto de 1.080 tiende a subir rápido al hervir. Vigila.", duration: 60 },
      { id: 3, phase: 'cooking', title: "Whirlpool Doble", desc: "78°C por 30 min. Saturación de Hop oils.", details: "1. Enfría a 78°C.\n2. Agrega la carga masiva de Galaxy y Citra y deja 30 min para máxima extracción.", duration: 30 },
      { id: 4, phase: 'fermenting', title: "Inoculación y Oxigenación", desc: "18°C. Doble Pitching.", details: "1. Enfría a 18°C e inocula 2 sobres hidratados.\n2. Oxigena el doble de lo normal (2 min con piedra).", duration: 4 },
      { id: 5, phase: 'fermenting', title: "Dry Hop 1 (Active)", desc: "Día 4: 100g Galaxy.", details: "1. Agrega los 100g de Galaxy con cuidado de no introducir oxígeno.", duration: 4 },
      { id: 6, phase: 'fermenting', title: "Dry Hop 2 y Cold Crash", desc: "Día 8 y clarificación.", details: "1. Agrega 50g Citra.\n2. Después de 48h, baja a 1°C para limpiar el 'Hop Burn' generado por tanto lúpulo.", duration: 7 },
      { id: 7, phase: 'bottling', title: "Envasado DDH", desc: "Carbonatación media (2.4 vol).", details: "1. Envasa evitando todo contacto con aire (transferencia cerrada si es posible).\n2. Consume fresca para aprovechar el perfil del Galaxy.", duration: 60 }
    ],
    tips: [{ title: "Hop Burn", desc: "Un Cold Crash largo (4 días) es vital para que el picor del lúpulo decante." }], modifications: []
  },
  {
    id: 'triple-hazy-ipa-pro', category: 'Hazy IPA', name: "Agujero Negro - Triple Hazy",
    description: "10.5% ABV. Una aberración técnica. Pegajosa, densa y brutalmente lupulada.",
    targetVolume: 20, og: 1.100, fg: 1.022, abv: 10.5, ibu: 65, colorSRM: 7,
    waterProfile: { Ca: 140, Mg: 15, SO4: 100, Cl: 250, HCO3: 50 },
    ingredients: {
      malts: [
        { name: "Malta Pale Ale", amount: 8.0, unit: 'kg', phase: "cooking", stepId: 1 },
        { name: "Avena en hojuelas", amount: 1.5, unit: 'kg', phase: "cooking", stepId: 1 },
        { name: "Trigo en hojuelas", amount: 1.0, unit: 'kg', phase: "cooking", stepId: 1 }
      ],
      hops: [
        { name: "Columbus", amount: 40, unit: 'g', time: "90 min", stage: "Hervor", phase: "cooking", stepId: 2 },
        { name: "Citra", amount: 100, unit: 'g', time: "30 min", stage: "Whirlpool", phase: "cooking", stepId: 3 },
        { name: "Mosaic", amount: 100, unit: 'g', time: "30 min", stage: "Whirlpool", phase: "cooking", stepId: 3 },
        { name: "Galaxy", amount: 150, unit: 'g', time: "Día 5", stage: "Dry Hop 1", phase: "fermenting", stepId: 5 },
        { name: "Citra", amount: 100, unit: 'g', time: "Día 10", stage: "Dry Hop 2", phase: "fermenting", stepId: 6 },
        { name: "Mosaic", amount: 100, unit: 'g', time: "Día 14", stage: "Dry Hop 3", phase: "fermenting", stepId: 7 }
      ],
      others: [
        { name: "Maltodextrina", amount: 0.5, unit: "kg", phase: "cooking", category: "Aditivos", stepId: 2, time: "15 min" },
        { name: "Nutriente de Levadura", amount: 8, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 2, time: "15 min" },
        { name: "Cloruro de Calcio (CaCl2)", amount: 15, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 1, time: "Start" },
        { name: "Sulfato de Calcio (CaSO4)", amount: 5, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 1, time: "Start" }
      ],
      yeast: { name: 'Lallemand Verdant IPA', amount: 3, unit: 'sobres' },
      water: { strike: 28, sparge: 10 }
    },
    steps: [
      { id: 1, phase: 'cooking', title: "Maceración al Límite", desc: "65°C por 90 min. Volumen masivo.", details: "1. Mezcla los 11kg de grano. Agrega sales CaCl2 y CaSO4.\n2. Maceración larga de 90 min para asegurar máxima extracción de azúcares complejos.", duration: 90 },
      { id: 2, phase: 'cooking', title: "Concentración Hervor", desc: "90 min vigoroso.", details: "1. Añade Columbus al completar el romper hervor (90 min).\n2. A los 15 min finales añade Nutriente y Maltodextrina.\n3. Mantén un hervor potente para concentrar el mosto.", duration: 90 },
      { id: 3, phase: 'cooking', title: "Whirlpool Saturado", desc: "Remolino a 75°C.", details: "1. Enfría a 75°C.\n2. Agrega 200g de Citra/Mosaic. 30 min de reposo tapado.", duration: 30 },
      { id: 4, phase: 'fermenting', title: "Inoculación Triple", desc: "Incular 3 sobres a 18°C.", details: "1. Oxigena intensamente con piedra difusora por 3 min.\n2. Control de temperatura CRÍTICO: La fermentación con 3 sobres genera mucho calor propio.", duration: 5 },
      { id: 5, phase: 'fermenting', title: "Dry Hop 1 (Galaxy)", desc: "Día 5: 150g Galaxy.", details: "1. Agrega 150g de Galaxy. Purga con CO2 al abrir el fermentador.", duration: 5 },
      { id: 6, phase: 'fermenting', title: "Dry Hop 2 (Citra)", desc: "Día 10: 100g Citra.", details: "1. Agrega 100g de Citra. Mantén presión de CO2 si es posible.", duration: 4 },
      { id: 7, phase: 'fermenting', title: "Dry Hop 3 y Retama", desc: "Día 14: 100g Mosaic.", details: "1. Agrega 100g de Mosaic.\n2. Prepárate para el envasado tras 48h de reposo.", duration: 7 },
      { id: 8, phase: 'bottling', title: "Envasado y Guarda Larga", desc: "Paciencia. Mejora con tiempo.", details: "1. Madura 1 mes en frío antes de servir para equilibrar el alto ABV y la carga de lúpulo.", duration: 60 }
    ],
    tips: [{ title: "Temperatura", desc: "Si sube de 20°C ambient, el alcohol se volverá agresivo 'hot'." }], modifications: []
  },
  {
    id: 'oatmeal-stout-pro', category: 'Pastry Stout', name: "Expreso de Medianoche",
    description: "Stout de terciopelo. Textura densa y aromas a espresso sin acidez.",
    targetVolume: 20, og: 1.058, fg: 1.016, abv: 5.5, ibu: 32, colorSRM: 38,
    ingredients: {
      malts: [
        { name: "Malta Pale Ale", amount: 4.0, unit: 'kg', phase: "cooking", stepId: 1 },
        { name: "Avena en hojuelas", amount: 0.8, unit: 'kg', phase: "cooking", stepId: 1 },
        { name: "Cebada Tostada", amount: 0.3, unit: 'kg', phase: "cooking", stepId: 2 },
        { name: "Malta Chocolate", amount: 0.2, unit: 'kg', phase: "cooking", stepId: 2 }
      ],
      hops: [{ name: "Fuggles", amount: 40, unit: 'g', time: "60 min", stage: "Hervor", phase: "cooking", stepId: 3 }],
      others: [
        { name: 'Irish Moss', amount: 5, unit: 'g', phase: 'cooking', category: 'Aditivos', stepId: 3, time: "15 min" },
        { name: "Cloruro de Calcio (CaCl2)", amount: 10, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 1, time: "Start" },
        { name: "Ácido Láctico (80%)", amount: 3, unit: "ml", phase: "cooking", category: "Sales Minerales", stepId: 1, time: "Mash" }
      ],
      yeast: { name: 'S-04', amount: 1, unit: 'sobre' },
      water: { strike: 18, sparge: 14 }
    },
    steps: [
      { id: 1, phase: 'cooking', title: "Maceración Sedosa", desc: "68°C por 50 min. Solo base.", details: "1. Mezcla Pale Ale y Avena. Agrega CaCl2 para potenciar el cuerpo maltoso.\n2. Buscamos azúcares complejos para una sensación en boca sedosa.", duration: 50 },
      { id: 2, phase: 'cooking', title: "Capping (Tostadas)", desc: "Añadir oscuras al final.", details: "1. Agrega Cebada Tostada y Malta Chocolate los últimos 10-15 min de maceración.\n2. Esto aporta color y aroma a café sin extraer la acidez astringente de las cáscaras quemadas.", duration: 15 },
      { id: 3, phase: 'cooking', title: "Hervor Clásico", desc: "60 min Fuggles.", details: "1. Agrega Fuggles al inicio (60 min).\n2. A los 15 min finales agrega Irish Moss para una clarificación perfecta.", duration: 60 },
      { id: 4, phase: 'fermenting', title: "Fermentación Inglesa", desc: "19°C con S-04.", details: "1. Inocula y mantén 19°C estables para evitar ésteres frutales excesivos.", duration: 14 },
      { id: 5, phase: 'bottling', title: "Envasado Cremoso", desc: "Carbonatación baja.", details: "1. 5g/L de dextrosa. Una carbonatación baja resalta la textura de la avena.", duration: 40 }
    ], modifications: []
  },
  {
    id: 'lager-premium-pro', category: 'Pilsner', name: "Pilsner del Sur",
    description: "Cristalina y refrescante. Estilo checo con Saaz floral. Requiere paciencia (Lagering).",
    targetVolume: 20, og: 1.048, fg: 1.010, abv: 5.0, ibu: 28, colorSRM: 4,
    ingredients: {
      malts: [
        { name: 'Malta Pilsen', amount: 4.5, unit: 'kg', phase: "cooking", stepId: 1 },
        { name: 'Carapils', amount: 0.2, unit: 'kg', phase: "cooking", stepId: 1 }
      ],
      hops: [
        { name: 'Magnum', amount: 15, unit: 'g', time: '60 min', stage: 'Hervor', phase: "cooking", stepId: 2 },
        { name: 'Saaz', amount: 20, unit: 'g', time: '15 min', stage: 'Hervor', phase: "cooking", stepId: 2 },
        { name: 'Saaz', amount: 20, unit: 'g', time: '0 min', stage: 'Whirlpool', phase: "cooking", stepId: 2 }
      ],
      others: [
        { name: 'Irish Moss', amount: 5, unit: 'g', phase: 'cooking', category: 'Aditivos', stepId: 2, time: "15 min" },
        { name: "Cloruro de Calcio (CaCl2)", amount: 3, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 1, time: "Start" },
        { name: "Sulfato de Calcio (CaSO4)", amount: 3, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 1, time: "Start" }
      ],
      yeast: { name: 'W-34/70', amount: 2, unit: 'sobres' },
      water: { strike: 18, sparge: 14 }
    },
    steps: [
      { id: 1, phase: 'cooking', title: "Maceración Escalonada", desc: "Decocción opcional o escalones: 52°C y 64°C.", details: "1. Inicia a 52°C (descanso proteico) por 15 min.\n2. Sube a 64°C por 45 min para un mosto muy atenuable.\n3. Agrega sales para un perfil de agua blanda checa.", duration: 60 },
      { id: 2, phase: 'cooking', title: "Hervor de 90 Minutos", desc: "Crucial para eliminar DMS.", details: "1. Hervor largo y vigoroso sin tapa.\n2. Agrega Magnum a los 60 min, Saaz a los 15 min y Saaz final al apagar el fuego (Whirlpool).\n3. Irish Moss incluido a los 15 min.", duration: 90 },
      { id: 3, phase: 'fermenting', title: "Fermentación Lager", desc: "10°C constantes.", details: "1. Enfría a 10°C e inocula los 2 sobres. Mantén temperatura rigurosa para limpieza de sabor.", duration: 7 },
      { id: 4, phase: 'fermenting', title: "D-Rest y Clarificación", desc: "Subida a 16°C.", details: "1. Sube a 16°C por 72h para que la levadura reabsorba el diacetilo.\n2. Luego baja lentamente la temperatura.", duration: 3 },
      { id: 5, phase: 'bottling', title: "Envasado y Lagering (Guarda)", desc: "1°C por 4 semanas.", details: "1. La verdadera Lager cristalina se logra con una guarda prolongada en frío extremo antes de servir.", duration: 60 }
    ], modifications: []
  },
  {
    id: 'amber-ale-pro', category: 'Otros', name: "Red Marzen Americana",
    description: "Equilibrio entre malta caramelo y pomelo citrico (Cascade). Color rubí.",
    targetVolume: 20, og: 1.055, fg: 1.012, abv: 5.6, ibu: 32, colorSRM: 14,
    ingredients: {
      malts: [
        { name: 'Malta Pale Ale', amount: 4.0, unit: 'kg', phase: "cooking", stepId: 1 },
        { name: 'Caramelo 60L', amount: 0.5, unit: 'kg', phase: "cooking", stepId: 1 },
        { name: 'Melanoidina', amount: 0.3, unit: 'kg', phase: "cooking", stepId: 1 },
        { name: 'Cebada Tostada', amount: 0.05, unit: 'kg', phase: "cooking", stepId: 1 }
      ],
      hops: [
        { name: 'Cascade', amount: 20, unit: 'g', time: '60 min', stage: 'Hervor', phase: "cooking", stepId: 2 },
        { name: 'Cascade', amount: 30, unit: 'g', time: '15 min', stage: 'Hervor', phase: "cooking", stepId: 2 }
      ],
      others: [
        { name: 'Irish Moss', amount: 5, unit: 'g', phase: 'cooking', category: 'Aditivos', stepId: 2, time: "15 min" },
        { name: "Sulfato de Calcio (CaSO4)", amount: 8, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 1, time: "Start" },
        { name: "Cloruro de Calcio (CaCl2)", amount: 4, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 1, time: "Start" }
      ],
      yeast: { name: 'US-05', amount: 1, unit: 'sobre' },
      water: { strike: 18, sparge: 14 }
    },
    steps: [
      { id: 1, phase: 'cooking', title: "Maceración Maltosa", desc: "66°C por 60 min.", details: "1. Agrega sales SO4 para resaltar el carácter del lúpulo.\n2. Recircula hasta que el mosto esté brillante para un color rubí limpio.", duration: 60 },
      { id: 2, phase: 'cooking', title: "Hervor Cascade", desc: "Cítrico y balanceado.", details: "1. Cascade a los 60 min y a los 15 min.\n2. Irish Moss incluido para clarificar el mosto caliente.", duration: 60 },
      { id: 3, phase: 'fermenting', title: "Fermentación US-05", desc: "19°C. Perfil limpio.", details: "1. Deja que el US-05 trabaje tranquilo a 19°C para un perfil neutro que deje brillar la malta y el lúpulo.", duration: 14 },
      { id: 4, phase: 'bottling', title: "Carbonatación y Pack", desc: "2.3 volúmenes de CO2.", details: "1. Usa 6-7g/L de dextrosa. Carbonatación estándar americana para resaltar el aroma.", duration: 40 }
    ], modifications: []
  }
];


export const initialInventory = [
  // MALTAS
  { id: 'inv-m1', category: 'Malta', name: 'Malta Pilsen', stock: 25, unit: 'kg', price: 1600 },
  { id: 'inv-m2', category: 'Malta', name: 'Malta Pale Ale', stock: 25, unit: 'kg', price: 1800 },
  { id: 'inv-m3', category: 'Malta', name: 'Avena en hojuelas', stock: 5, unit: 'kg', price: 1500 },
  { id: 'inv-m4', category: 'Malta', name: 'Trigo en hojuelas', stock: 5, unit: 'kg', price: 1500 },
  { id: 'inv-m5', category: 'Malta', name: 'Malta Chocolate', stock: 2, unit: 'kg', price: 2500 },
  { id: 'inv-m6', category: 'Malta', name: 'Cebada Tostada', stock: 2, unit: 'kg', price: 2800 },
  { id: 'inv-m7', category: 'Malta', name: 'Carapils', stock: 2, unit: 'kg', price: 2200 },
  { id: 'inv-m8', category: 'Malta', name: 'Caramelo 60L', stock: 3, unit: 'kg', price: 2200 },
  { id: 'inv-m9', category: 'Malta', name: 'Melanoidina', stock: 1, unit: 'kg', price: 3000 },
  { id: 'inv-m10', category: 'Aditivos', name: 'Maltodextrina', stock: 1, unit: 'kg', price: 4000 },

  // LÚPULOS
  { id: 'inv-h1', category: 'Lúpulo', name: 'Citra', stock: 500, unit: 'g', price: 80 },
  { id: 'inv-h2', category: 'Lúpulo', name: 'Mosaic', stock: 500, unit: 'g', price: 85 },
  { id: 'inv-h3', category: 'Lúpulo', name: 'Magnum', stock: 250, unit: 'g', price: 40 },
  { id: 'inv-h4', category: 'Lúpulo', name: 'Galaxy', stock: 250, unit: 'g', price: 90 },
  { id: 'inv-h5', category: 'Lúpulo', name: 'Fuggles', stock: 250, unit: 'g', price: 60 },
  { id: 'inv-h6', category: 'Lúpulo', name: 'Saaz', stock: 250, unit: 'g', price: 70 },
  { id: 'inv-h7', category: 'Lúpulo', name: 'Cascade', stock: 500, unit: 'g', price: 50 },
  { id: 'inv-h8', category: 'Lúpulo', name: 'Columbus', stock: 250, unit: 'g', price: 50 },

  // LEVADURAS
  { id: 'inv-y1', category: 'Levadura', name: 'Lallemand Verdant IPA', stock: 8, unit: 'sobre', price: 6500 },
  { id: 'inv-y3', category: 'Levadura', name: 'S-04', stock: 4, unit: 'sobre', price: 4500 },
  { id: 'inv-y4', category: 'Levadura', name: 'W-34/70', stock: 4, unit: 'sobre', price: 5500 },
  { id: 'inv-y5', category: 'Levadura', name: 'US-05', stock: 4, unit: 'sobre', price: 4500 },

  // SALES MINERALES
  { id: 'inv-s1', category: 'Sales Minerales', name: 'Cloruro de Calcio (CaCl2)', stock: 500, unit: 'g', price: 10 },
  { id: 'inv-s2', category: 'Sales Minerales', name: 'Sulfato de Calcio (CaSO4)', stock: 500, unit: 'g', price: 10 },
  { id: 'inv-s3', category: 'Sales Minerales', name: 'Ácido Láctico', stock: 250, unit: 'ml', price: 20 },
  { id: 'inv-s4', category: 'Sales Minerales', name: 'Nutriente de Levadura', stock: 100, unit: 'g', price: 50 }
];

export const defaultPrices = { malta: 2000, lupulo: 60, levadura: 5000 };
export const baseWater = { Ca: 10, Mg: 2, SO4: 10, Cl: 15, HCO3: 50 };
