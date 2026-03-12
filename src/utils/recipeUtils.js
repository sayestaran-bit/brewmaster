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
 * Valores estándar para químicos grado alimenticio (hidratados cuando corresponde).
 */
export const MINERAL_SALTS = {
    'Cloruro de Calcio (CaCl2)': { Ca: 272, Cl: 483, Mg: 0, SO4: 0, Na: 0, HCO3: 0 },
    'Sulfato de Calcio (CaSO4)': { Ca: 232, SO4: 558, Mg: 0, Cl: 0, Na: 0, HCO3: 0 },
    'Sulfato de Magnesio (MgSO4)': { Mg: 99, SO4: 390, Ca: 0, Cl: 0, Na: 0, HCO3: 0 },
    'Bicarbonato de Sodio (NaHCO3)': { Na: 273, HCO3: 726, Ca: 0, Mg: 0, SO4: 0, Cl: 0 },
    'Cloruro de Sodio (NaCl)': { Na: 393, Cl: 607, Ca: 0, Mg: 0, SO4: 0, HCO3: 0 },
    'Cloruro de Magnesio (MgCl2)': { Mg: 119, Cl: 349, Ca: 0, SO4: 0, Na: 0, HCO3: 0 }
};

/**
 * Calcula las adiciones de sales necesarias para alcanzar un perfil objetivo.
 * @param {object} target - Perfil objetivo { Ca, Mg, SO4, Cl, Na, HCO3 }
 * @param {object} tap - Perfil de red { Ca, Mg, SO4, Cl, Na, HCO3 }
 * @param {number} volume - Volumen de agua en litros
 * @returns {object} - { salts, residualError, finalProfile }
 */
export const calculateRequiredSalts = (target, tap, volume) => {
    if (!target || !tap || !volume || volume <= 0) return null;

    const ions = ['Ca', 'Mg', 'SO4', 'Cl', 'Na', 'HCO3'];
    
    // Sanitizar entradas para asegurar números positivos
    const t = {};
    const b = {};
    ions.forEach(ion => {
        t[ion] = Math.max(0, Number(target[ion]) || 0);
        b[ion] = Math.max(0, Number(tap[ion]) || 0);
    });

    // Diferencia necesaria en ppm
    const diff = {};
    ions.forEach(ion => {
        diff[ion] = Math.max(0, t[ion] - b[ion]);
    });

    const additions = {};
    const current = { ...b };

    // Estrategia secuencial
    // 1. Priorizar Cloro mediante CaCl2
    if (diff.Cl > 0) {
        const grams = (diff.Cl / MINERAL_SALTS['Cloruro de Calcio (CaCl2)'].Cl) * volume;
        additions['Cloruro de Calcio (CaCl2)'] = grams;
        ions.forEach(ion => {
            current[ion] += (MINERAL_SALTS['Cloruro de Calcio (CaCl2)'][ion] * grams) / volume;
        });
    }

    // 2. Priorizar Sulfatos
    const remainingSO4 = Math.max(0, t.SO4 - current.SO4);
    const remainingCa = Math.max(0, t.Ca - current.Ca);

    if (remainingSO4 > 0) {
        // Si falta calcio, preferimos CaSO4
        if (remainingCa > 5) { // Margen de error
            const grams = (remainingSO4 / MINERAL_SALTS['Sulfato de Calcio (CaSO4)'].SO4) * volume;
            additions['Sulfato de Calcio (CaSO4)'] = (additions['Sulfato de Calcio (CaSO4)'] || 0) + grams;
            ions.forEach(ion => {
                current[ion] += (MINERAL_SALTS['Sulfato de Calcio (CaSO4)'][ion] * grams) / volume;
            });
        } else {
            // Si ya tenemos suficiente Ca, usamos MgSO4
            const grams = (remainingSO4 / MINERAL_SALTS['Sulfato de Magnesio (MgSO4)'].SO4) * volume;
            additions['Sulfato de Magnesio (MgSO4)'] = grams;
            ions.forEach(ion => {
                current[ion] += (MINERAL_SALTS['Sulfato de Magnesio (MgSO4)'][ion] * grams) / volume;
            });
        }
    }

    // 3. Ajustar Sodio / Bicarbonato si es necesario subir pH/Na
    const remainingNa = Math.max(0, t.Na - current.Na);
    if (remainingNa > 0) {
        const grams = (remainingNa / MINERAL_SALTS['Bicarbonato de Sodio (NaHCO3)'].Na) * volume;
        additions['Bicarbonato de Sodio (NaHCO3)'] = grams;
        ions.forEach(ion => {
            current[ion] += (MINERAL_SALTS['Bicarbonato de Sodio (NaHCO3)'][ion] * grams) / volume;
        });
    }

    return {
        salts: Object.entries(additions).map(([name, amount]) => ({
            name,
            amount: Number(amount.toFixed(2)),
            unit: 'g'
        })),
        finalProfile: current
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
        preBoilVolume: Number(preBoilVolume.toFixed(2)),
        warnings
    };
};
