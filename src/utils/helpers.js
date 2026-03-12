// /src/utils/helpers.js
import { getEffectivePhase } from './recipeUtils';

/**
 * @typedef {Object} IngredientChange
 * @property {string} field - El campo modificado (nombre, cantidad, etc)
 * @property {string} [context] - Contexto adicional (ej: nombre del ingrediente)
 * @property {any} old - Valor anterior
 * @property {any} new - Valor nuevo
 */

/**
 * @typedef {Object} RecipeModification
 * @property {string} note - Nota descriptiva del cambio
 * @property {string} author - Nombre del autor
 * @property {string} authorId - ID del autor
 * @property {number} timestamp - Unix timestamp
 * @property {string} [date] - Fecha formateada (opcional)
 * @property {Object} [changes] - Objeto estructurado de cambios
 * @property {IngredientChange[]} [changes.ingredients]
 * @property {Array<{field: string, old: any, new: any}>} [changes.parameters]
 * @property {Array<{field: string, old: any, new: any}>} [changes.waterProfile]
 */

/**
 * @typedef {Object} Ingredient
 * @property {string} name - Nombre del insumo
 * @property {number} amount - Cantidad
 * @property {string} unit - Unidad (kg, g, sobres, etc)
 * @property {string} [inventoryId] - ID vinculado al inventario
 * @property {string} [category] - Categoría (Malta, Lúpulo, Levadura, etc)
 * @property {string} [stepId] - ID del paso del proceso vinculado
 * @property {string} [stageId] - ID de la etapa (boiling, mashing, etc)
 * @property {string} [phase] - Fase (cooking, fermenting, bottling)
 */

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
 * Jerarquía oficial de Estilos agrupados por Familias Técnicas
 */
export const RECIPE_HIERARCHY = {
  'Ale': [
    'IPA', 'Pale Ale', 'Stout', 'Porter', 'Amber Ale', 'Brown Ale', 'Wheat Ale', 'Sour', 'Saison'
  ],
  'Lager': [
    'Pilsner', 'Helles', 'Dunkel', 'Schwarzbier', 'Marzen', 'Bock', 'Doppelbock'
  ],
  'Belga': [
    'Witbier', 'Dubbel', 'Tripel', 'Quadrupel', 'Belgian Strong Ale'
  ],
  'Híbrida/Especial': [
    'Cream Ale', 'Kölsch', 'Fruit Beer', 'Spice/Herb Beer', 'Wood-Aged Beer'
  ]
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
    'Pilsner': { bg: 'bg-gradient-to-br from-yellow-200 to-yellow-400', border: 'border-yellow-400', text: 'text-yellow-600 dark:text-yellow-400', ring: 'ring-yellow-400' },
    'Amber Ale': { bg: 'bg-gradient-to-br from-red-500 to-amber-700', border: 'border-amber-700', text: 'text-amber-800 dark:text-amber-400', ring: 'ring-amber-700' }
  };
  return themes[category] || { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', border: 'border-amber-500', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500' };
};

/**
 * @typedef {Object} Ingredient
 * @property {string} name - Nombre del insumo.
 * @property {number} amount - Cantidad.
 * @property {string} unit - Unidad (kg, g, l, etc).
 * @property {number} additionTime - Tiempo de adición (numérico).
 * @property {string} additionTimeUnit - Unidad de tiempo (m, h, d).
 */

/**
 * @typedef {Object} RecipeIngredients
 * @property {Ingredient[]} malts - Colección de maltas.
 * @property {Ingredient[]} hops - Colección de lúpulos.
 * @property {Ingredient[]} others - Colección de aditivos/sales.
 * @property {Ingredient[]} yeast - Colección de levaduras (Siempre Array).
 */

/**
 * @typedef {Object} ShoppingItem
 * @property {string} name - Nombre del insumo.
 * @property {string} category - Categoría (Malta, Lúpulo, etc).
 * @property {number} amount - Cantidad planificada.
 * @property {string} unit - Unidad.
 * @property {number} price - Precio estimado.
 * @property {'pending'|'confirmed'} status - Estado del ítem en la lista.
 */

/**
 * @typedef {Object} ShoppingList
 * @property {ShoppingItem[]} items - Insumos en la lista.
 * @property {number} totalEstCost - Costo estimado total.
 * @property {'draft'|'saved'|'purchased'} status - Estado de la lista.
 * @property {number} createdAt - Timestamp de creación.
 * @property {number} updatedAt - Timestamp de última modificación.
 */

/**
 * CONTRATO DE SINCRONIZACIÓN (Inventario -> Recetas)
 * ------------------------------------------------
 * Cuando un ítem del catálogo (InventoryItem) cambia su identidad (name, category):
 * - Se deben iterar las recetas del usuario.
 * - Si ingredient.inventoryId === itemId:
 *     - Actualizar ingredient.name = newItemName
 *     - Actualizar ingredient.category = newItemCategory
 * - Esta operación debe ejecutarse vía writeBatch para asegurar atomicidad.
 */

/**
 * @typedef {Object} EquipmentProfile
 * @property {string} name - Nombre del equipo (ej: "AIO 35L").
 * @property {number} evaporationRate - Tasa de evaporación (L/hr).
 * @property {number} trubLoss - Pérdida en fondo de olla/mangueras (L).
 * @property {number} mashRatio - Relación agua/grano (L/kg). [AIO: 2.7 - 3.0]
 * @property {number} grainAbsorption - Factor de absorción (L/kg). Default: 1.0.
 * @property {number} totalVolume - Capacidad máxima de la olla (L).
 * @property {boolean} [isDefault] - Indica si es el equipo predeterminado del usuario.
 */

/**
 * Glosario técnico de parámetros de equipo para ayuda contextual.
 */
