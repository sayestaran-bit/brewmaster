// /src/utils/validators.js
//
// Validación de reglas de negocio en el cliente.
// Toda la lógica de "¿puedo hacer esto?" vive aquí, separada de la UI.

/**
 * Busca un ítem del inventario por nombre y categoría (case-insensitive).
 */
function findInventoryItem(inventory, name, category) {
    const searchName = (name || '').toLowerCase().trim();
    if (!searchName) return null;
    return (inventory || []).find(i => {
        const iName = (i.name || '').toLowerCase().trim();
        return i.category === category && iName && iName.includes(searchName);
    }) || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTIBILIDAD DE RECETA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica si hay suficiente stock para elaborar una receta.
 *
 * @param {object} recipe       - receta con `ingredients` y `targetVolume`
 * @param {Array}  inventory    - inventario actual
 * @param {number} targetVolume - volumen objetivo (puede diferir del `recipe.targetVolume`)
 * @returns {{
 *   feasible: boolean,
 *   coverage: number,           // Porcentaje de ingredientes cubiertos (0-100)
 *   missing: Array<{            // Ingredientes con stock insuficiente
 *     name: string,
 *     category: string,
 *     needed: number,
 *     available: number,
 *     unit: string,
 *     shortage: number
 *   }>,
 *   ok: Array<string>           // Nombres de ingredientes con stock suficiente
 * }}
 */
export function checkFeasibility(recipe, inventory, targetVolume) {
    if (!recipe?.ingredients) return { feasible: false, coverage: 0, missing: [], ok: [] };

    const scaleFactor = (targetVolume || 1) / (recipe.targetVolume || 1);
    const missing = [];
    const ok = [];
    let total = 0;

    // Maltas
    (recipe.ingredients.malts || []).forEach(m => {
        total++;
        const needed = parseFloat(((Number(m.amount) || 0) * scaleFactor).toFixed(4));
        const item = findInventoryItem(inventory, m.name, 'Malta');
        const available = item ? Number(item.stock) : 0;
        if (available >= needed) {
            ok.push(m.name);
        } else {
            missing.push({ name: m.name, category: 'Malta', needed, available, unit: 'kg', shortage: parseFloat((needed - available).toFixed(4)) });
        }
    });

    // Lúpulos
    (recipe.ingredients.hops || []).forEach(h => {
        total++;
        const needed = Math.round((Number(h.amount) || 0) * scaleFactor);
        const item = findInventoryItem(inventory, h.name, 'Lúpulo');
        const available = item ? Number(item.stock) : 0;
        if (available >= needed) {
            ok.push(h.name);
        } else {
            missing.push({ name: h.name, category: 'Lúpulo', needed, available, unit: 'g', shortage: needed - available });
        }
    });

    // Levadura
    const yeastObj = recipe.ingredients.yeast;
    if (yeastObj) {
        total++;
        const yeastName = typeof yeastObj === 'string' ? yeastObj : (yeastObj.name || 'Levadura');
        const yeastAmount = typeof yeastObj === 'string' ? 1 : (Number(yeastObj.amount) || 1);
        const item = findInventoryItem(inventory, yeastName, 'Levadura');
        const available = item ? Number(item.stock) : 0;
        if (available >= yeastAmount) {
            ok.push(yeastName);
        } else {
            missing.push({ name: yeastName, category: 'Levadura', needed: yeastAmount, available, unit: 'sobre', shortage: yeastAmount - available });
        }
    }

    const feasible = missing.length === 0;
    const coverage = total > 0 ? Math.round((ok.length / total) * 100) : 0;

    return { feasible, coverage, missing, ok };
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIÓN DE RECETA (antes de guardar)
// ─────────────────────────────────────────────────────────────────────────────

export function validateRecipe(recipeData, isPartial = false) {
    const errors = [];

    // Si es parcial, solo validamos lo que viene. Si es completo, todo es obligatorio.
    const check = (field) => !isPartial || (field in recipeData);

    if (check('name') && !recipeData?.name?.trim())
        errors.push('El nombre de la receta es obligatorio.');
    if (check('category') && !recipeData?.category?.trim())
        errors.push('La categoría es obligatoria.');
    if (check('targetVolume') && (!recipeData?.targetVolume || Number(recipeData.targetVolume) <= 0))
        errors.push('El volumen objetivo debe ser mayor a 0.');
    if (check('ingredients') && (!Array.isArray(recipeData?.ingredients?.malts) || recipeData.ingredients.malts.length === 0))
        errors.push('La receta debe tener al menos una malta.');
    if (check('steps') && (!Array.isArray(recipeData?.steps) || recipeData.steps.length === 0))
        errors.push('La receta debe tener al menos un paso.');

    return { valid: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERTAS DE STOCK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Umbrales de stock bajo por categoría.
 * Centralizado aquí para poder cambiarlo fácilmente.
 */
export const LOW_STOCK_THRESHOLDS = {
    'Malta': { threshold: 5, unit: 'kg' },
    'Lúpulo': { threshold: 100, unit: 'g' },
    'Levadura': { threshold: 2, unit: 'sobre' },
    'Sales Minerales': { threshold: 50, unit: 'g' },
    'Aditivos': { threshold: 1, unit: 'u' },
};

/**
 * Filtra el inventario y retorna los ítems con stock bajo.
 * @param {Array} inventory
 * @returns {Array}
 */
export function getLowStockItems(inventory) {
    return (inventory || [])
        .filter(item => {
            const cfg = LOW_STOCK_THRESHOLDS[item.category];
            return cfg && Number(item.stock) < cfg.threshold;
        })
        .sort((a, b) => a.stock - b.stock);
}
