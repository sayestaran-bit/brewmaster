/**
 * Detecta la fase de producción de un ingrediente o paso basado en sus propiedades o palabras clave.
 * Útil para retrocompatibilidad con recetas antiguas que no tienen el campo 'phase'.
 * 
 * @param {object} item - El ingrediente o paso a analizar.
 * @param {string} [defaultPhase='cooking'] - La fase por defecto si no se detecta ninguna.
 * @returns {string} - 'cooking', 'fermenting' o 'bottling'.
 */
export const getEffectivePhase = (item, defaultPhase = 'cooking') => {
    if (!item) return defaultPhase;
    if (item.phase === 'cooking' || item.phase === 'fermenting' || item.phase === 'bottling') {
        return item.phase;
    }

    const stageOrTime = (item.stage || item.time || item.title || '').toLowerCase();

    // Palabras clave para fermentación
    if (
        stageOrTime.includes('día') ||
        stageOrTime.includes('day') ||
        stageOrTime.includes('ferment') ||
        stageOrTime.includes('madura') ||
        stageOrTime.includes('dry hop') ||
        stageOrTime.includes('dh') ||
        stageOrTime.includes('inocula') ||
        stageOrTime.includes('pitch')
    ) {
        return 'fermenting';
    }

    // Palabras clave para envasado
    if (
        stageOrTime.includes('envasado') ||
        stageOrTime.includes('botell') ||
        stageOrTime.includes('barril') ||
        stageOrTime.includes('bottle') ||
        stageOrTime.includes('keg') ||
        stageOrTime.includes('cold crash') ||
        stageOrTime.includes('priming')
    ) {
        return 'bottling';
    }

    return defaultPhase;
};

/**
 * Genera una clave única para un ingrediente dentro de una receta.
 * Incluye la fase, categoría, nombre y etapa para evitar colisiones.
 */
