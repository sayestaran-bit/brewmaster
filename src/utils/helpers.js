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
    description: "Una explosión tropical en tu boca. Esta Hazy IPA rinde tributo a las mejores cervezas de la costa oeste, con un cuerpo increíblemente sedoso (gracias a la avena y el trigo) y un perfil aromático donde el mango, la maracuyá y el durazno bailan juntos. Amargor bajo, pero sabor infinito. Perfecta para tomar frente al mar o soñar que estás en él.",
    targetVolume: 20, og: 1.065, fg: 1.015, abv: 6.5, ibu: 42, colorSRM: 5,
    waterProfile: { Ca: 120, Mg: 15, SO4: 75, Cl: 200, HCO3: 50 },
    ingredients: {
      malts: [{ name: "Malta Pilsen", amount: 4.5, unit: "kg" }, { name: "Avena en hojuelas", amount: 1.0, unit: "kg" }, { name: "Trigo en hojuelas", amount: 0.8, unit: "kg" }],
      hops: [
        { name: "Magnum", amount: 10, unit: "g", time: "60 min", stage: "Hervor", phase: "cooking" },
        { name: "Citra", amount: 50, unit: "g", time: "20 min", stage: "Whirlpool a 80°C", phase: "cooking" },
        { name: "Mosaic", amount: 50, unit: "g", time: "20 min", stage: "Whirlpool a 80°C", phase: "cooking" },
        { name: "Citra", amount: 60, unit: "g", time: "Día 2", stage: "Dry Hop 1", phase: "fermenting" },
        { name: "Mosaic", amount: 60, unit: "g", time: "Día 7", stage: "Dry Hop 2", phase: "fermenting" }
      ],
      yeast: { name: "Lallemand Verdant IPA", amount: 1, unit: "sobre" }, water: { strike: 22, sparge: 12 }
    },
    steps: [
      { id: 1, phase: 'cooking', title: "Ajuste de Agua y Calentamiento", desc: "Preparar el agua con sales y calentar a 71°C.", details: "1. Calienta 22L de agua en la Guten a 71°C para que al agregar el grano baje a 67°C.\n2. Agrega sales: Apunta a 200ppm de Cloruro para una sedosidad extrema.\n3. Verifica que el equipo esté sanitizado.", duration: 20 },
      { id: 2, phase: 'cooking', title: "Maceración (Mash-In)", desc: "Macerar a 67°C por 60 min. Buscar sedosidad extrema.", details: "1. Incorpora los granos lentamente removiendo para evitar grumos (dough balls), la avena tiende a apelmazarse.\n2. Mide el pH a los 10 min: el objetivo es 5.2 - 5.3. Ajusta con Ácido Láctico si es necesario.\n3. Mantén la recirculación suave para no compactar la cama de granos.", duration: 60 },
      { id: 3, phase: 'cooking', title: "Mash-Out", desc: "Subir a 76°C para detener actividad enzimática.", details: "1. Sube la temperatura a 76°C durante 10 minutos.\n2. Esto vuelve el mosto más fluido, mejorando la eficiencia del lavado.", duration: 10 },
      { id: 4, phase: 'cooking', title: "Lavado (Sparge)", desc: "Lavar suavemente con 12L a 75°C.", details: "1. Realiza un lavado lento sobre la cama de granos.\n2. Es CRÍTICO no superar los 76°C en el agua de lavado para evitar astringencia.\n3. Recolecta el mosto hasta llegar al volumen de pre-hervor (aprox 26-27L).", duration: 15 },
      { id: 5, phase: 'cooking', title: "Hervor y Amargor", desc: "Hervir 60 min. Adición de amargor limpio.", details: "1. Lleva el mosto a ebullición vigorosa.\n2. Vigila el 'Hot Break' (espuma inicial) para evitar derrames.\n3. Al romper hervor, agrega los 10g de Magnum.", duration: 60 },
      { id: 6, phase: 'cooking', title: "Whirlpool de Aroma", desc: "Enfriar a 80°C e incorporar lúpulos Citra/Mosaic.", details: "1. Apaga el fuego y enfría el mosto a 80°C exactos (¡Fase clave!).\n2. Agrega 50g de Citra y 50g de Mosaic.\n3. Inicia el remolino (Whirlpool) y mantén por 20 minutos. El aroma tropical se fijará aquí sin amargor extra.", duration: 20 },
      { id: 7, phase: 'fermenting', title: "Inoculación y Fase Activa", desc: "Enfriar a 18°C e inocular Verdant IPA.", details: "1. Enfría el mosto a 18°C lo antes posible.\n2. Transfiere al fermentador sanitizado oxigenando bien (chapoteo o piedra difusora).\n3. Inocula la levadura Verdant IPA.", duration: 10 },
      { id: 8, phase: 'fermenting', title: "Dry Hop 1 (Biotransformación)", desc: "Día 2-3: Agregar lúpulo en fermentación activa.", details: "1. Cuando el airlock esté muy activo (Día 2 o 3), abre con cuidado y agrega 60g de Citra.\n2. Esto permite la biotransformación de aceites.\n3. NO abras innecesariamente, minimiza la entrada de oxígeno.", duration: 5 },
      { id: 9, phase: 'fermenting', title: "Dry Hop 2 y Descanso de Diacetilo", desc: "Día 7: Segundo aporte de Mosaic.", details: "1. Agrega 60g de Mosaic.\n2. Deja subir la temperatura a 21°C por 48 horas para que la levadura limpie restos de diacetilo (sabor a mantequilla).\n3. Revisa la densidad: debería estar cerca de 1.015.", duration: 48 },
      { id: 10, phase: 'bottling', title: "Cold Crash y Envasado", desc: "Enfriar a 2°C y envasar con purga de CO2.", details: "1. Baja la temperatura a 2°C por 48 horas (Cold Crash) para clarificar.\n2. Envasa en botellas o barril.\n3. Si embotellas, usa 6g/L de azúcar. Si embarrilas, purga con CO2 el oxígeno; es el enemigo #1 de las Hazy.", duration: 60 }
    ],
    tips: [
      { title: "Miedo al Oxígeno", desc: "Las Hazy IPAs mueren en días si se exponen al oxígeno. Evita abrir la tapa del fermentador para mirar. Usa un sistema de purga de CO2." },
      { title: "El Secreto del Agua", desc: "Para que sea verdaderamente 'Jugosa' y sedosa, necesitas más Cloruros que Sulfatos. Apunta a un ratio de 2.5:1 o 3:1 de Cloruro sobre Sulfato." },
      { title: "Biotransformación", desc: "Añadir lúpulo durante la fermentación activa (Día 2-3) permite que la levadura Verdant IPA convierta el geraniol del lúpulo en citronelol, potenciando sabores cítricos." }
    ], modifications: []
  },
  {
    id: 'doble-hazy-ipa-pro', category: 'Hazy IPA', name: "Nebulosa DDH - Doble Hazy",
    description: "El hermano mayor de la Jugosa. Elevamos el alcohol al 8.2% y aplicamos un Doble Dry Hop (DDH) masivo con lúpulo Galaxy australiano. El resultado es un néctar de dioses, espeso, que nubla la copa y te golpea con un aroma resinoso y a frutas de carozo.",
    targetVolume: 20, og: 1.080, fg: 1.018, abv: 8.2, ibu: 55, colorSRM: 6,
    waterProfile: { Ca: 130, Mg: 15, SO4: 80, Cl: 220, HCO3: 50 },
    ingredients: {
      malts: [{ name: "Malta Pilsen", amount: 6.0, unit: 'kg' }, { name: "Trigo en hojuelas", amount: 1.5, unit: 'kg' }, { name: "Avena en hojuelas", amount: 1.0, unit: 'kg' }],
      hops: [
        { name: "Magnum", amount: 15, unit: 'g', time: "60 min", stage: "Hervor", phase: "cooking" },
        { name: "Galaxy", amount: 80, unit: 'g', time: "30 min", stage: "Whirlpool a 78°C", phase: "cooking" },
        { name: "Citra", amount: 40, unit: 'g', time: "30 min", stage: "Whirlpool a 78°C", phase: "cooking" }
      ],
      others: [
        { name: 'Irish Moss', amount: 5, unit: 'g', phase: 'cooking', category: 'Aditivos' }
      ],
      yeast: { name: 'Lallemand Verdant IPA', amount: 2, unit: 'sobres' }, water: { strike: 25, sparge: 12 }
    },
    steps: [
      { id: 1, phase: 'cooking', title: "Preparación y Mash-In", desc: "Carga pesada de granos (8.5kg). Calentar a 70°C.", details: "1. Calienta 25L a 70°C.\n2. La integración debe ser lentísima por la cantidad de avena/trigo.\n3. Remueve constantemente desde el fondo para evitar que se queme abajo.", duration: 30 },
      { id: 2, phase: 'cooking', title: "Maceración Densa", desc: "66°C por 60 min. Control de viscosidad.", details: "1. Mantén recirculación lenta.\n2. Si la bomba se tapa, apágala y remueve manualmente.\n3. El mosto será muy viscoso, como un almíbar.", duration: 60 },
      { id: 3, phase: 'cooking', title: "Lavado (Sparge)", desc: "Lavar con 12L a 75°C. Proceso lento.", details: "1. No te apresures. Lava lentamente para extraer el máximo de azúcar.\n2. Detén el lavado en cuanto llegues a tu volumen de olla, ignorando la eficiencia si es necesario para mantener densidad.", duration: 20 },
      { id: 4, phase: 'cooking', title: "Hervor y Amargor", desc: "Hervir 60 min con Magnum.", details: "1. Vigila boil-over (derrames). Un mosto de 1.080 es violento al hervir.\n2. Agrega Magnum al inicio.", duration: 60 },
      { id: 5, phase: 'cooking', title: "Whirlpool Galaxy/Citra", desc: "Remolino a 78°C por 30 minutos.", details: "1. Enfría a 78°C.\n2. Agrega la carga masiva de Galaxy y Citra.\n3. Mantén el remolino por 30 minutos completos para saturar de aceites.", duration: 30 },
      { id: 6, phase: 'fermenting', title: "Inoculación Crítica", desc: "Inocular 2 sobres a 18°C. Oxigenación doble.", details: "1. Enfría a 18°C.\n2. Oxigena el doble de lo normal (¡Piedra difusora recomendada!).\n3. Inocula 2 sobres de Verdant IPA hidratados.", duration: 15 },
      { id: 7, phase: 'fermenting', title: "Dry Hop Masivo", desc: "Día 4: Agregar 100g de Galaxy.", details: "1. Agrega lúpulo Galaxy.\n2. En esta fase el alcohol ya es alto, ten cuidado con la oxidación.", duration: 10 },
      { id: 8, phase: 'bottling', title: "Envasado (Carbonatación)", desc: "Envasar con 2.4 volúmenes de CO2.", details: "1. Realiza Cold Crash de 3 días.\n2. Si embotellas, usa 7g/L de azúcar.\n3. Asegúrate de que las botellas soporten la presión.", duration: 60 }
    ],
    tips: [
      { title: "Tasa de Inoculación (Pitch Rate)", desc: "Es una cerveza de alta densidad (1.080). Un solo sobre de levadura sufrirá estrés y generará alcoholes fusel (sabor a solvente o quemado). Asegúrate de usar 2 sobres bien hidratados." },
      { title: "Hop Burn", desc: "Cantidades masivas de lúpulo pueden dejar partículas en suspensión que causan 'Hop Burn' (picor en la garganta). Un buen Cold Crash de 3-4 días a 1°C es obligatorio." }
    ], modifications: []
  },
  {
    id: 'triple-hazy-ipa-pro', category: 'Hazy IPA', name: "Agujero Negro - Triple Hazy",
    description: "Una aberración técnica. Empujamos los límites de la física cervecera macerando más de 10 kilos de granos para apenas 20 litros. Con un brutal 10.5% de alcohol escondido tras capas y capas de avena, trigo y lúpulos Citra/Mosaic/Galaxy.",
    targetVolume: 20, og: 1.100, fg: 1.022, abv: 10.5, ibu: 65, colorSRM: 7,
    waterProfile: { Ca: 140, Mg: 15, SO4: 100, Cl: 250, HCO3: 50 },
    ingredients: {
      malts: [{ name: "Malta Pale Ale", amount: 8.0, unit: 'kg' }, { name: "Avena en hojuelas", amount: 1.5, unit: 'kg' }, { name: "Trigo en hojuelas", amount: 1.0, unit: 'kg' }],
      hops: [
        { name: "Columbus", amount: 20, unit: 'g', time: "60 min", stage: "Hervor", phase: "cooking" },
        { name: "Citra", amount: 100, unit: 'g', time: "30 min", stage: "Whirlpool", phase: "cooking" },
        { name: "Mosaic", amount: 100, unit: 'g', time: "30 min", stage: "Whirlpool", phase: "cooking" },
        { name: "Galaxy", amount: 150, unit: 'g', time: "Día 5", stage: "Dry Hop 1", phase: "fermenting" },
        { name: "Citra", amount: 100, unit: 'g', time: "Día 10", stage: "Dry Hop 2", phase: "fermenting" }
      ],
      others: [
        { name: "Maltodextrina", amount: 0.5, unit: "kg", phase: "cooking", category: "Aditivos" },
        { name: "Nutriente Levadura", amount: 5, unit: "g", phase: "cooking", category: "Aditivos" }
      ],
      yeast: { name: 'Lallemand Verdant IPA', amount: 3, unit: 'sobres' }, water: { strike: 28, sparge: 10 }
    },
    steps: [
      { id: 1, phase: 'cooking', title: "Maceración al Límite", desc: "65°C por 90 min. Volumen masivo.", details: "1. Tu equipo estará al borde del colapso físico con casi 11kg de grano.\n2. Al terminar de integrar, remueve bien y asegura que la temperatura sea 65°C.\n3. Macera por 90 minutos para máxima extracción.", duration: 90 },
      { id: 2, phase: 'cooking', title: "Lavado de Concentración", desc: "Lavar con solo 10L a 76°C. Buscamos densidad.", details: "1. No queremos diluir. Lava con poca agua.\n2. El mosto en la olla debe verse denso y brillante.", duration: 15 },
      { id: 3, phase: 'cooking', title: "Hervor Largo", desc: "Hervir 90 min. Concentrar azúcares.", details: "1. El hervor largo (90 min) ayuda a concentrar el mosto y estabilizarlo.\n2. Agrega Columbus al inicio.", duration: 90 },
      { id: 4, phase: 'cooking', title: "Maltodextrina", desc: "Añadir a 15 min de terminar hervor.", details: "1. Disuelve la maltodextrina en un poco de mosto caliente y agrégala.\n2. Esto dará un cuerpo ultra pegajoso.", duration: 15 },
      { id: 5, phase: 'cooking', title: "Whirlpool a 75°C", desc: "Remolino largo por 30 minutos.", details: "1. Baja temperatura y agrega carga masiva de lúpulo.\n2. Con tanta densidad, la absorción es lenta, dale tiempo.", duration: 30 },
      { id: 6, phase: 'fermenting', title: "Fermentación Controlada", desc: "Inocular 3 sobres a 18°C. Control térmico.", details: "1. Inocula 3 sobres hidratados con nutriente.\n2. Es CRÍTICO mantener 18°C los primeros 5 días. La fermentación será violenta y generará mucho calor propio.", duration: 120 },
      { id: 7, phase: 'fermenting', title: "Double Dry Hop", desc: "Días 5 y 10: Adiciones de Galaxy y Citra.", details: "1. Agrega Galaxy el día 5.\n2. Agrega Citra el día 10. Mantén cerrado el fermentador.", duration: 10 },
      { id: 8, phase: 'bottling', title: "Envasado Triple", desc: "Envasar con purga extrema de O2.", details: "1. Cold Crash largo de 4-5 días.\n2. Envasar. Esta cerveza mejora con 1 mes de guarda en frío.", duration: 60 }
    ], tips: [
      { title: "Control de Temperatura Activo", desc: "A 10.5% ABV, la levadura genera una cantidad absurda de energía térmica. Si no tienes un refrigerador controlado (Inkbird), no intentes esta receta en verano." },
      { title: "Nutrientes Obligatorios", desc: "Añadir nutrientes de levadura (Zinc, aminoácidos) en los últimos 10 min de hervor es la diferencia entre una fermentación que termina limpia y una que se estanca." }
    ], modifications: []
  },
  {
    id: 'oatmeal-stout-pro', category: 'Pastry Stout', name: "Expreso de Medianoche",
    description: "Una Stout de terciopelo. El uso intensivo de avena otorga una textura sedosa. Las maltas tostadas se añaden al final para extraer aroma a espresso y chocolate sin la aspereza ácida.",
    targetVolume: 20, og: 1.058, fg: 1.016, abv: 5.5, ibu: 32, colorSRM: 38,
    waterProfile: { Ca: 50, Mg: 10, SO4: 50, Cl: 50, HCO3: 150 },
    ingredients: {
      malts: [{ name: "Malta Pale Ale", amount: 4.0, unit: 'kg' }, { name: "Avena en hojuelas", amount: 0.8, unit: 'kg' }, { name: "Cebada Tostada", amount: 0.3, unit: 'kg' }, { name: "Malta Chocolate", amount: 0.2, unit: 'kg' }],
      others: [
        { name: 'Irish Moss', amount: 5, unit: 'g', phase: 'cooking', category: 'Aditivos' }
      ],
      hops: [{ name: "Fuggles", amount: 40, unit: 'g', time: "60 min", stage: "Hervor", phase: "cooking" }],
      yeast: { name: 'S-04', amount: 1, unit: 'sobre' }, water: { strike: 18, sparge: 14 }
    },
    steps: [
      { id: 1, phase: 'cooking', title: "Maceración Base", desc: "68°C por 50 min. Solo claras y avena.", details: "1. Integra Pale Ale y Avena.\n2. Mantén 68°C para dejar azúcares no fermentables que den cuerpo.", duration: 50 },
      { id: 2, phase: 'cooking', title: "Adición de Maltas Oscuras", desc: "Minuto 50: Añadir tostadas por encima.", details: "1. Agrega Chocolate y Cebada Tostada sobre la cama de granos.\n2. Esto extrae color y aroma sin la acidez del macerado largo.", duration: 15 },
      { id: 3, phase: 'cooking', title: "Hervor Equilibrado", desc: "Hervir 60 min. Lúpulo Fuggles.", details: "1. Añade Fuggles al inicio.\n2. No buscamos aroma a lúpulo, solo amargor de soporte.", duration: 60 },
      { id: 4, phase: 'fermenting', title: "Fermentación Inglesa", desc: "Inocular S-04 a 19°C.", details: "1. Mantén 19°C constantes.\n2. Termina a 21°C para limpiar.", duration: 120 },
      { id: 5, phase: 'bottling', title: "Envasado Cremoso", desc: "Carbonatación baja (1.9 vol).", details: "1. Envasar con 5-6g/L de azúcar o carbonatación forzada suave.\n2. La baja presión mantendrá la cremosidad de la avena.", duration: 40 }
    ], tips: [
      { title: "Cold Steeping", desc: "Alternativa: Remoja maltas oscuras en agua fría por 24hs y añade el líquido negro al final del hervor para una suavidad extrema." }
    ], modifications: []
  },
  {
    id: 'lager-premium-pro', category: 'Pilsner', name: "Pilsner del Sur",
    description: "Paciencia y precisión. Inspirada en lager checas, cristalina y refrescante con toque floral de Saaz. Requiere semanas de maduración en frío (Lagering).",
    targetVolume: 20, og: 1.048, fg: 1.010, abv: 5.0, ibu: 28, colorSRM: 4,
    waterProfile: { Ca: 50, Mg: 5, SO4: 50, Cl: 50, HCO3: 20 },
    ingredients: {
      malts: [{ name: 'Malta Pilsen', amount: 4.5, unit: 'kg' }, { name: 'Carapils', amount: 0.2, unit: 'kg' }],
      hops: [
        { name: 'Magnum', amount: 15, unit: 'g', time: '60 min', stage: 'Hervor', phase: "cooking" },
        { name: 'Saaz', amount: 30, unit: 'g', time: '15 min', stage: 'Hervor', phase: "cooking" }
      ],
      others: [
        { name: 'Irish Moss', amount: 5, unit: 'g', phase: 'cooking', category: 'Aditivos' }
      ],
      yeast: { name: 'W-34/70', amount: 2, unit: 'sobres' }, water: { strike: 18, sparge: 14 }
    },
    steps: [
      { id: 1, phase: 'cooking', title: "Escalón Proteico", desc: "52°C por 15 min. Mejora espuma.", details: "1. Inicia maceración a 52°C.\n2. Esto descompone proteínas para una espuma increíble.", duration: 15 },
      { id: 2, phase: 'cooking', title: "Sacarificación", desc: "64°C por 45 min. Mosto fermentable.", details: "1. Sube a 64°C.\n2. Buscamos una terminación seca y crujiente.", duration: 45 },
      { id: 3, phase: 'cooking', title: "Hervor 90 min", desc: "Eliminación de DMS y adiciones.", details: "1. DEBES hervir 90 min destapado para evaporar precursores de DMS.\n2. Saaz a los 15 min finales.", duration: 90 },
      { id: 4, phase: 'fermenting', title: "Fermentación Lager", desc: "Inocular a 10°C. Doble levadura.", details: "1. Enfría el mosto a 10°C.\n2. Inocula 2 sobres de W-34/70. Mantén 11°C constantes.", duration: 168 },
      { id: 5, phase: 'fermenting', title: "Descanso Diacetilo", desc: "Subir a 16°C por 3 días.", details: "1. Cuando la densidad esté cerca de la final, sube a 16°C para que la levadura limpie subproductos.", duration: 72 },
      { id: 6, phase: 'bottling', title: "Envasado y Lagering", desc: "Maduración a 1°C por 4-6 semanas.", details: "1. Baja 2°C por día hasta llegar a 1°C.\n2. Madura al menos 4 semanas antes de beber para cristalinidad pura.", duration: 60 }
    ], tips: [
      { title: "Tratamiento de Agua Ligera", desc: "Exige agua muy blanda. Usa 50% agua de ósmosis si tu agua es dura." }
    ], modifications: []
  },
  {
    id: 'amber-ale-pro', category: 'Otros', name: "Red Marzen Americana",
    description: "Equilibrio entre malta y lúpulo. Color rubí con dulzor a caramelo y remate citrico del lúpulo Cascade.",
    targetVolume: 20, og: 1.055, fg: 1.012, abv: 5.6, ibu: 32, colorSRM: 14,
    waterProfile: { Ca: 80, Mg: 10, SO4: 100, Cl: 80, HCO3: 80 },
    ingredients: {
      malts: [{ name: 'Malta Pale Ale', amount: 4.0, unit: 'kg' }, { name: 'Caramelo 60L', amount: 0.5, unit: 'kg' }, { name: 'Melanoidina', amount: 0.3, unit: 'kg' }, { name: 'Cebada Tostada', amount: 0.05, unit: 'kg' }],
      hops: [
        { name: 'Cascade', amount: 20, unit: 'g', time: '60 min', stage: 'Hervor', phase: "cooking" },
        { name: 'Cascade', amount: 30, unit: 'g', time: '15 min', stage: 'Hervor', phase: "cooking" }
      ],
      others: [
        { name: 'Irish Moss', amount: 5, unit: 'g', phase: 'cooking', category: 'Aditivos' }
      ],
      yeast: { name: 'US-05', amount: 1, unit: 'sobre' }, water: { strike: 18, sparge: 14 }
    },
    steps: [
      { id: 1, phase: 'cooking', title: "Maceración Balanceada", desc: "66°C por 60 min. Equilibrio maltas.", details: "1. Integra granos a 66°C.\n2. Buscamos soporte de malta para el lúpulo.", duration: 60 },
      { id: 2, phase: 'cooking', title: "Hervor Citrico", desc: "60 min. Adiciones de Cascade.", details: "1. Cascade al inicio para amargor.\n2. Cascade a falta de 15 min para sabor a pomelo.", duration: 60 },
      { id: 3, phase: 'fermenting', title: "Fermentación Neutra", desc: "18°C con US-05.", details: "1. Mantén fría la fermentación para no generar frutado que compita con el caramelo.", duration: 120 },
      { id: 4, phase: 'bottling', title: "Envasado Brillante", desc: "Envasar a 2.3 volúmenes con purga.", details: "1. Enfría a 2°C para clarificar.\n2. Envasa con 6-7g/L de azúcar o carbonatación forzada.\n3. Esta cerveza es mejor después de 2 semanas de acondicionamiento.", duration: 40 }
    ], tips: [
      { title: "El Truco del Color", desc: "50g de cebada tostada solo dan color rojizo sin sabor a café. No los omitas." }
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
  { id: 'inv-y5', category: 'Levadura', name: 'US-05', stock: 4, unit: 'sobre', price: 4500 }
];

export const defaultPrices = { malta: 2000, lupulo: 60, levadura: 5000 };
export const baseWater = { Ca: 10, Mg: 2, SO4: 10, Cl: 15, HCO3: 50 };
