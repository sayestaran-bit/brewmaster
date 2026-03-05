// /src/utils/costCalculator.js

import { defaultPrices } from './helpers';

/**
 * Encuentra un ítem del inventario por nombre y categoría.
 * Usa matching parcial (case-insensitive) para tolerancia.
 */
function findInventoryItem(inventory, name, category) {
    const searchName = (name || '').toLowerCase().trim();
    if (!searchName) return null;
    return inventory.find(i => {
        const iName = (i.name || '').toLowerCase().trim();
        return i.category === category && iName && (iName === searchName || searchName.includes(iName));
    }) || null;
}

/**
 * Calcula el costo completo de una receta dado el inventario y volumen objetivo.
 * Retorna un objeto con desglose de costos y alertas de stock.
 *
 * @param {Object} recipe - La receta completa con ingredients
 * @param {Array} inventory - Array de ítems del inventario
 * @param {number} targetVolume - Volumen objetivo en litros
 * @returns {{ neto, iva, total, perLiter, allFound, ingredients: { name, category, needed, available, hasEnough, cost }[] }}
 */
export function calculateRecipeCost(recipe, inventory, targetVolume) {
    const safeInventory = Array.isArray(inventory) ? inventory : [];
    const scaleFactor = (targetVolume || 1) / (recipe.targetVolume || 1);

    let neto = 0;
    let allFound = true;
    const ingredients = [];

    // Maltas
    const safeMalts = Array.isArray(recipe.ingredients?.malts) ? recipe.ingredients.malts : [];
    safeMalts.forEach(m => {
        const scaledAmount = parseFloat(((Number(m.amount) || 0) * scaleFactor).toFixed(4));
        const item = findInventoryItem(safeInventory, m.name, 'Malta');
        const unitPrice = item ? Number(item.price) : defaultPrices.malta;
        const cost = scaledAmount * unitPrice;
        neto += cost;

        if (!item) allFound = false;

        ingredients.push({
            name: m.name || 'Malta desconocida',
            category: 'Malta',
            unit: 'kg',
            needed: scaledAmount,
            available: item ? Number(item.stock) : 0,
            hasEnough: item ? Number(item.stock) >= scaledAmount : false,
            inInventory: !!item,
            cost
        });
    });

    // Lúpulos
    const safeHops = Array.isArray(recipe.ingredients?.hops) ? recipe.ingredients.hops : [];
    safeHops.forEach(h => {
        const scaledAmount = Math.round((Number(h.amount) || 0) * scaleFactor);
        const item = findInventoryItem(safeInventory, h.name, 'Lúpulo');
        const unitPrice = item ? Number(item.price) : defaultPrices.lupulo;
        const cost = scaledAmount * unitPrice;
        neto += cost;

        if (!item) allFound = false;

        ingredients.push({
            name: h.name || 'Lúpulo desconocido',
            category: 'Lúpulo',
            unit: 'g',
            needed: scaledAmount,
            available: item ? Number(item.stock) : 0,
            hasEnough: item ? Number(item.stock) >= scaledAmount : false,
            inInventory: !!item,
            cost
        });
    });

    // Levadura
    const yeastObj = recipe.ingredients?.yeast;
    const yeastName = typeof yeastObj === 'string' ? yeastObj : (yeastObj?.name || 'Levadura');
    const yeastAmount = typeof yeastObj === 'string' ? 1 : (Number(yeastObj?.amount) || 1);
    const yItem = findInventoryItem(safeInventory, yeastName, 'Levadura');
    const yUnitPrice = yItem ? Number(yItem.price) : defaultPrices.levadura;
    const yCost = yeastAmount * yUnitPrice;
    neto += yCost;

    if (!yItem) allFound = false;

    ingredients.push({
        name: yeastName,
        category: 'Levadura',
        unit: 'sobre',
        needed: yeastAmount,
        available: yItem ? Number(yItem.stock) : 0,
        hasEnough: yItem ? Number(yItem.stock) >= yeastAmount : false,
        inInventory: !!yItem,
        cost: yCost
    });

    const iva = neto * 0.19;
    const total = neto + iva;
    const perLiter = total / (targetVolume || 1);
    const missingItems = ingredients.filter(i => !i.hasEnough);

    return { neto, iva, total, perLiter, allFound, ingredients, missingItems };
}

/**
 * Descuenta los insumos usados del inventario, retornando un nuevo array de inventario.
 * @param {Array} inventory - inventario actual
 * @param {Object} recipe - receta con ingredients
 * @param {number} targetVolume - volumen objetivo
 * @returns {Array} - nuevo array de inventario con stock actualizado
 */
export function deductInventory(inventory, recipe, targetVolume) {
    const currentInventory = JSON.parse(JSON.stringify(inventory));
    const scaleFactor = (targetVolume || 1) / (recipe.targetVolume || 1);

    // Maltas
    (recipe.ingredients?.malts || []).forEach(m => {
        const scaledAmount = parseFloat(((Number(m.amount) || 0) * scaleFactor).toFixed(4));
        const item = findInventoryItem(currentInventory, m.name, 'Malta');
        if (item) item.stock = parseFloat(Math.max(0, Number(item.stock) - scaledAmount).toFixed(4));
    });

    // Lúpulos
    (recipe.ingredients?.hops || []).forEach(h => {
        const scaledAmount = Math.round((Number(h.amount) || 0) * scaleFactor);
        const item = findInventoryItem(currentInventory, h.name, 'Lúpulo');
        if (item) item.stock = parseFloat(Math.max(0, Number(item.stock) - scaledAmount).toFixed(4));
    });

    // Levadura
    const yeastObj = recipe.ingredients?.yeast;
    if (yeastObj) {
        const yeastName = typeof yeastObj === 'string' ? yeastObj : (yeastObj.name || '');
        const yeastAmount = typeof yeastObj === 'string' ? 1 : (Number(yeastObj.amount) || 1);
        const yItem = findInventoryItem(currentInventory, yeastName, 'Levadura');
        if (yItem) yItem.stock = parseFloat(Math.max(0, Number(yItem.stock) - yeastAmount).toFixed(4));
    }

    return currentInventory;
}
