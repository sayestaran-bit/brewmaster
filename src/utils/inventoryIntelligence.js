/**
 * /src/utils/inventoryIntelligence.js
 * 
 * Servicio de Inteligencia de Inventario.
 * Analiza el stock disponible contra el catálogo de recetas para previsión de producción.
 */

/**
 * Verifica si una receta puede ser cocinada con el stock actual del inventario.
 * 
 * @param {Object} recipe - Objeto de la receta.
 * @param {Array} inventory - Array de ítems del inventario.
 * @param {number} targetVolume - Volumen objetivo para el escalado (opcional).
 * @returns {Object} - { canBrew: boolean, missingIngredients: Array }
 */
export const canBrewRecipe = (recipe, inventory, targetVolume = null) => {
    if (!recipe || !inventory) return { canBrew: false, missingIngredients: [] };

    const vol = targetVolume || recipe.targetVolume || 20;
    const scaleFactor = vol / (recipe.targetVolume || 20);
    const missingIngredients = [];

    // 1. Unificar todos los ingredientes en una lista plana para chequeo
    const requirements = [];

    if (recipe.ingredients?.malts) {
        recipe.ingredients.malts.forEach(m => requirements.push({ ...m, category: 'Malta' }));
    }
    if (recipe.ingredients?.hops) {
        recipe.ingredients.hops.forEach(h => requirements.push({ ...h, category: 'Lúpulo' }));
    }
    if (recipe.ingredients?.yeast) {
        const y = recipe.ingredients.yeast;
        requirements.push({ 
            name: typeof y === 'string' ? y : y.name, 
            amount: typeof y === 'string' ? 1 : y.amount, 
            category: 'Levadura' 
        });
    }
    if (recipe.ingredients?.others) {
        recipe.ingredients.others.forEach(o => requirements.push({ ...o, category: o.category || 'Aditivos' }));
    }

    // 2. Chequear stock para cada requerimiento
    requirements.forEach(req => {
        const needed = (Number(req.amount) || 0) * scaleFactor;
        const searchName = (req.name || '').toLowerCase().trim();

        const invItem = inventory.find(i => 
            i.category === req.category && 
            (i.name || '').toLowerCase().trim().includes(searchName)
        );

        if (!invItem || Number(invItem.stock) < needed) {
            missingIngredients.push({
                name: req.name,
                category: req.category,
                needed: needed.toFixed(2),
                available: invItem ? Number(invItem.stock).toFixed(2) : 0,
                unit: invItem ? invItem.unit : ''
            });
        }
    });

    return {
        canBrew: missingIngredients.length === 0,
        missingIngredients
    };
};

/**
 * Filtra el catálogo de recetas para identificar cuáles pueden ser cocinadas hoy.
 * 
 * @param {Array} recipes - Lista de recetas.
 * @param {Array} inventory - Lista de ítems de inventario.
 * @returns {Array} - Lista de recetas con su estado de factibilidad.
 */
export const getBrewableRecipes = (recipes, inventory) => {
    if (!recipes || !inventory) return [];

    return recipes.map(recipe => ({
        ...recipe,
        feasibility: canBrewRecipe(recipe, inventory)
    }));
};
