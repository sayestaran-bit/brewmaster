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
      hops: [{ name: "Magnum", amount: 10, unit: "g", time: "60 min", stage: "Hervor" }, { name: "Citra", amount: 50, unit: "g", time: "20 min", stage: "Whirlpool a 80°C" }, { name: "Mosaic", amount: 50, unit: "g", time: "20 min", stage: "Whirlpool a 80°C" }, { name: "Citra", amount: 60, unit: "g", time: "Día 2", stage: "Dry Hop 1" }, { name: "Mosaic", amount: 60, unit: "g", time: "Día 7", stage: "Dry Hop 2" }],
      yeast: { name: "Lallemand Verdant IPA", amount: 1, unit: "sobre" }, water: { strike: 22, sparge: 12 }
    },
    steps: [
      { id: 1, title: "Maceración y Ajuste de Agua", desc: "Macerar a 67°C por 60 min. Buscar sedosidad extrema.", details: "1. Calienta el agua en la Guten a 71°C.\n2. Agrega tus sales para llegar al perfil (énfasis en Cloruros).\n3. Incorpora los granos lentamente removiendo para evitar grumos, la avena tiende a apelmazarse.\n4. Mide el pH a los 10 min: el objetivo es 5.2 - 5.3.", duration: 60 },
      { id: 2, title: "Lavado (Sparge)", desc: "Lavar suavemente con 12L a 75°C.", details: "1. Realiza un lavado lento sobre la cama de granos.\n2. Es CRÍTICO no superar los 76°C en el agua de lavado.\n3. Vigila que el pH no suba de 5.8 al final del proceso, o extraerás taninos astringentes de las cáscaras.", duration: 15 },
      { id: 3, title: "Hervor Controlado", desc: "Hervir 60 min. Adición de amargor limpio.", details: "1. Lleva el mosto a ebullición vigorosa.\n2. Vigila el 'Hot Break' (espuma inicial) para evitar derrames.\n3. Al romper hervor, agrega los 10g de Magnum para dar la columna vertebral de amargor limpio y sin asperezas.", duration: 60 },
      { id: 4, title: "Whirlpool / Hop Stand Crítico", desc: "Enfriar a 80°C e incorporar lúpulos de aroma.", details: "1. Apaga el fuego y enfría el mosto a 80°C exactos (¡Fase clave!).\n2. Agrega las cargas masivas de Citra y Mosaic.\n3. Mantén un remolino constante y suave por 20 minutos. A esta temperatura no sumarás IBUs, pero extraerás todos los aceites esenciales tropicales.", duration: 20 },
      { id: 5, title: "Fermentación y Biotransformación", desc: "Inocular a 18°C. Dry Hop activo.", details: "1. Enfría a 18°C y traspasa al fermentador oxigenando muy bien el mosto.\n2. Inocula la levadura Verdant IPA.\n3. DÍA 2-3 (Alta actividad de burbujeo): Agrega el primer Dry Hop. Esto permite la 'biotransformación' de aceites.\n4. Deja subir la temperatura a 20°C hacia el final para el descanso de diacetilo.\n5. DÍA 7: Agrega el segundo Dry Hop." },
      { id: 6, title: "Maduración y Envasado", desc: "Cold Crash extremo y purga de O2.", details: "1. Baja la temperatura a 2°C (Cold Crash) por al menos 48hrs para precipitar lúpulo y levadura.\n2. Al envasar, purga todo equipo con CO2. El oxígeno destruirá esta cerveza en días." }
    ],
    tips: [
      { title: "Miedo al Oxígeno", desc: "Las Hazy IPAs mueren en días si se exponen al oxígeno. Evita abrir la tapa del fermentador para mirar. Usa un sistema de purga de CO2." },
      { title: "El Secreto del Agua", desc: "Para que sea verdaderamente 'Jugosa' y sedosa, necesitas más Cloruros que Sulfatos. Apunta a un ratio de 2.5:1 o 3:1 de Cloruro sobre Sulfato." },
      { title: "Biotransformación", desc: "Añadir lúpulo durante la fermentación activa (Día 2-3) permite que la levadura Verdant IPA convierta el geraniol del lúpulo en citronelol, potenciando sabores cítricos." }
    ], modifications: []
  },
  {
    id: 'doble-hazy-ipa-pro', category: 'Hazy IPA', name: "Nebulosa DDH - Doble Hazy",
    description: "El hermano mayor de la Jugosa. Elevamos el alcohol al 8.2% y aplicamos un Doble Dry Hop (DDH) obsceno con lúpulo Galaxy australiano. El resultado es un néctar de dioses, espeso, que nubla la copa y te golpea con un aroma resinoso y a frutas de carozo. Advertencia: No conducir maquinaria pesada después de probarla.",
    targetVolume: 20, og: 1.080, fg: 1.018, abv: 8.2, ibu: 55, colorSRM: 6,
    waterProfile: { Ca: 130, Mg: 15, SO4: 80, Cl: 220, HCO3: 50 },
    ingredients: {
      malts: [{ name: "Malta Pilsen", amount: 6.0, unit: 'kg' }, { name: "Trigo en hojuelas", amount: 1.5, unit: 'kg' }, { name: "Avena en hojuelas", amount: 1.0, unit: 'kg' }],
      hops: [{ name: "Magnum", amount: 15, unit: 'g', time: "60 min", stage: "Hervor" }, { name: "Galaxy", amount: 80, unit: 'g', time: "30 min", stage: "Whirlpool a 78°C" }, { name: "Citra", amount: 40, unit: 'g', time: "30 min", stage: "Whirlpool a 78°C" }, { name: "Galaxy", amount: 100, unit: 'g', time: "Día 4", stage: "Dry Hop" }],
      yeast: { name: 'Verdant', amount: 2, unit: 'sobres' }, water: { strike: 25, sparge: 12 }
    },
    steps: [
      { id: 1, title: "Maceración Densa", desc: "66°C por 60 min. Cuidado con atascos.", details: "1. Calienta 25L de agua a 70°C.\n2. Al tener una carga de granos masiva (8.5kg para 20L), la integración debe ser lentísima.\n3. Remueve constantemente desde el fondo. Tienes alto riesgo de canalización (stuck mash) por la avena y el trigo.\n4. Recircula a bajo caudal los primeros 15 minutos.", duration: 60 },
      { id: 2, title: "Lavado Controlado", desc: "Lavar con 12L a 75°C.", details: "1. No te apresures en abrir la válvula a tope.\n2. Lava lentamente para darle tiempo al agua de arrastrar la tremenda cantidad de azúcares atrapados.\n3. Detén el lavado si alcanzas tu volumen de pre-hervor deseado, no sobre-laves.", duration: 20 },
      { id: 3, title: "Hervor Denso", desc: "Hervir 60 min. Añadir Magnum.", details: "1. Alcanza ebullición y añade el Magnum.\n2. Un mosto con densidad cercana a 1.080 es un almíbar; vigila muy de cerca la olla porque los derrames (boil-overs) son violentos.\n3. Revuelve esporádicamente para evitar caramelización en el fondo.", duration: 60 },
      { id: 4, title: "Whirlpool Masivo", desc: "Bajar a 78°C e incorporar Galaxy y Citra.", details: "1. Enfría rápidamente a 78°C.\n2. El Galaxy aporta notas intensas a maracuyá y durazno, pero a altas temperaturas puede dar amargor vegetal.\n3. Mantenlo a 78°C durante 30 minutos enteros con remolino para saturar el mosto.", duration: 30 },
      { id: 5, title: "Fermentación Doble", desc: "Inocular a 18°C con DOS sobres.", details: "1. Enfría a 18°C e inyecta EL DOBLE de oxígeno que en una cerveza normal.\n2. Inocula obligatoriamente 2 sobres de levadura hidratada; un solo sobre sufrirá estrés osmótico.\n3. Agrega el Dry Hop masivo de Galaxy al día 4 de fermentación activa." }
    ],
    tips: [
      { title: "Tasa de Inoculación (Pitch Rate)", desc: "Es una cerveza de alta densidad (1.080). Un solo sobre de levadura sufrirá estrés y generará alcoholes fusel (sabor a solvente o quemado). Asegúrate de usar 2 sobres bien hidratados." },
      { title: "Hop Burn", desc: "Cantidades masivas de lúpulo pueden dejar partículas en suspensión que causan 'Hop Burn' (picor en la garganta). Un buen Cold Crash de 3-4 días a 1°C es obligatorio." }
    ], modifications: []
  },
  {
    id: 'triple-hazy-ipa-pro', category: 'Hazy IPA', name: "Agujero Negro - Triple Hazy",
    description: "Una aberración técnica. Empujamos los límites de la física cervecera macerando más de 10 kilos de granos para apenas 20 litros. Con un brutal 10.5% de alcohol escondido tras capas y capas de avena, trigo, maltodextrina y lúpulos Citra/Mosaic/Galaxy. Es un batido espeso, dulce y peligrosamente bebible. Tómala a sorbos pequeños.",
    targetVolume: 20, og: 1.100, fg: 1.022, abv: 10.5, ibu: 65, colorSRM: 7,
    waterProfile: { Ca: 140, Mg: 15, SO4: 100, Cl: 250, HCO3: 50 },
    ingredients: {
      malts: [{ name: "Malta Pale Ale", amount: 8.0, unit: 'kg' }, { name: "Avena en hojuelas", amount: 1.5, unit: 'kg' }, { name: "Trigo en hojuelas", amount: 1.0, unit: 'kg' }, { name: "Maltodextrina", amount: 0.5, unit: 'kg' }],
      hops: [{ name: "Columbus", amount: 20, unit: 'g', time: "60 min", stage: "Hervor" }, { name: "Citra", amount: 100, unit: 'g', time: "30 min", stage: "Whirlpool" }, { name: "Mosaic", amount: 100, unit: 'g', time: "30 min", stage: "Whirlpool" }, { name: "Galaxy", amount: 150, unit: 'g', time: "Día 5", stage: "Dry Hop 1" }, { name: "Citra", amount: 100, unit: 'g', time: "Día 10", stage: "Dry Hop 2" }],
      yeast: { name: 'Verdant', amount: 3, unit: 'sobres' }, water: { strike: 28, sparge: 10 }
    },
    steps: [
      { id: 1, title: "Maceración al Límite", desc: "65°C por 90 min para alta fermentabilidad.", details: "1. Tu equipo estará al borde del colapso físico con casi 11kg de grano.\n2. Utiliza 28L de agua a 69°C para llegar a 65°C estables.\n3. Macera por 90 minutos para asegurar que las enzimas rompan todos los azúcares complejos. Queremos que la levadura pueda comerlo todo.\n4. Añade cáscara de arroz si tienes, para evitar que se tape la bomba.", duration: 90 },
      { id: 2, title: "Lavado Corto", desc: "Lavar con solo 10L a 76°C", details: "1. Al buscar una densidad extrema de 1.100, NO podemos diluir el mosto.\n2. Lava solo con 10 litros o menos, sacrificando eficiencia por densidad.\n3. Mide la gravedad constantemente; el mosto debe caer a la olla grueso y oscuro.", duration: 15 },
      { id: 3, title: "Hervor Largo y Azúcares", desc: "Hervir 90 min. Añadir Maltodextrina.", details: "1. Hierve por 90 minutos para concentrar el volumen y caramelizar ligeramente.\n2. Agrega el Columbus a los 60 min restantes.\n3. Al minuto 75 (15 min para terminar), añade la Maltodextrina disuelta previamente en mosto caliente. Esto le dará un cuerpo ultra pegajoso y sedoso.", duration: 90 },
      { id: 4, title: "Whirlpool Extremo", desc: "Remolino a 75°C por 30 minutos.", details: "1. Enfría el mosto a 75°C.\n2. Añade 200g totales de Citra y Mosaic.\n3. Haz remolino. El mosto es tan denso que la absorción de aceites será más lenta, dale los 30 minutos completos.", duration: 30 },
      { id: 5, title: "Fermentación Térmica", desc: "Inocular 3 sobres y domar la bestia a 18°C.", details: "1. Necesitas 3 sobres de levadura hidratados con nutriente.\n2. Oxigena por 2 minutos completos con piedra difusora.\n3. CRÍTICO: La levadura generará calor violento. Controla la cámara a 18°C estrictos los primeros 5 días. Si sube a 22°C, sabrá a alcohol puro e intomable.\n4. Doble Dry Hop masivo en los días 5 y 10." }
    ], tips: [
      { title: "Control de Temperatura Activo", desc: "A 10.5% ABV, la levadura genera una cantidad absurda de energía térmica. Si no tienes un refrigerador controlado (Inkbird), no intentes esta receta en verano." },
      { title: "Nutrientes Obligatorios", desc: "Añadir nutrientes de levadura (Zinc, aminoácidos) en los últimos 10 min de hervor es la diferencia entre una fermentación que termina limpia y una que se estanca en 1.040, dejando una cerveza dulce y empalagosa." }
    ], modifications: []
  },
  {
    id: 'oatmeal-stout-pro', category: 'Stout', name: "Expreso de Medianoche",
    description: "Una Stout inglesa de manual, pero mejorada. El uso intensivo de avena le otorga una textura en boca tan suave como el terciopelo. Las maltas tostadas no se maceran desde el inicio, sino que se añaden al final para extraer todo ese aroma a espresso recién hecho y chocolate negro intenso sin nada de la aspereza ácida. Ideal para los días fríos.",
    targetVolume: 20, og: 1.058, fg: 1.016, abv: 5.5, ibu: 32, colorSRM: 38,
    waterProfile: { Ca: 50, Mg: 10, SO4: 50, Cl: 50, HCO3: 150 },
    ingredients: {
      malts: [{ name: "Malta Pale Ale", amount: 4.0, unit: 'kg' }, { name: "Avena en hojuelas", amount: 0.8, unit: 'kg' }, { name: "Cebada Tostada", amount: 0.3, unit: 'kg' }, { name: "Malta Chocolate", amount: 0.2, unit: 'kg' }],
      hops: [{ name: "Fuggles", amount: 40, unit: 'g', time: "60 min", stage: "Hervor" }],
      yeast: { name: 'S-04', amount: 1, unit: 'sobre' }, water: { strike: 18, sparge: 14 }
    },
    steps: [
      { id: 1, title: "Maceración Base", desc: "68°C por 50 min. Solo maltas claras y avena.", details: "1. Integra SOLO la Malta Pale y la Avena en el agua a 68°C.\n2. TRUCO PRO: Macera a esta temperatura alta para dejar azúcares no fermentables que darán cuerpo.\n3. NO agregues la malta Chocolate ni la Cebada Tostada todavía. Su acidez destruiría el pH óptimo de conversión de las maltas base.", duration: 50 },
      { id: 2, title: "Adición de Maltas Oscuras", desc: "Minuto 50: Añadir oscuras por encima.", details: "1. Al minuto 50, espolvorea la malta Chocolate y la Cebada Tostada por encima de la cama de granos.\n2. Remueve solo la capa superior (1-2 cm), sin llegar al fondo.\n3. Déjalo reposar 10-15 minutos más. Esto extrae el color profundo y el rico aroma a café y chocolate, pero deja la astringencia tánica atrás.", duration: 15 },
      { id: 3, title: "Hervor Clásico Inglés", desc: "Hervir 60 minutos con lúpulo Fuggles.", details: "1. Lavado normal y llevar a ebullición.\n2. Añade los 40g de Fuggles al minuto 0.\n3. En una buena Stout, el lúpulo no debe dar sabor ni aroma, solo amargor de soporte para equilibrar el dulzor de la malta.", duration: 60 },
      { id: 4, title: "Fermentación Inglesa", desc: "Fermentar a 19°C con levadura S-04.", details: "1. Enfría a 19°C y añade un sobre de S-04.\n2. Esta temperatura fomenta que la cepa inglesa genere ligeros ésteres afrutados (como a mora o ciruela) que combinan perfecto con el chocolate de las maltas oscuras.\n3. Termina la fermentación a 21°C." }
    ], tips: [
      { title: "Cold Steeping (Infusión en Frío)", desc: "Como alternativa pro al paso 2: Deja remojando la malta Chocolate y Tostada en agua fría por 24hs en el refrigerador. Filtra el líquido negro y añádelo en los últimos 5 minutos del hervor. Obtendrás un sabor a café ultra suave." },
      { title: "Carbonatación Baja", desc: "Apunta a una carbonatación baja de estilo británico (1.8 a 2.0 volúmenes de CO2). Ponerle mucho gas destruirá la sensación cremosa en boca que tanto trabajo te costó conseguir con la avena." }
    ], modifications: []
  },
  {
    id: 'lager-premium-pro', category: 'Lager', name: "Pilsner del Sur",
    description: "Una obra maestra de paciencia y precisión. Inspirada en las clásicas lagers checas, esta cerveza es cristalina, súper refrescante y tiene ese toque floral inconfundible del lúpulo noble Saaz. Maceración escalonada y semanas de maduración en frío (Lagering) la convierten en el premio final después de cortar el pasto.",
    targetVolume: 20, og: 1.048, fg: 1.010, abv: 5.0, ibu: 28, colorSRM: 4,
    waterProfile: { Ca: 50, Mg: 5, SO4: 50, Cl: 50, HCO3: 20 },
    ingredients: {
      malts: [{ name: 'Malta Pilsen', amount: 4.5, unit: 'kg' }, { name: 'Carapils', amount: 0.2, unit: 'kg' }],
      hops: [{ name: 'Magnum', amount: 15, unit: 'g', time: '60 min', stage: 'Hervor' }, { name: 'Saaz', amount: 30, unit: 'g', time: '15 min', stage: 'Hervor' }],
      yeast: { name: 'W-34/70', amount: 2, unit: 'sobres' }, water: { strike: 18, sparge: 14 }
    },
    steps: [
      { id: 1, title: "Maceración Escalonada", desc: "Escalón proteico y de sacarificación.", details: "1. Empieza la maceración a 52°C por 15 minutos. Esto descompone proteínas medias mejorando drásticamente la retención de espuma.\n2. Sube la temperatura a 64°C por 45 minutos. Esta temperatura baja crea un mosto muy fermentable, esencial para una Lager seca y crujiente.\n3. Sube a 75°C por 10 min para hacer el Mash Out.", duration: 70 },
      { id: 2, title: "Hervor Largo (Destapado)", desc: "Hervir 90 min para evaporar DMS.", details: "1. La malta Pilsen contiene precursores de DMS (que da un defecto de sabor a maíz cocido o verdura hervida).\n2. DEBES hervir por 90 minutos vigorosamente y sin tapa para que este compuesto se evapore.\n3. Agrega el Magnum al min 60 (quedando 30 min de los 90) y el mítico lúpulo Saaz al minuto 15.", duration: 90 },
      { id: 3, title: "Inoculación en Frío", desc: "Bajar a 10°C y doble levadura.", details: "1. NO incules a 20°C para luego enfriar, eso generará sabores frutales que arruinan la Lager.\n2. Enfría el mosto hasta 10°C u 11°C.\n3. Oxigena al máximo e inocula DOS sobres de W-34/70. Las levaduras a baja temperatura son lentas y necesitan un ejército grande." },
      { id: 4, title: "Descanso de Diacetilo y Lagering", desc: "Subir a 16°C y luego madurar a 1°C.", details: "1. Fermenta a 12°C. Cuando queden unos 4 o 5 puntos para llegar a la densidad final (ej: en 1.015), sube el refrigerador a 16°C por 3 días. La levadura reabsorberá la molécula de la mantequilla (Diacetilo).\n2. Lagering: Baja la temperatura 2°C por día hasta llegar a 1°C y déjala madurar ahí por 4 a 6 semanas. La paciencia hace al maestro." }
    ],
    tips: [
      { title: "Tratamiento de Agua Ligera", desc: "Una Pilsner exige agua muy blanda. Si el agua de tu llave es dura (mucho sarro), dilúyela con un 50% a 70% de agua desmineralizada o de ósmosis inversa. Demasiado sulfato o bicarbonato hará que el amargor raspe la lengua." },
      { title: "El Factor Claridad", desc: "Añade musgo irlandés (Irish Moss) o Whirlfloc 15 minutos antes de terminar el hervor. Junto con el 'Lagering' de 4 semanas, la cerveza saldrá brillante como cristal sin necesidad de filtrar mecánicamente." }
    ], modifications: []
  },
  {
    id: 'amber-ale-pro', category: 'Amber Ale', name: "Red Marzen Americana",
    description: "Una oda al equilibrio perfecto entre malta y lúpulo. Esta cerveza brilla con un color rubí hipnótico. En boca, arranca con un dulzor a caramelo tostado y corteza de pan (gracias a la malta Melanoidina), y remata con un toque resinoso y a pomelo clásico del lúpulo americano Cascade. Una todoterreno infalible para cualquier ocasión.",
    targetVolume: 20, og: 1.055, fg: 1.012, abv: 5.6, ibu: 32, colorSRM: 14,
    waterProfile: { Ca: 80, Mg: 10, SO4: 100, Cl: 80, HCO3: 80 },
    ingredients: {
      malts: [{ name: 'Malta Pale Ale', amount: 4.0, unit: 'kg' }, { name: 'Caramelo 60L', amount: 0.5, unit: 'kg' }, { name: 'Melanoidina', amount: 0.3, unit: 'kg' }, { name: 'Cebada Tostada', amount: 0.05, unit: 'kg' }],
      hops: [{ name: 'Cascade', amount: 20, unit: 'g', time: '60 min', stage: 'Hervor' }, { name: 'Cascade', amount: 30, unit: 'g', time: '15 min', stage: 'Hervor' }],
      yeast: { name: 'US-05', amount: 1, unit: 'sobre' }, water: { strike: 18, sparge: 14 }
    },
    steps: [
      { id: 1, title: "Maceración Balanceada", desc: "66°C por 60 min", details: "1. Calienta 18L de agua a 71°C.\n2. Integra los granos para asentar a 66°C exactos.\n3. Esta temperatura media es crucial: no queremos un mosto seco ni tampoco un almíbar; buscamos un soporte de malta perfecto para contrarrestar el lúpulo Cascade.\n4. Mide pH y mantén en 5.3.", duration: 60 },
      { id: 2, title: "Hervor y Sabor Americano", desc: "60 min. Adiciones de Cascade.", details: "1. Lleva a ebullición viva.\n2. Añade 20g de Cascade al inicio. Esto aportará un amargor cítrico muy limpio.\n3. A los 45 minutos (faltando 15 min), agrega los otros 30g de Cascade. Esta carga tardía fijará el clásico sabor a pino y pomelo típico de las cervezas craft americanas.", duration: 60 },
      { id: 3, title: "Fermentación Limpia", desc: "18°C con levadura Ale Neutra (US-05).", details: "1. Enfría el mosto a 18°C.\n2. Inocula la US-05. Es importante mantener la temperatura controlada; no queremos ésteres afrutados de la levadura que confundan el paladar, queremos dejar brillar el caramelo de la malta y el pino del lúpulo." }
    ],
    tips: [
      { title: "El Truco del Color", desc: "Quizás te preguntes qué hacen 50 gramos minúsculos de Cebada Tostada en esta receta. No aportarán sabor a café, su único propósito es corregir el espectro visual para lograr ese característico tono Rojo Rubí intenso, en lugar de un café aguado." },
      { title: "Malta Melanoidina", desc: "La adición de Melanoidina imita el complejo sabor a corteza de pan tostado que normalmente se logra mediante decocción (un método alemán muy complejo). Es un atajo de Maestro Cervecero." }
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
  { id: 'inv-m10', category: 'Malta', name: 'Maltodextrina', stock: 1, unit: 'kg', price: 4000 },

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
  { id: 'inv-y1', category: 'Levadura', name: 'Lallemand Verdant IPA', stock: 4, unit: 'sobre', price: 6500 },
  { id: 'inv-y2', category: 'Levadura', name: 'Verdant', stock: 4, unit: 'sobre', price: 6500 },
  { id: 'inv-y3', category: 'Levadura', name: 'S-04', stock: 4, unit: 'sobre', price: 4500 },
  { id: 'inv-y4', category: 'Levadura', name: 'W-34/70', stock: 4, unit: 'sobre', price: 5500 },
  { id: 'inv-y5', category: 'Levadura', name: 'US-05', stock: 4, unit: 'sobre', price: 4500 }
];

export const defaultPrices = { malta: 2000, lupulo: 60, levadura: 5000 };
export const baseWater = { Ca: 10, Mg: 2, SO4: 10, Cl: 15, HCO3: 50 };
