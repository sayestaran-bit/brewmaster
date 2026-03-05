// /src/hooks/useFeasibility.js
import { useMemo } from 'react';
import { calculateRecipeCost } from '../utils/costCalculator';

/**
 * Returns the feasibility status of a single recipe against current inventory.
 * @param {Object|null} recipe     - Recipe object (single use)
 * @param {Array}       inventory  - Inventory array from AppContext
 * @param {number}      volume     - Target volume in liters
 * @returns {{ status: 'ready'|'partial'|'blocked'|null, missingItems: Array, ingredients: Array }}
 */
export function useFeasibility(recipe, inventory, volume = 20) {
    return useMemo(() => {
        if (!recipe || !Array.isArray(inventory)) {
            return { status: null, missingItems: [], ingredients: [] };
        }

        const result = calculateRecipeCost(recipe, inventory, volume);
        const { missingItems, ingredients } = result;

        let status;
        if (missingItems.length === 0) {
            status = 'ready';
        } else {
            const allMissing = ingredients.every((i) => !i.inInventory || !i.hasEnough);
            status = allMissing ? 'blocked' : 'partial';
        }

        return { status, missingItems, ingredients };
    }, [recipe, inventory, volume]);
}

/**
 * Batch version: calculates feasibility for a list of recipes.
 * Returns a Map<recipeId, status>.
 * @param {Array}  recipes   - Array of recipe objects
 * @param {Array}  inventory - Inventory array
 * @param {number} volume    - Target volume in liters
 * @returns {Map<string, 'ready'|'partial'|'blocked'>}
 */
export function useFeasibilityBatch(recipes, inventory, volume = 20) {
    return useMemo(() => {
        const map = new Map();
        if (!Array.isArray(recipes) || !Array.isArray(inventory)) return map;

        recipes.forEach((recipe) => {
            const result = calculateRecipeCost(recipe, inventory, volume);
            const { missingItems, ingredients } = result;

            if (missingItems.length === 0) {
                map.set(recipe.id, 'ready');
            } else {
                const allMissing = ingredients.every((i) => !i.inInventory || !i.hasEnough);
                map.set(recipe.id, allMissing ? 'blocked' : 'partial');
            }
        });

        return map;
    }, [recipes, inventory, volume]);
}