export const EQUIPMENT_GLOSSARY = {
  evaporationRate: "Agua perdida por evaporación durante el hervor intenso por cada hora.",
  trubLoss: "Agua retenida en el fondo de la olla por el sedimento (trub) o mangueras que no llega al fermentador.",
  mashRatio: "Relación de litros de agua por cada kilo de grano. Afecta la densidad del macerado.",
  grainAbsorption: "Litros de agua que 'chupa' el grano y no se recuperan.",
  totalVolume: "Capacidad física total de tu olla. ¡CUIDADO!: El empaste (agua + grano) ocupa más que el agua sola. No superes este límite para evitar REBALSES."
};

/**
 * Recomendaciones de cuidado y almacenamiento para insumos.
 */
export const INGREDIENT_CARE_TIPS = {
  malts: {
    title: "Maltas y Granos",
    tip: "Almacenar en un lugar seco, fresco (ideal < 20°C) y protegido de la luz solar directa. Mantener en recipientes herméticos para evitar insectos y humedad."
  },
  hops: {
    title: "Lúpulos",
    tip: "Conservar SIEMPRE en congelador (-18°C) o freezer. El oxígeno es su mayor enemigo; asegúrate de que el empaque esté sellado al vacío o sin aire."
  },
  yeast: {
    title: "Levaduras",
    tip: "Mantener refrigeradas (4°C) en todo momento. Antes de usar, verificar siempre la fecha de caducidad. No congelar si es levadura seca."
  },
  additives: {
    title: "Sales y Aditivos",
    tip: "Guardar en sus envases originales bien cerrados en un ambiente seco. Algunos son higroscópicos (absorben humedad) y pueden apelmazarse."
  }
};

/**
 * Sanitiza una receta antes de ser guardada en Firestore o persistencia local.
 * Elimina campos legacy (time), asegura tipos numéricos y limpia valores nulos/indefinidos.
 * 
 * @param {Object} recipe - Receta original
 * @returns {Object|null} Receta limpia lista para persistencia
 */
