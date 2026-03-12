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
 * Valores de precisión química para optimización WLS.
 */
export const MINERAL_SALTS = {
    'Sulfato de Calcio (CaSO4)': { Ca: 232.8, SO4: 557.7, Mg: 0, Cl: 0, Na: 0, HCO3: 0 },
    'Cloruro de Calcio (CaCl2)': { Ca: 272.6, Cl: 482.3, Mg: 0, SO4: 0, Na: 0, HCO3: 0 },
    'Sulfato de Magnesio (MgSO4)': { Mg: 98.6, SO4: 389.6, Ca: 0, Cl: 0, Na: 0, HCO3: 0 },
    'Bicarbonato de Sodio (NaHCO3)': { Na: 273.8, HCO3: 726.2, Ca: 0, Mg: 0, SO4: 0, Cl: 0 },
    'Cloruro de Sodio (NaCl)': { Na: 393.4, Cl: 606.6, Ca: 0, SO4: 0, Mg: 0, HCO3: 0 },
    'Cloruro de Magnesio (MgCl2)': { Mg: 119, Cl: 349, Ca: 0, SO4: 0, Na: 0, HCO3: 0 }
};

/**
 * Calcula las adiciones de sales mediante el método de Mínimos Cuadrados Ponderados (WLS).
 * Optimiza la mezcla para minimizar la desviación iónica priorizando sabores críticos.
 * 
 * @param {object} target - Perfil objetivo { Ca, Mg, SO4, Cl, Na, HCO3 }
 * @param {object} tap - Perfil de red { Ca, Mg, SO4, Cl, Na, HCO3 }
 * @param {number} volume - Volumen de agua en litros
 * @returns {object} - { salts, residualError, finalProfile }
 */
export const calculateRequiredSalts = (target, tap, volume) => {
    if (!target || !tap || !volume || volume <= 0) return null;

    const ions = ['Ca', 'Mg', 'SO4', 'Cl', 'Na', 'HCO3'];
    const weights = { Cl: 2.0, SO4: 2.0, Ca: 1.5, Mg: 1.0, Na: 1.0, HCO3: 1.0 };
    
    // Sanitizar y escalar objetivos a la masa total necesaria (mg)
    const T = {}; // Target mg
    const current = {}; // Current mg
    ions.forEach(ion => {
        T[ion] = (Math.max(0, Number(target[ion]) || 0)) * volume;
        current[ion] = (Math.max(0, Number(tap[ion]) || 0)) * volume;
    });

    const saltNames = Object.keys(MINERAL_SALTS);
    const x = {}; // Gramos de cada sal
    saltNames.forEach(s => x[s] = 0);

    // Algoritmo: Descenso de Coordenadas Iterativo (Coordinate Descent)
    // Buscamos el x_k >= 0 que minimiza Z = sum( W_i * (Current_i - Target_i)^2 )
    const maxIterations = 200; // Incrementado para mayor precisión
    
    for (let iter = 0; iter < maxIterations; iter++) {
        let changed = false;
        saltNames.forEach(s => {
            let bestDelta = 0;
            let minLoss = Infinity;

            // Espacio de búsqueda adaptativo para la sal actual
            // Probamos desde ajustes gruesos a muy finos
            const steps = [10.0, 5.0, 1.0, 0.1, 0.01, -0.01, -0.1, -1.0, -5.0, -10.0];
            
            steps.forEach(delta => {
                const nextX = Math.max(0, x[s] + delta);
                const actualDelta = nextX - x[s];
                if (actualDelta === 0 && delta !== 0) return;
                
                let loss = 0;
                ions.forEach(ion => {
                    const contribution = (MINERAL_SALTS[s][ion] * actualDelta);
                    const diff = (current[ion] + contribution) - T[ion];
                    loss += weights[ion] * Math.pow(diff, 2);
                });

                if (loss < minLoss) {
                    minLoss = loss;
                    bestDelta = actualDelta;
                }
            });

            // Aplicar el mejor ajuste encontrado para esta sal
            if (Math.abs(bestDelta) > 0.0001) {
                x[s] += bestDelta;
                ions.forEach(ion => {
                    current[ion] += MINERAL_SALTS[s][ion] * bestDelta;
                });
                changed = true;
            }
        });
        
        // Criterio de parada temprana si no hay mejoras significativas
        if (!changed) break;
    }

    const residualError = {};
    const finalProfile = {};
    ions.forEach(ion => {
        const targetPpm = T[ion] / volume;
        const finalPpm = current[ion] / volume;
        finalProfile[ion] = Math.max(0, Number(finalPpm.toFixed(2)));
        residualError[ion] = Number((targetPpm - finalPpm).toFixed(2));
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
        preBoilVolume: Number(preBoilVolume.toFixed(2)),
        warnings
    };
};