export const getIngredientKey = (ing) => {
    const category = ing.category || 'Otros';
    const name = (ing.name || '').toLowerCase().trim();
    // Normalize: some ingredients might have .time instead of .stage
    const stage = String(ing.stage || ing.time || '').toLowerCase().trim();
    const phase = getEffectivePhase(ing);
    const stepId = ing.stepId || '';

    // Final key string that matches the sanitization logic in Firestore/Inventory
    // Including stepId ensures that the same ingredient used in different steps has a unique tracking key
    const rawKey = `${phase}_${category}_${name}_${stage}_${stepId}`;
    return rawKey.replace(/[~*/\[\].#$]/g, '_');
};

/**
 * Compacta una lista de notas o un string largo de historial para evitar el crecimiento excesivo
 * del documento de Firestore. Une los elementos con saltos de línea y trunca si excede el límite.
 * 
 * @param {string|string[]} notes - Las notas actuales o previas.
 * @param {string|string[]} [newNotes] - Nuevas notas a añadir (opcional).
 * @param {number} [maxChars=1024] - Límite máximo de caracteres.
 * @returns {string} - El string compactado y/o truncado.
 */
export const compactHistoryNotes = (notes, newNotes = null, maxChars = 1024) => {
    if (!notes && !newNotes) return "";
    
    let combined = [];
    const process = (n) => {
        if (!n) return;
        if (Array.isArray(n)) combined.push(...n);
        else combined.push(n);
    };

    process(notes);
    process(newNotes);

    let baseText = combined.filter(Boolean).join("\n").trim();
    
    if (baseText.length <= maxChars) return baseText;
    
    const truncated = baseText.substring(0, maxChars - 3);
    const lastNewline = truncated.lastIndexOf("\n");
    
    if (lastNewline > maxChars * 0.75) {
        return truncated.substring(0, lastNewline) + "...";
    }
    return truncated + "...";
};

/**
 * Constante que define las 9 etapas estandarizadas del proceso de elaboración profesional.
 */
export const BREWING_STAGES = [
    { id: 'milling', label: 'Molienda', phase: 'cooking' },
    { id: 'mashing', label: 'Maceración', phase: 'cooking' },
    { id: 'sparging', label: 'Lavado', phase: 'cooking' },
    { id: 'boiling', label: 'Cocción', phase: 'cooking' },
    { id: 'whirlpool', label: 'Whirlpool', phase: 'cooking' },
    { id: 'cooling', label: 'Enfriado', phase: 'cooking' },
    { id: 'fermenting', label: 'Fermentación', phase: 'fermenting' },
    { id: 'maturing', label: 'Maduración', phase: 'fermenting' },
    { id: 'bottling', label: 'Envasado', phase: 'bottling' }
];

export const TIME_UNITS = [
    { id: 'm', label: 'Minutos' },
    { id: 'h', label: 'Horas' },
    { id: 'd', label: 'Días' }
];

/**
 * Determina si una etapa funciona como cuenta regresiva (ej. Hervor).
 * @param {string} stageId - El ID de la etapa (boiling, whirlpool).
 */
export const isCountdownStage = (stageId) => {
    return ['boiling', 'whirlpool'].includes(stageId);
};

/**
 * Devuelve el tiempo de adición seguro (normalizado).
 * REGLA: Si el campo está vacío, se asume que entra al inicio del paso.
 * - Inicio en etapas de cuenta regresiva (Boiling): valor máximo (duración).
 * - Inicio en etapas normales (Mashing): 0.
 * 
 * @param {object} ingredient - El ingrediente con su campo additionTime opcional.
 * @param {object} step - El paso de la receta al que pertenece.
 * @returns {number} - El tiempo de adición real.
 */
export const getSafeAdditionTime = (ingredient, step) => {
    const rawTime = ingredient?.additionTime ?? ingredient?.time;
    
    // Si el tiempo está definido y es un número válido, lo usamos
    if (rawTime !== undefined && rawTime !== '' && rawTime !== null) {
        const num = Number(rawTime);
        if (!isNaN(num)) return num;
    }

    // Si no hay tiempo definido (o es inválido), devolvemos el inicio lógico
    if (!step) return 0;
    
    if (isCountdownStage(step.stageId)) {
        const duration = Number(step.duration);
        return !isNaN(duration) ? duration : 0;
    }
    
    return 0; // En etapas normales (incremental), el inicio es temporalmente 0
};

/**
 * @typedef {Object} ChangeItem
 * @property {string} field - El nombre del campo afectado (ej. 'amount', 'additionTime').
 * @property {any} old - El valor anterior al cambio.
 * @property {any} new - El nuevo valor aplicado.
 * @property {string} [context] - Contexto adicional (ej. nombre del ingrediente o paso).
 */

/**
 * @typedef {Object} RecipeMutation
 * @property {number} timestamp - Fecha del cambio en milisegundos.
 * @property {string} authorId - UID del usuario que realizó el cambio.
 * @property {string} note - Nota descriptiva del motivo del ajuste.
 * @property {Object} changes - Cambios segregados por categoría.
 * @property {ChangeItem[]} [changes.ingredients] - Ajustes en maltas, lúpulos, etc.
 * @property {ChangeItem[]} [changes.parameters] - Ajustes en ABV, IBU, Color, Vol.
 * @property {ChangeItem[]} [changes.waterProfile] - Ajustes en iones (Ca, Mg, etc.).
 */

/**
 * Convierte unidades de tiempo (m, h, d) a segundos.
 * @param {string} unit - 'm', 'h', 'd'
 * @returns {number} - multiplicador en segundos
 */
export const getTimeMultiplier = (unit) => {
    switch (unit) {
        case 'm': return 60;
        case 'h': return 3600;
        case 'd': return 86400;
        default: return 60;
    }
};
/**
 * Aportes iónicos por gramo de sal en 1 litro de agua (ppm o mg/L).
 * Valores de precisión química para optimización WLS.
 */
export const MINERAL_SALTS = {
  'Sulfato de Calcio (CaSO4)': { Ca: 232.8, SO4: 557.7, Cl: 0, Mg: 0, Na: 0, HCO3: 0 },
  'Cloruro de Calcio (CaCl2)': { Ca: 272.6, Cl: 482.3, SO4: 0, Mg: 0, Na: 0, HCO3: 0 },
  'Sulfato de Magnesio (MgSO4)': { Mg: 98.6, SO4: 389.7, Ca: 0, Cl: 0, Na: 0, HCO3: 0 },
  'Cloruro de Sodio (NaCl)': { Na: 393.4, Cl: 606.6, Ca: 0, Mg: 0, SO4: 0, HCO3: 0 },
  'Bicarbonato de Sodio (NaHCO3)': { Na: 273.7, HCO3: 726.3, Ca: 0, Mg: 0, SO4: 0, Cl: 0 },
  'Cloruro de Magnesio (MgCl2)': { Mg: 119.5, Cl: 348.8, Ca: 0, Na: 0, SO4: 0, HCO3: 0 }
};

/**
 * Configuración de pesos iónicos y estilos para el motor de optimización.
 */
export const WATER_STYLE_CONFIG = {
  'Hazy IPA': {
    idealRatio: 0.5,
    labels: { malty: "Sedosa / Jugosa", bitter: "Amargor Seco" },
    ignoredWarnings: ['Ca'],
    weights: { Cl: 4.0, Ca: 4.0, SO4: 3.0, Mg: 1.5, Na: 1.5, HCO3: 1.0 }
  },
  'Double & Triple Hazy IPA': {
    idealRatio: 0.5,
    labels: { malty: "Cuerpo Robusto", bitter: "Focalizado" },
    ignoredWarnings: ['Ca'],
    weights: { Cl: 4.0, Ca: 4.0, SO4: 3.0, Mg: 1.5, Na: 1.5, HCO3: 1.0 }
  },
  'Lager (Clásica/Pilsner)': {
    idealRatio: 1.0,
    labels: { malty: "Limpia / Maltosa", bitter: "Crocante / Refrescante" },
    ignoredWarnings: [],
    weights: { Cl: 3.0, Ca: 3.0, SO4: 3.0, Mg: 1.5, Na: 1.5, HCO3: 1.0 }
  },
  'Stout': {
    idealRatio: 0.7,
    labels: { malty: "Aterciopelada", bitter: "Torrefacta" },
    ignoredWarnings: [],
    weights: { Cl: 4.0, Ca: 4.0, HCO3: 4.0, SO4: 3.0, Mg: 1.5, Na: 0.5 }
  },
  'Balanced': {
    idealRatio: 1.0,
    labels: { malty: "Equilibrada (Malta)", bitter: "Equilibrada (Lúpulo)" },
    ignoredWarnings: [],
    weights: { Cl: 3.0, Ca: 3.0, SO4: 3.0, Mg: 1.5, Na: 1.5, HCO3: 1.0 }
  }
};

/**
 * Calcula las adiciones de sales mediante el método de Mínimos Cuadrados Ponderados (WLS).
 * Optimiza la mezcla para minimizar la desviación iónica priorizando sabores críticos.
 * 
 * @param {Object} target - Perfil objetivo (ppm)
 * @param {Object} tap - Perfil del agua de base (ppm)
 * @param {number} volume - Volumen total de agua (L)
 * @param {string} category - Estilo de la cerveza para pesos dinámicos
 * @returns {Object} { salts: Array, residualError: Object, finalProfile: Object }
 */
export const calculateRequiredSalts = (target, tap, volume, category = 'Balanced') => {
    if (!target || !tap || !volume || isNaN(volume) || volume <= 0) return null;

    const ions = ['Ca', 'Mg', 'SO4', 'Cl', 'Na', 'HCO3'];
    
    // Pesos dinámicos desde la configuración de estilo
    const styleConfig = WATER_STYLE_CONFIG[category] || WATER_STYLE_CONFIG['Balanced'];
    const weights = styleConfig.weights;
    
    // T[ion] = Objetivo en mg totales (Perfil deseado * Volumen Total)
    const T = {}; 
    ions.forEach(ion => {
        T[ion] = (Math.max(0, Number(target[ion]) || 0)) * volume;
    });

    const saltNames = Object.keys(MINERAL_SALTS);
    const x = {}; // Gramos de cada sal
    saltNames.forEach(s => x[s] = 0);

    // Coordinate Descent Analítico (Resolución de Alta Precisión)
    // Minimizamos Z = sum( W_i * (Current_i - Target_i)^2 )
    // Derivada wrt x_s: sum( 2 * W_i * (Current_i - Target_i) * C_{i,s} ) = 0
    const maxIterations = 100; // Convergencia rápida garantizada
    
    for (let iter = 0; iter < maxIterations; iter++) {
        let changed = false;
        
        saltNames.forEach(s => {
            let numerator = 0;
            let denominator = 0;
            
            ions.forEach(ion => {
                const W = weights[ion];
                const C = MINERAL_SALTS[s][ion];
                if (C === 0) return;
                
                // Error actual excluyendo la sal 's'
                let currentMgWithoutS = (Math.max(0, Number(tap[ion]) || 0)) * volume;
                saltNames.forEach(sn => {
                    if (sn !== s) currentMgWithoutS += MINERAL_SALTS[sn][ion] * x[sn];
                });
                
                // Analítico: x_s = -sum(W_i * ErrorWithoutS_i * C_{i,s}) / sum(W_i * C_{i,s}^2)
                numerator += W * (currentMgWithoutS - T[ion]) * C;
                denominator += W * Math.pow(C, 2);
            });

            if (denominator > 0) {
                const optimalX = Math.max(0, -numerator / denominator);
                if (Math.abs(optimalX - x[s]) > 0.001) {
                    x[s] = optimalX;
                    changed = true;
                }
            }
        });
        
        if (!changed) break;
    }

    const finalProfile = {};
    const residualError = {};
    ions.forEach(ion => {
        let finalMg = (Math.max(0, Number(tap[ion]) || 0)) * volume;
        saltNames.forEach(s => {
            finalMg += MINERAL_SALTS[s][ion] * x[s];
        });
        
        const finalPpm = volume > 0 ? (finalMg / volume) : 0;
        // Mantenemos 1 decimal para precisión técnica en perfiles exigentes
        finalProfile[ion] = Math.max(0, Number(finalPpm.toFixed(1)));
        residualError[ion] = Number((target[ion] - finalPpm).toFixed(1));
    });

    return {
        salts: Object.entries(x)
            .filter(([_, amount]) => amount > 0.01)
            .map(([name, amount]) => ({
                name,
                amount: Number(amount.toFixed(2)),
                unit: 'g'
            })),
        residualError,
        finalProfile
    };
};
/**
 * Calcula los volúmenes de agua necesarios para una sesión de cocción.
 * Basado en parámetros de receta y perfil de equipo.
 * 
 * @param {Object} recipeParams - { targetVolume, totalGrainWeight, boilTimeHours }
 * @param {Object} equipmentParams - EquipmentProfile schema
 * @returns {Object} { totalWater, strikeWater, spargeWater, preBoilVolume, warnings }
 */
export const calculateWaterVolumes = (recipeParams, equipmentParams) => {
    const { targetVolume, totalGrainWeight, boilTimeHours } = recipeParams;
    const { evaporationRate, trubLoss, mashRatio, grainAbsorption, totalVolume } = equipmentParams;

    // 1. Strike Water (Agua de Maceración)
    // Validación de rango técnico para AIO (2.7 - 3.0 L/kg)
    const safeMashRatio = Math.max(2.7, Math.min(3.0, mashRatio || 3.0));
    const strikeWater = totalGrainWeight * safeMashRatio;

    // 2. Pérdidas totales estimadas
    const evaporationLoss = evaporationRate * boilTimeHours;
    const absorptionLoss = totalGrainWeight * (grainAbsorption || 1.0);
    
    // 3. Pre-Boil Volume (Volumen antes de hervir)
    // Volumen objetivo + evaporación + pérdidas en fondo
    const preBoilVolume = targetVolume + evaporationLoss + trubLoss;

    // 4. Total Water (Agua necesaria total)
    const totalWater = preBoilVolume + absorptionLoss;

    // 5. Sparge Water (Agua de Lavado)
    const spargeWater = Math.max(0, totalWater - strikeWater);

    // Alertas de seguridad
    const warnings = [];
    if (preBoilVolume > totalVolume * 0.9) {
        warnings.push(`¡ALERTA DE REBALSE! El volumen pre-hervor (${preBoilVolume.toFixed(1)}L) supera el 90% de la capacidad del equipo.`);
    }

    return {
        totalWater: Number(totalWater.toFixed(2)),
        strikeWater: Number(strikeWater.toFixed(2)),
        spargeWater: Number(spargeWater.toFixed(2)),
        postBoilVolume: Number(preBoilVolume.toFixed(2)), // Alias para claridad en historial
        preBoilVolume: Number(preBoilVolume.toFixed(2)),
        warnings
    };
};

/**
 * Calcula la eficiencia de maceración/equipo.
 * @param {number} og - Gravedad Inicial real (ej: 1.050)
 * @param {number} volume - Volumen real recolectado (L)
 * @param {Array} malts - Lista de maltas con sus pesos (kg)
 * @returns {number} - Eficiencia en porcentaje (0-100)
 */
export const calculateEfficiency = (og, volume, malts) => {
    if (!og || !volume || isNaN(volume) || volume <= 0 || !malts || malts.length === 0) return 0;

    const gravityPoints = (og - 1) * 1000;
    const actualPoints = gravityPoints * volume;

    // Potential points: ~300 GP/kg (estándar conservador para maltas base/adjuntos)
    const potentialPoints = malts.reduce((sum, m) => {
        const weight = Number(m.amount) || 0;
        return sum + (weight * 300);
    }, 0);

    if (potentialPoints === 0) return 0;
    
    const efficiency = (actualPoints / potentialPoints) * 100;
    return Number(Math.min(100, Math.max(0, efficiency)).toFixed(1));
};