export const sanitizeRecipeForSaving = (recipe) => {
  if (!recipe) return null;

  // Clonamos profundamente para evitar efectos secundarios
  const r = JSON.parse(JSON.stringify(recipe));

  const cleanRecipe = {
    ...r,
    skippedStages: Array.isArray(r.skippedStages) ? [...new Set(r.skippedStages)] : [],
    updatedAt: Date.now()
  };

  // Protección de Recetas Base: 
  // Si se está guardando, deja de ser "base" (se convierte en receta de usuario)
  delete cleanRecipe.isBase;

  // Limpieza profunda de ingredientes
  if (cleanRecipe.ingredients) {
    const categories = ['malts', 'hops', 'others', 'yeast'];
    const steps = Array.isArray(cleanRecipe.steps) ? cleanRecipe.steps : [];

    categories.forEach(cat => {
      const target = cleanRecipe.ingredients[cat];
      
      // Manejo de ausencia o formato incorrecto (forzar Array)
      const items = Array.isArray(target) ? target : (target ? [target] : []);
      
      const cleanedItems = items.map(item => {
        if (!item || typeof item !== 'object') return null;
        
        // Eliminar campos legacy o internos temporales
        const { time, isDynamic, ...rest } = item;
        
        let finalStepId = rest.stepId;
        
        // 1. Validar stepId existente en la estructura de pasos
        const stepExists = steps.some(s => s.id === finalStepId);
        
        // 2. Si no es válido o falta, intentar por stageId
        if (!stepExists && rest.stageId) {
          const stepByStage = steps.find(s => s.stageId === rest.stageId);
          if (stepByStage) finalStepId = stepByStage.id;
        }
        
        // 3. Como último recurso, inferir por fase y categoría técnica
        if (!steps.some(s => s.id === finalStepId)) {
          const phase = rest.phase || (typeof getEffectivePhase === 'function' ? getEffectivePhase(item) : 'cooking');
          
          let preferredStage = null;
          if (phase === 'cooking') {
            if (cat === 'malts') preferredStage = 'mashing';
            else if (cat === 'hops' || cat === 'others') {
              // Si tiene tiempo > 0 suele ser hervor, sino maceración (mash/strike salts)
              preferredStage = (Number(rest.additionTime) > 0) ? 'boiling' : 'mashing';
            }
          } else if (phase === 'fermenting') {
            preferredStage = 'fermenting';
          } else if (phase === 'bottling') {
            preferredStage = 'bottling';
          }
          
          const stepByPhase = preferredStage ? steps.find(s => s.stageId === preferredStage) : steps.find(s => s.phase === phase);
          
          if (stepByPhase) finalStepId = stepByPhase.id;
          else if (steps.length > 0) {
            // Fallback de seguridad: buscar el primer paso de la fase correspondiente
            const firstStepInPhase = steps.find(s => s.phase === phase);
            finalStepId = firstStepInPhase ? firstStepInPhase.id : steps[0].id;
          }
        }

        return {
          ...rest,
          name: String(rest.name || 'Insumo'),
          stepId: String(finalStepId || (steps[0]?.id || 'mashing')),
          inventoryId: rest.inventoryId ? String(rest.inventoryId) : null,
          category: rest.category ? String(rest.category) : (cat === 'malts' ? 'Malta' : cat === 'hops' ? 'Lúpulo' : cat === 'yeast' ? 'Levadura' : 'Otros'),
          additionTime: rest.additionTime !== undefined ? Number(rest.additionTime || 0) : 0,
          additionTimeUnit: rest.additionTimeUnit || (['fermenting', 'bottling'].includes(rest.phase) ? 'd' : 'm'),
          amount: Number(rest.amount || 0),
          unit: String(rest.unit || (cat === 'malts' ? 'kg' : cat === 'hops' ? 'g' : 'un'))
        };
      });

      cleanRecipe.ingredients[cat] = cleanedItems;
    });
  }

  // Limpieza de pasos para asegurar tipos
  if (Array.isArray(cleanRecipe.steps)) {
    cleanRecipe.steps = cleanRecipe.steps.map(step => ({
      ...step,
      duration: Number(step.duration || 0),
      id: String(step.id || step.stageId),
      phase: step.phase || 'cooking'
    }));
  }

  // Sanitización de perfiles de agua
  const sanitizeProfile = (p) => {
    if (!p || typeof p !== 'object') return null;
    return {
      Ca: Number(p.Ca || 0),
      Mg: Number(p.Mg || 0),
      SO4: Number(p.SO4 || 0),
      Cl: Number(p.Cl || 0),
      Na: Number(p.Na || 0),
      HCO3: Number(p.HCO3 || 0)
    };
  };

  cleanRecipe.waterProfile = sanitizeProfile(cleanRecipe.waterProfile) || { Ca: 100, Mg: 10, SO4: 100, Cl: 100, HCO3: 50 };
  cleanRecipe.tapWaterProfile = sanitizeProfile(cleanRecipe.tapWaterProfile) || { Ca: 20, Mg: 5, SO4: 20, Cl: 20, HCO3: 20 };

  // Limpieza y ordenamiento de Historial (modifications)
  if (Array.isArray(cleanRecipe.modifications)) {
    cleanRecipe.modifications = cleanRecipe.modifications
      .map(mod => {
        if (!mod || typeof mod !== 'object') return null;
        return {
          timestamp: Number(mod.timestamp || Date.now()),
          author: String(mod.author || 'Productor'),
          authorId: String(mod.authorId || ''),
          note: String(mod.note || '').trim().substring(0, 500),
          changes: mod.changes || {}
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.timestamp - a.timestamp); // Reciente primero
  } else {
    cleanRecipe.modifications = [];
  }

  return cleanRecipe;
};
export const initialRecipes = [
  {
    id: 'hazy-tamango-pro',
    isBase: true,
    family: 'Ale',
    style: 'IPA',
    subStyle: 'Hazy IPA',
    category: 'IPA',
    name: "Jugosa Hazy IPA (Estilo Tamango)",
    description: "Una explosión tropical con cuerpo sedoso (avena/trigo) y perfil de mango/maracuyá. Amargor bajo, aroma infinito.",
    targetVolume: 20,
    og: 1.065,
    fg: 1.015,
    abv: 6.5,
    ibu: 42,
    colorSRM: 5,
    waterProfile: { Ca: 120, Mg: 15, SO4: 75, Cl: 200, Na: 0, HCO3: 50 },
    tapWaterProfile: { Ca: 10, Mg: 2, SO4: 10, Cl: 15, Na: 0, HCO3: 50 },
    ingredients: {
      malts: [
        { name: "Malta Pilsen", amount: 4.5, unit: "kg", phase: "cooking", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: "Avena en hojuelas", amount: 1.0, unit: "kg", phase: "cooking", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: "Trigo en hojuelas", amount: 0.8, unit: "kg", phase: "cooking", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' }
      ],
      hops: [
        { name: "Magnum", amount: 10, unit: "g", additionTime: 60, additionTimeUnit: 'm', phase: "cooking", stepId: 'boiling' },
        { name: "Citra", amount: 50, unit: "g", additionTime: 20, additionTimeUnit: 'm', phase: "cooking", stepId: 'whirlpool' },
        { name: "Mosaic", amount: 50, unit: "g", additionTime: 20, additionTimeUnit: 'm', phase: "cooking", stepId: 'whirlpool' },
        { name: "Citra", amount: 60, unit: "g", additionTime: 2, additionTimeUnit: 'd', phase: "fermenting", stepId: 'fermenting' },
        { name: "Mosaic", amount: 60, unit: "g", additionTime: 7, additionTimeUnit: 'd', phase: "fermenting", stepId: 'maturing' }
      ],
      others: [
        { name: "Cloruro de Calcio (CaCl2)", amount: 8, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: "Sulfato de Calcio (CaSO4)", amount: 3, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: "Ácido Láctico (80%)", amount: 5, unit: "ml", phase: "cooking", category: "Sales Minerales", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' }
      ],
      yeast: [{ name: 'Lallemand Verdant IPA', amount: 1, unit: 'sobre', phase: 'fermenting', stepId: 'fermenting', additionTime: 0, additionTimeUnit: 'd' }],
      water: { strike: 22, sparge: 12 }
    },
    steps: [
      { id: 'milling', stageId: 'milling', phase: 'cooking', title: "Molienda", desc: "Molienda fina para máxima eficiencia.", details: "Asegura que el grano esté quebrado pero no convertido en harina.", duration: 15, timeUnit: 'm' },
      { id: 'mashing', stageId: 'mashing', phase: 'cooking', title: "Maceración (Mash)", desc: "67°C por 60 min. Objetivo: Sedosidad.", details: "1. Ajustar pH objetivo a 5.2 - 5.4.\n2. Incorporar sales (Cloruro de Calcio alto) para potenciar la sensación en boca y la estabilidad de la turbidez.\n3. Recircula suavemente para evitar la oxidación prematura de lípidos.", duration: 60, timeUnit: 'm' },
      { id: 'sparging', stageId: 'sparging', phase: 'cooking', title: "Lavado (Sparge)", desc: "12L a 75°C. Extraer azúcares.", details: "Lava lentamente con agua a 75°C. No superes los 77°C para evitar la extracción de polifenoles astringentes. Monitorea que el pH del escurrimiento no supere 5.8.", duration: 25, timeUnit: 'm' },
      { id: 'boiling', stageId: 'boiling', phase: 'cooking', title: "Cocción (Hervor)", desc: "Hervir 60 min. Adición de Magnum.", details: "Hervor vigoroso para favorecer el Hot Break. El pH impacta directamente en la isomerización de alfa-ácidos.", duration: 60, timeUnit: 'm' },
      { id: 'whirlpool', stageId: 'whirlpool', phase: 'cooking', title: "Whirlpool Aromático", desc: "Bajar a 80°C. Reposo de 20 min.", details: "Adición masiva de aceites esenciales. Mantener el recipiente cerrado para evitar mermas por evaporación.", duration: 20, timeUnit: 'm' },
      { id: 'cooling', stageId: 'cooling', phase: 'cooking', title: "Enfriado", desc: "Enfriar a 18°C para inoculación.", details: "PROTOCOL DE SANITIZACIÓN: Realizar desinfección microbiológica profunda con ácido peracético (150-200ppm) después de la limpieza orgánica de mangueras y enfriador.", duration: 20, timeUnit: 'm' },
      { id: 'fermenting', stageId: 'fermenting', phase: 'fermenting', title: "Fermentación Activa", desc: "Inóculo a 18°C y DH Biotransformación.", details: "Día 2: Agregar Citra. Asegurar desinfección estricta del puerto de Dry Hop con alcohol al 70% o peracético.", duration: 5, timeUnit: 'd' },
      { id: 'maturing', stageId: 'maturing', phase: 'fermenting', title: "Maduración / DH 2", desc: "DH de Mosaic y control de Diacetilo.", details: "Día 7: Agregar Mosaic. Subir temperatura a 21°C para asegurar reducción de diacetilo y facilitar la decantación del lúpulo.", duration: 7, timeUnit: 'd' },
      { id: 'bottling', stageId: 'bottling', phase: 'bottling', title: "Envasado", desc: "Cold Crash y Embotellado.", details: "Bajar a 2°C por 48h (Cold Crash). Envasar minimizando el contacto con el oxígeno para prevenir la degradación de aromas.", duration: 60, timeUnit: 'm' }
    ],
    skippedStages: [],
    tips: [
      { title: "Oxidación de Lípidos", desc: "Evita salpicaduras durante el macerado; la oxidación en caliente (HSA) reduce la vida útil de los aromas cítricos." },
      { title: "Gestión de pH", desc: "Un pH de maceración de 5.2-5.4 optimiza la actividad enzimática y mejora la clarificación del mosto." },
      { title: "Sanitización vs Limpieza", desc: "La limpieza elimina residuos orgánicos; la sanitización (Peracético) elimina microorganismos. Nunca sanitices sobre superficies sucias." }
    ],
    modifications: []
  },
  {
    id: 'doble-hazy-ipa-pro',
    isBase: true,
    family: 'Ale',
    style: 'IPA',
    subStyle: 'Doble Hazy IPA',
    category: 'IPA',
    name: "Nebulosa DDH - Doble Hazy",
    description: "Néctar espeso, 8.2% ABV y DDH masivo con Galaxy. Un golpe resinoso y tropical.",
    targetVolume: 20,
    og: 1.080,
    fg: 1.018,
    abv: 8.2,
    ibu: 55,
    colorSRM: 6,
    waterProfile: { Ca: 130, Mg: 15, SO4: 80, Cl: 220, Na: 0, HCO3: 50 },
    tapWaterProfile: { Ca: 10, Mg: 2, SO4: 10, Cl: 15, Na: 0, HCO3: 50 },
    ingredients: {
      malts: [
        { name: "Malta Pilsen", amount: 6.0, unit: 'kg', phase: "cooking", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: "Trigo en hojuelas", amount: 1.5, unit: 'kg', phase: "cooking", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: "Avena en hojuelas", amount: 1.0, unit: 'kg', phase: "cooking", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' }
      ],
      hops: [
        { name: "Magnum", amount: 15, unit: 'g', additionTime: 60, additionTimeUnit: 'm', phase: "cooking", stepId: 'boiling' },
        { name: "Galaxy", amount: 80, unit: 'g', additionTime: 30, additionTimeUnit: 'm', phase: "cooking", stepId: 'whirlpool' },
        { name: "Citra", amount: 40, unit: 'g', additionTime: 30, additionTimeUnit: 'm', phase: "cooking", stepId: 'whirlpool' },
        { name: "Galaxy", amount: 100, unit: 'g', additionTime: 4, additionTimeUnit: 'd', phase: "fermenting", stepId: 'fermenting' },
        { name: "Citra", amount: 50, unit: 'g', additionTime: 8, additionTimeUnit: 'd', phase: "fermenting", stepId: 'maturing' }
      ],
      others: [
        { name: 'Irish Moss', amount: 5, unit: 'g', phase: 'cooking', category: 'Aditivos', stepId: 'boiling', additionTime: 15, additionTimeUnit: 'm' },
        { name: "Cloruro de Calcio (CaCl2)", amount: 10, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: "Sulfato de Calcio (CaSO4)", amount: 4, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' }
      ],
      yeast: [{ name: 'Lallemand Verdant IPA', amount: 2, unit: 'sobres', phase: 'fermenting', stepId: 'fermenting', additionTime: 0, additionTimeUnit: 'd' }],
      water: { strike: 25, sparge: 12 }
    },
    steps: [
      { id: 'milling', stageId: 'milling', phase: 'cooking', title: "Molienda", desc: "Molienda gruesa para evitar compactación.", details: "Dada la alta carga de adjuntos (30%), una molienda ligeramente más gruesa de la malta base evita que el lecho se compacte.", duration: 20, timeUnit: 'm' },
      { id: 'mashing', stageId: 'mashing', phase: 'cooking', title: "Maceración Densa", desc: "66°C por 60 min. Carga pesada.", details: "IMPORTANTE: Ajustar pH a 5.2. El perfil de cloruro alto es vital para balancear la densidad final y el alcohol. Recircula vigorosamente para asegurar extracción sin canalizaciones.", duration: 60, timeUnit: 'm' },
      { id: 'sparging', stageId: 'sparging', phase: 'cooking', title: "Lavado", desc: "12L a 75°C.", details: "Extrae lentamente. Evita superar pH 5.8 en el escurrimiento final para no arrastrar taninos de la malta Pilsen.", duration: 30, timeUnit: 'm' },
      { id: 'boiling', stageId: 'boiling', phase: 'cooking', title: "Hervor de Densidad", desc: "60 min. Vigila el boil-over.", details: "La formación de Trub es crítica en densidades altas; un pH de 5.1-5.2 al final del hervor asegura una mejor precipitación proteica.", duration: 60, timeUnit: 'm' },
      { id: 'whirlpool', stageId: 'whirlpool', phase: 'cooking', title: "Whirlpool Doble", desc: "78°C por 30 min.", details: "Galaxy y Citra en modo saturación. No agitar después de formar el cono para evitar la reincorporación de sedimentos.", duration: 30, timeUnit: 'm' },
      { id: 'cooling', stageId: 'cooling', phase: 'cooking', title: "Enfriado", desc: "Enfriar a 18°C.", details: "SANITIZACIÓN CRÍTICA: La carga de azúcar residual es alta, cualquier contaminación se propagará rápido. Sanitización CIP del sistema previa a transferencia.", duration: 30, timeUnit: 'm' },
      { id: 'fermenting', stageId: 'fermenting', phase: 'fermenting', title: "DH 1 Activo", desc: "Día 4: 100g Galaxy en fermentación.", details: "Asegurar que la fermentación esté activa para favorecer la biotransformación de terpenos del Galaxy.", duration: 4, timeUnit: 'd' },
      { id: 'maturing', stageId: 'maturing', phase: 'fermenting', title: "DH 2 y Cold Crash", desc: "Día 8: 50g Citra y limpieza.", details: "Bajar a 1°C para eliminar el 'Hop Burn'. Mantener en frío al menos 4 días para una sedimentación completa.", duration: 7, timeUnit: 'd' },
      { id: 'bottling', stageId: 'bottling', phase: 'bottling', title: "Envasado DDH", desc: "Carbonatación media (2.4 vol).", details: "Usa transferencia cerrada con purga de CO2 si es posible para preservar el color pálido y brillante.", duration: 60, timeUnit: 'm' }
    ],
    skippedStages: [],
    tips: [
      { title: "Hop Burn", desc: "Un Cold Crash largo (4 días) es vital para que el picor del lúpulo decante." },
      { title: "Seguridad Microbiológica", desc: "Usa ácido peracético al 1% para desinfectar todo lo que toque el mosto frío." }
    ],
    modifications: []
  },
  {
    id: 'triple-hazy-ipa-pro',
    isBase: true,
    family: 'Ale',
    style: 'IPA',
    subStyle: 'Triple Hazy IPA',
    category: 'IPA',
    name: "Agujero Negro - Triple Hazy",
    description: "10.5% ABV. Una aberración técnica. Pegajosa, densa y brutalmente lupulada.",
    targetVolume: 20,
    og: 1.100,
    fg: 1.022,
    abv: 10.5,
    ibu: 65,
    colorSRM: 7,
    waterProfile: { Ca: 140, Mg: 15, SO4: 100, Cl: 250, Na: 0, HCO3: 50 },
    tapWaterProfile: { Ca: 10, Mg: 2, SO4: 10, Cl: 15, Na: 0, HCO3: 50 },
    ingredients: {
      malts: [
        { name: "Malta Pale Ale", amount: 8.0, unit: 'kg', phase: "cooking", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: "Avena en hojuelas", amount: 1.5, unit: 'kg', phase: "cooking", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: "Trigo en hojuelas", amount: 1.0, unit: 'kg', phase: "cooking", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' }
      ],
      hops: [
        { name: "Columbus", amount: 40, unit: 'g', additionTime: 90, additionTimeUnit: 'm', stage: "Hervor", phase: "cooking", stepId: 'boiling' },
        { name: "Citra", amount: 100, unit: 'g', additionTime: 30, additionTimeUnit: 'm', stage: "Whirlpool", phase: "cooking", stepId: 'whirlpool' },
        { name: "Mosaic", amount: 100, unit: 'g', additionTime: 30, additionTimeUnit: 'm', stage: "Whirlpool", phase: "cooking", stepId: 'whirlpool' },
        { name: "Galaxy", amount: 150, unit: 'g', additionTime: 5, additionTimeUnit: 'd', stage: "Dry Hop 1", phase: "fermenting", stepId: 'fermenting' },
        { name: "Citra", amount: 100, unit: 'g', additionTime: 10, additionTimeUnit: 'd', stage: "Dry Hop 2", phase: "fermenting", stepId: 'maturing' },
        { name: "Mosaic", amount: 100, unit: 'g', additionTime: 14, additionTimeUnit: 'd', stage: "Dry Hop 3", phase: "fermenting", stepId: 'maturing' }
      ],
      others: [
        { name: "Maltodextrina", amount: 0.5, unit: "kg", phase: "cooking", category: "Aditivos", stepId: 'boiling', additionTime: 15, additionTimeUnit: 'm' },
        { name: "Nutriente de Levadura", amount: 8, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 'boiling', additionTime: 15, additionTimeUnit: 'm' },
        { name: "Cloruro de Calcio (CaCl2)", amount: 15, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: "Sulfato de Calcio (CaSO4)", amount: 5, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' }
      ],
      yeast: [{ name: 'Lallemand Verdant IPA', amount: 3, unit: 'sobres', phase: 'fermenting', stepId: 'fermenting', additionTime: 0, additionTimeUnit: 'd' }],
      water: { strike: 28, sparge: 10 }
    },
    steps: [
      { id: 'milling', stageId: 'milling', phase: 'cooking', title: "Molienda Pesada", desc: "10.5kg de grano a procesar.", details: "Requiere paciencia y molino bien ajustado para evitar rotura excesiva de cáscara.", duration: 30, timeUnit: 'm' },
      { id: 'mashing', stageId: 'mashing', phase: 'cooking', title: "Maceración al Límite", desc: "65°C por 90 min. Volumen masivo.", details: "Ajuste de pH estricto (5.2) para maximizar fermentabilidad en mostos de alta densidad. El perfil de Cloruro alto contrarresta la calidez del alcohol.", duration: 90, timeUnit: 'm' },
      { id: 'sparging', stageId: 'sparging', phase: 'cooking', title: "Lavado Lento", desc: "Lavado con poco volumen para concentrar.", details: "Monitoreo continuo de pH (< 5.6) para evitar la extracción de polifenoles amargos que empañen el perfil de malta.", duration: 45, timeUnit: 'm' },
      { id: 'boiling', stageId: 'boiling', phase: 'cooking', title: "Concentración Hervor", desc: "90 min vigoroso. Nutrientes finales.", details: "Hervor largo para eliminar precursores de DMS y favorecer la reacción de Maillard controlada.", duration: 90, timeUnit: 'm' },
      { id: 'whirlpool', stageId: 'whirlpool', phase: 'cooking', title: "Whirlpool Saturado", desc: "Remolino a 75°C. 200g Lúpulo.", details: "Saturación total de aceites. Reposo prolongado para sedimentación de lúpulo en flor.", duration: 30, timeUnit: 'm' },
      { id: 'cooling', stageId: 'cooling', phase: 'cooking', title: "Enfriado", desc: "Bajar a 18°C.", details: "SANITIZACIÓN PROFUNDA: Protocolo CIP con ácido peracético obligatorio debido al alto riesgo por nutrientes residuales.", duration: 40, timeUnit: 'm' },
      { id: 'fermenting', stageId: 'fermenting', phase: 'fermenting', title: "Inoculación Triple", desc: "3 sobres. Control Térmico.", details: "La oxigenación del mosto es vital aquí. Desinfección extrema de la piedra difusora.", duration: 5, timeUnit: 'd' },
      { id: 'maturing', stageId: 'maturing', phase: 'fermenting', title: "DH 2 y 3 / Maduración", desc: "Saturación total de aromas.", details: "Día 10: Citra. Día 14: Mosaic. Mantener presión positiva de CO2.", duration: 15, timeUnit: 'd' },
      { id: 'bottling', stageId: 'bottling', phase: 'bottling', title: "Envasado y Guarda", desc: "Paciencia. Guarda de 1 mes.", details: "La Triple Hazy mejora con una guarda corta en frío para integrar sus 10.5% ABV.", duration: 60, timeUnit: 'm' }
    ],
    skippedStages: [],
    tips: [
      { title: "Temperatura", desc: "Si sube de 20°C ambient, el alcohol se volverá agresivo 'hot'." },
      { title: "Higiene de Equipos", desc: "Limpia profundamente roscas y mangueras para evitar Brettanomyces o bacterias lácticas." }
    ],
    modifications: []
  },
  {
    id: 'oatmeal-stout-pro',
    isBase: true,
    family: 'Ale',
    style: 'Stout',
    subStyle: 'Oatmeal Stout',
    category: 'Stout',
    name: "Expreso de Medianoche",
    description: "Stout de terciopelo. Textura densa y aromas a espresso sin acidez.",
    targetVolume: 20,
    og: 1.058,
    fg: 1.016,
    abv: 5.5,
    ibu: 32,
    colorSRM: 38,
    waterProfile: { Ca: 110, Mg: 15, SO4: 40, Cl: 160, Na: 0, HCO3: 150 },
    tapWaterProfile: { Ca: 10, Mg: 2, SO4: 10, Cl: 15, Na: 0, HCO3: 50 },
    ingredients: {
      malts: [
        { name: "Malta Pale Ale", amount: 4.0, unit: 'kg', phase: "cooking", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: "Avena en hojuelas", amount: 0.8, unit: 'kg', phase: "cooking", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: "Cebada Tostada", amount: 0.3, unit: 'kg', phase: "cooking", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: "Malta Chocolate", amount: 0.2, unit: 'kg', phase: "cooking", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' }
      ],
      hops: [{ name: "Fuggles", amount: 40, unit: 'g', additionTime: 60, additionTimeUnit: 'm', stage: "Hervor", phase: "cooking", stepId: 'boiling' }],
      others: [
        { name: 'Irish Moss', amount: 5, unit: 'g', phase: 'cooking', category: 'Aditivos', stepId: 'boiling', additionTime: 15, additionTimeUnit: 'm' },
        { name: "Cloruro de Calcio (CaCl2)", amount: 12, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: "Ácido Láctico (80%)", amount: 1, unit: "ml", phase: "cooking", category: "Sales Minerales", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' }
      ],
      yeast: [{ name: 'S-04', amount: 1, unit: 'sobre', phase: 'fermenting', stepId: 'fermenting', additionTime: 0, additionTimeUnit: 'd' }],
      water: { strike: 18, sparge: 14 }
    },
    steps: [
      { id: 'milling', stageId: 'milling', phase: 'cooking', title: "Molienda", desc: "Molienda estándar.", details: "Asegura un buen triturado para facilitar la extracción de los azúcares de la avena. Muele las maltas negras por separado si buscas un perfil aún más sedoso.", duration: 15, timeUnit: 'm' },
      { id: 'mashing', stageId: 'mashing', phase: 'cooking', title: "Maceración Sedosa", desc: "68°C por 50 min.", details: "pH OBJETIVO: 5.4 - 5.6. El grano tostado ya acidifica el mosto; monitorea antes de ajustar. Cloruros altos son vitales para una textura cremosa tipo espresso.", duration: 65, timeUnit: 'm' },
      { id: 'sparging', stageId: 'sparging', phase: 'cooking', title: "Lavado", desc: "14L a 75°C.", details: "Lavado pausado para evitar la extracción de taninos y astringencia de las cáscaras quemadas (acris).", duration: 25, timeUnit: 'm' },
      { id: 'boiling', stageId: 'boiling', phase: 'cooking', title: "Hervor Clásico", desc: "60 min Fuggles.", details: "Control de pH final para balancear el amargor terroso del Fuggles con la dulzura de la malta.", duration: 60, timeUnit: 'm' },
      { id: 'whirlpool', stageId: 'whirlpool', phase: 'cooking', title: "Whirlpool", desc: "Reposo técnico.", details: "Prevenir oxidación en caliente mediante un remolino suave.", duration: 10, timeUnit: 'm' },
      { id: 'cooling', stageId: 'cooling', phase: 'cooking', title: "Enfriado", desc: "Bajar a 19°C.", details: "SANITIZACIÓN: El ácido peracético es más efectivo a este rango de temperatura. Desinfectar puerto de salida.", duration: 25, timeUnit: 'm' },
      { id: 'fermenting', stageId: 'fermenting', phase: 'fermenting', title: "Fermentación Inglesa", desc: "19°C con S-04.", details: "Asegurar desinfección total de airlocks. La S-04 es muy sensible a contaminaciones cruzadas.", duration: 10, timeUnit: 'd' },
      { id: 'maturing', stageId: 'maturing', phase: 'fermenting', title: "Maduración / Cold Crash", desc: "Limpieza de sabores.", details: "4 días a 2°C para que decante la levadura y sedimentos finos.", duration: 4, timeUnit: 'd' },
      { id: 'bottling', stageId: 'bottling', phase: 'bottling', title: "Envasado Cremoso", desc: "Carbonatación baja.", details: "5g/L de dextrosa. El perfil Stout prefiere carbonatación contenida para acentuar la sedosidad.", duration: 40, timeUnit: 'm' }
    ],
    skippedStages: [],
    tips: [
      { title: "pH del Mash", desc: "Mantener el pH en el rango superior (5.4-5.6) ayuda a que los granos oscuros aporten chocolate y café sin notas ácidas o acris." },
      { title: "Sanitización", desc: "Trata el fermentador con ácido peracético justo antes de transferir por 5 min." }
    ],
    modifications: []
  },
  {
    id: 'lager-premium-pro',
    isBase: true,
    family: 'Lager',
    style: 'Pilsner',
    subStyle: 'Czech Pilsner',
    category: 'Lager',
    name: "Pilsner del Sur",
    description: "Cristalina y refrescante. Estilo checo con Saaz floral. Requiere paciencia (Lagering).",
    targetVolume: 20,
    og: 1.048,
    fg: 1.010,
    abv: 5.0,
    ibu: 28,
    colorSRM: 4,
    waterProfile: { Ca: 20, Mg: 5, SO4: 20, Cl: 20, Na: 0, HCO3: 20 },
    tapWaterProfile: { Ca: 10, Mg: 2, SO4: 10, Cl: 15, Na: 0, HCO3: 50 },
    ingredients: {
      malts: [
        { name: 'Malta Pilsen', amount: 4.5, unit: 'kg', phase: "cooking", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: 'Carapils', amount: 0.2, unit: 'kg', phase: "cooking", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' }
      ],
      hops: [
        { name: 'Magnum', amount: 15, unit: 'g', additionTime: 60, additionTimeUnit: 'm', stage: 'Hervor', phase: "cooking", stepId: 'boiling' },
        { name: 'Saaz', amount: 20, unit: 'g', additionTime: 15, additionTimeUnit: 'm', stage: 'Hervor', phase: "cooking", stepId: 'boiling' },
        { name: 'Saaz', amount: 20, unit: 'g', additionTime: 0, additionTimeUnit: 'm', stage: 'Whirlpool', phase: "cooking", stepId: 'whirlpool' }
      ],
      others: [
        { name: 'Irish Moss', amount: 5, unit: 'g', phase: 'cooking', category: 'Aditivos', stepId: 'boiling', additionTime: 15, additionTimeUnit: 'm' },
        { name: "Cloruro de Calcio (CaCl2)", amount: 3, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: "Sulfato de Calcio (CaSO4)", amount: 3, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' }
      ],
      yeast: [{ name: 'W-34/70', amount: 2, unit: 'sobres', phase: 'fermenting', stepId: 'fermenting', additionTime: 0, additionTimeUnit: 'd' }],
      water: { strike: 18, sparge: 14 }
    },
    steps: [
      { id: 'milling', stageId: 'milling', phase: 'cooking', title: "Molienda", desc: "Molienda fina.", details: "La Malta Pilsen requiere un quebrado preciso; mucha harina dificultará el lavado posterior.", duration: 15, timeUnit: 'm' },
      { id: 'mashing', stageId: 'mashing', phase: 'cooking', title: "Maceración Escalonada", desc: "52°C (15m) / 64°C (45m).", details: "Perfil de agua blanda obligatorio. pH 5.2 estricto. La maceración escalonada favorece la clarificación proteica y el cuerpo seco.", duration: 65, timeUnit: 'm' },
      { id: 'sparging', stageId: 'sparging', phase: 'cooking', title: "Lavado", desc: "14L a 75°C.", details: "Lava con agua blanda ajustada a pH 5.5. No arrastrar polifenoles.", duration: 30, timeUnit: 'm' },
      { id: 'boiling', stageId: 'boiling', phase: 'cooking', title: "Hervor 90m", desc: "Eliminación de DMS.", details: "Hervor vigoroso para evaporar precursores de DMS. El pH bajo ayuda a la clarificación térmica final.", duration: 90, timeUnit: 'm' },
      { id: 'whirlpool', stageId: 'whirlpool', phase: 'cooking', title: "Whirlpool Saaz", desc: "Floral y limpio.", details: "Adición de Saaz. Mantener temperatura bajo 80°C para retener aceites nobles.", duration: 15, timeUnit: 'm' },
      { id: 'cooling', stageId: 'cooling', phase: 'cooking', title: "Enfriado", desc: "Bajar a 10°C.", details: "SANITIZACIÓN EXTREMA: Las Lagers son sensibles al diacetilo producido por bacterias. Desinfectar enfriador con peracético.", duration: 30, timeUnit: 'm' },
      { id: 'fermenting', stageId: 'fermenting', phase: 'fermenting', title: "Fermentación Lager", desc: "10°C constantes.", details: "Monitoreo diario. La higiene del puerto de toma de muestras es fundamental.", duration: 7, timeUnit: 'd' },
      { id: 'maturing', stageId: 'maturing', phase: 'fermenting', title: "Lagering / Clarificación", desc: "Guarda en frío extremo.", details: "1°C por 3 semanas. La paciencia es el ingrediente principal aquí.", duration: 21, timeUnit: 'd' },
      { id: 'bottling', stageId: 'bottling', phase: 'bottling', title: "Envasado", desc: "Lager cristalina.", details: "Minimizar la agitación para no enturbiar el producto final.", duration: 60, timeUnit: 'm' }
    ],
    skippedStages: [],
    tips: [
      { title: "Lagering Profesional", desc: "La sanitización de los recipientes de guarda es tan crítica como la fermentación inicial." },
      { title: "Biopelículas", desc: "Usa detergentes alcalinos calientes seguidos de neutralización ácida." }
    ],
    modifications: []
  },
  {
    id: 'amber-ale-pro',
    isBase: true,
    family: 'Ale',
    style: 'Amber Ale',
    subStyle: 'American Amber Ale',
    category: 'Amber Ale',
    name: "Red Marzen Americana",
    description: "Equilibrio entre malta caramelo y pomelo citrico (Cascade). Color rubí.",
    targetVolume: 20,
    og: 1.055,
    fg: 1.012,
    abv: 5.6,
    ibu: 32,
    colorSRM: 14,
    waterProfile: { Ca: 80, Mg: 10, SO4: 150, Cl: 50, Na: 0, HCO3: 50 },
    tapWaterProfile: { Ca: 10, Mg: 2, SO4: 10, Cl: 15, Na: 0, HCO3: 50 },
    ingredients: {
      malts: [
        { name: 'Malta Pale Ale', amount: 4.0, unit: 'kg', phase: "cooking", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: 'Caramelo 60L', amount: 0.5, unit: 'kg', phase: "cooking", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: 'Melanoidina', amount: 0.3, unit: 'kg', phase: "cooking", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: 'Cebada Tostada', amount: 0.05, unit: 'kg', phase: "cooking", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' }
      ],
      hops: [
        { name: 'Cascade', amount: 20, unit: 'g', additionTime: 60, additionTimeUnit: 'm', phase: "cooking", stepId: 'boiling' },
        { name: 'Cascade', amount: 30, unit: 'g', additionTime: 15, additionTimeUnit: 'm', phase: "cooking", stepId: 'boiling' }
      ],
      others: [
        { name: 'Irish Moss', amount: 5, unit: 'g', phase: 'cooking', category: 'Aditivos', stepId: 'boiling', additionTime: 15, additionTimeUnit: 'm' },
        { name: "Sulfato de Calcio (CaSO4)", amount: 8, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' },
        { name: "Cloruro de Calcio (CaCl2)", amount: 4, unit: "g", phase: "cooking", category: "Sales Minerales", stepId: 'mashing', additionTime: 0, additionTimeUnit: 'm' }
      ],
      yeast: [{ name: 'US-05', amount: 1, unit: 'sobre', phase: 'fermenting', stepId: 'fermenting', additionTime: 0, additionTimeUnit: 'd' }],
      water: { strike: 18, sparge: 14 }
    },
    steps: [
      { id: 'milling', stageId: 'milling', phase: 'cooking', title: "Molienda", desc: "Molienda estándar.", details: "Asegura buen quebrado de maltas caramelo. Evita el exceso de cáscara triturada para un lavado limpio.", duration: 15, timeUnit: 'm' },
      { id: 'mashing', stageId: 'mashing', phase: 'cooking', title: "Maceración Maltosa", desc: "66°C por 60 min.", details: "pH 5.2 - 5.4. Optimizar Sulfatos para resaltar el perfil resinoso/cítrico del Cascade. El macerado debe ser estable y aromático.", duration: 60, timeUnit: 'm' },
      { id: 'sparging', stageId: 'sparging', phase: 'cooking', title: "Lavado", desc: "14L a 75°C.", details: "Lavado pausado para preservar el color rubí profundo y evitar arrastrar polifenoles astringentes.", duration: 25, timeUnit: 'm' },
      { id: 'boiling', stageId: 'boiling', phase: 'cooking', title: "Hervor Cascade", desc: "Perfil cítrico.", details: "Hervor vigoroso. Coagulación proteica optimizada vía control de pH (final deseado ~5.1).", duration: 60, timeUnit: 'm' },
      { id: 'whirlpool', stageId: 'whirlpool', phase: 'cooking', title: "Whirlpool", desc: "Reposo técnico.", details: "Asegura un cono de lúpulo estable y evita la captación de oxígeno en caliente.", duration: 10, timeUnit: 'm' },
      { id: 'cooling', stageId: 'cooling', phase: 'cooking', title: "Enfriado", desc: "Bajar a 19°C.", details: "SANITIZACIÓN PROFUNDA: Desinfectar todo el bloque de frío con ácido peracético (150ppm).", duration: 25, timeUnit: 'm' },
      { id: 'fermenting', stageId: 'fermenting', phase: 'fermenting', title: "Fermentación US-05", desc: "19°C Perfil neutro.", details: "Mantener temperatura estable para evitar ésteres frutales excesivos. Sanitización de válvulas previa a purgas.", duration: 14, timeUnit: 'd' },
      { id: 'maturing', stageId: 'maturing', phase: 'fermenting', title: "Clarificación en Frío", desc: "4 días frío.", details: "2°C para precipitación de levadura. Opcional para un brillo cristalino.", duration: 4, timeUnit: 'd' },
      { id: 'bottling', stageId: 'bottling', phase: 'bottling', title: "Envasado Marzen", desc: "Carbonatación media.", details: "6g/L dextrosa. Transferencia cerrada recomendada para preservar aromas frescos.", duration: 40, timeUnit: 'm' }
    ],
    tips: [
      { title: "Claridad", desc: "Un enfriamiento rápido post-hervor ayuda a la precipitación de turbios fríos." },
      { title: "Control Preventivo", desc: "El ácido peracético es más efectivo a pH bajo (< 4.5)." }
    ],
    modifications: []
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
  { id: 'inv-s3', category: 'Sales Minerales', name: 'Ácido Láctico (80%)', stock: 250, unit: 'ml', price: 20 },
  { id: 'inv-s4', category: 'Sales Minerales', name: 'Nutriente de Levadura', stock: 100, unit: 'g', price: 50 },

  // ADITIVOS
  { id: 'inv-a1', category: 'Aditivos', name: 'Irish Moss', stock: 100, unit: 'g', price: 50 }
];

export const defaultPrices = { malta: 2000, lupulo: 60, levadura: 5000 };
export const baseWater = { Ca: 10, Mg: 2, SO4: 10, Cl: 15, Na: 0, HCO3: 50 };
