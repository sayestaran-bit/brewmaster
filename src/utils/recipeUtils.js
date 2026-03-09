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

    // Final key string that matches the sanitization logic in Firestore/Inventory
    const rawKey = `${phase}_${category}_${name}_${stage}`;
    return rawKey.replace(/[~*/\[\].#$]/g, '_');
};
