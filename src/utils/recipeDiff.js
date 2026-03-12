/**
 * @typedef {import('./helpers').RecipeModification} RecipeModification
 * @typedef {import('./helpers').Ingredient} Ingredient
 */

/**
 * Compara dos versiones de una receta y devuelve un objeto estructurado
 * con los cambios detectados en ingredientes, parámetros y perfiles de agua.
 * 
 * @param {Object} oldRecipe - Versión anterior
 * @param {Object} newRecipe - Versión nueva
 * @returns {{diffStrings: string[], changes: Object, hasChanges: boolean}}
 */
export const generateRecipeDiff = (oldRecipe, newRecipe) => {
    // 0. Fallback robusto para recetas nulas o mal estructuradas
    const safeOld = oldRecipe || {};
    const safeNew = newRecipe || {};
    
    if (Object.keys(safeOld).length === 0 && Object.keys(safeNew).length === 0) {
        return { diffStrings: [], changes: {}, hasChanges: false };
    }

    const diffStrings = [];
    const structuredChanges = {
        ingredients: [],
        parameters: [],
        waterProfile: []
    };

    // 1. Comparar Parámetros Base
    const basicParams = [
        { field: 'targetVolume', label: 'Volumen Objetivo', unit: ' L' },
        { field: 'abv', label: 'ABV', unit: '%' },
        { field: 'og', label: 'DO', unit: '' },
        { field: 'fg', label: 'DF', unit: '' },
        { field: 'ibu', label: 'IBU', unit: '' },
        { field: 'colorSRM', label: 'SRM', unit: '' }
    ];

    basicParams.forEach(param => {
        const oldVal = safeOld[param.field];
        const newVal = safeNew[param.field];
        
        // Normalización para comparación numérica con tolerancia
        const ov = Number(oldVal) || 0;
        const nv = Number(newVal) || 0;

        if (Math.abs(ov - nv) > 0.001) {
            const row = {
                field: param.label,
                old: `${ov}${param.unit}`,
                new: `${nv}${param.unit}`
            };
            structuredChanges.parameters.push(row);
            diffStrings.push(`${param.label}: ${row.old} -> ${row.new}`);
        }
    });

    // 2. Comparar Ingredientes
    const normalize = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        // Si es un objeto único (legacy), retornarlo como array de un elemento
        return [val];
    };

    const compareIngredients = (category, label) => {
        const oldItems = normalize(safeOld.ingredients?.[category]);
        const newItems = normalize(safeNew.ingredients?.[category]);

        // Estrategia de búsqueda: Priorizar id, luego inventoryId si existe, luego name
        const findMatch = (item, list) => {
            return list.find(i => 
                (i.id && item.id && i.id === item.id) || 
                (i.inventoryId && item.inventoryId && i.inventoryId === item.inventoryId) ||
                (item.name && i.name === item.name)
            );
        };

        // Detectar Eliminados y Modificados
        oldItems.forEach(oldItem => {
            if (!oldItem.name) return; // Saltar items vacíos

            const newItem = findMatch(oldItem, newItems);
            
            if (!newItem) {
                diffStrings.push(`Eliminado ${label}: ${oldItem.name}`);
                structuredChanges.ingredients.push({
                    field: label,
                    context: oldItem.name,
                    old: `${oldItem.amount}${oldItem.unit || ''}`,
                    new: 'Eliminado'
                });
            } else {
                const changes = [];
                const itemDiff = { field: label, context: oldItem.name, old: '', new: '' };
                
                // Cambio de cantidad
                if (Math.abs(Number(oldItem.amount) - Number(newItem.amount)) > 0.001) {
                    changes.push(`${oldItem.amount}${oldItem.unit || ''} -> ${newItem.amount}${newItem.unit || ''}`);
                    itemDiff.old = `${oldItem.amount}${oldItem.unit || ''}`;
                    itemDiff.new = `${newItem.amount}${newItem.unit || ''}`;
                }
                
                // Cambio de tiempo
                const oldTime = oldItem.additionTime ?? oldItem.time;
                const newTime = newItem.additionTime ?? newItem.time;
                if (oldTime !== newTime && newTime !== undefined) {
                    changes.push(`t @${oldTime} -> @${newTime}`);
                    const timeStrOld = `@${oldTime}`;
                    const timeStrNew = `@${newTime}`;
                    if (!itemDiff.old) {
                        itemDiff.old = timeStrOld;
                        itemDiff.new = timeStrNew;
                    } else {
                        itemDiff.old += ` (${timeStrOld})`;
                        itemDiff.new += ` (${timeStrNew})`;
                    }
                }

                // Cambio de ID de Inventario (mismo nombre, distinto insumo/marca)
                if (oldItem.inventoryId && newItem.inventoryId && oldItem.inventoryId !== newItem.inventoryId) {
                    changes.push(`Cambio de insumo/marca`);
                    diffStrings.push(`${oldItem.name}: Cambio de insumo registrado`);
                }
                
                if (changes.length > 0) {
                    // Evitar duplicar strings si ya lo empujamos arriba para el ID
                    if (!diffStrings.includes(`${oldItem.name}: ${changes.join(', ')}`)) {
                        diffStrings.push(`${oldItem.name}: ${changes.join(', ')}`);
                    }
                    structuredChanges.ingredients.push(itemDiff);
                }
            }
        });

        // Detectar Nuevos
        newItems.forEach(newItem => {
            if (!newItem.name) return;
            if (!findMatch(newItem, oldItems)) {
                const time = newItem.additionTime ?? newItem.time;
                const desc = `${newItem.amount}${newItem.unit || ''}${time ? ` @${time}` : ''}`;
                diffStrings.push(`Añadido ${label}: ${newItem.name} (${desc})`);
                structuredChanges.ingredients.push({
                    field: label,
                    context: newItem.name,
                    old: 'Nuevo',
                    new: desc
                });
            }
        });
    };

    const categories = {
        malts: 'Malta',
        hops: 'Lúpulo',
        others: 'Aditivo/Sal',
        yeast: 'Levadura'
    };

    Object.entries(categories).forEach(([key, label]) => {
        compareIngredients(key, label);
    });

    // 3. Comparar Perfiles de Agua (Iones)
    const ions = ['Ca', 'Mg', 'SO4', 'Cl', 'Na', 'HCO3'];
    const oldWP = safeOld.waterProfile || {};
    const newWP = safeNew.waterProfile || {};
    
    ions.forEach(ion => {
        const ov = Number(oldWP[ion]) || 0;
        const nv = Number(newWP[ion]) || 0;
        if (Math.abs(ov - nv) > 0.01) {
            const row = { field: ion, old: `${ov} ppm`, new: `${nv} ppm` };
            structuredChanges.waterProfile.push(row);
            diffStrings.push(`${ion}: ${row.old} -> ${row.new}`);
        }
    });

    return {
        diffStrings,
        changes: structuredChanges,
        hasChanges: diffStrings.length > 0
    };
};
