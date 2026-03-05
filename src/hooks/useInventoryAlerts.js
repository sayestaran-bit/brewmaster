// /src/hooks/useInventoryAlerts.js
import { useMemo } from 'react';

/**
 * Configurable low-stock thresholds per category.
 * Extend here when new categories (Sales Minerales, Aditivos) are added.
 */
const LOW_STOCK_THRESHOLDS = {
    'Malta': { value: 5, unit: 'kg' },
    'Lúpulo': { value: 100, unit: 'g' },
    'Levadura': { value: 2, unit: 'sobres' },
    'Sales Minerales': { value: 50, unit: 'g' },
    'Aditivos': { value: 1, unit: 'unidad' },
};

/**
 * Detects low-stock items from the inventory.
 * @param {Array} inventory - Raw inventory array from AppContext
 * @returns {{ lowStockItems: Array, hasAlerts: boolean, alertCount: number }}
 */
export function useInventoryAlerts(inventory) {
    return useMemo(() => {
        const safeInventory = Array.isArray(inventory) ? inventory : [];

        const lowStockItems = safeInventory
            .filter((item) => {
                const threshold = LOW_STOCK_THRESHOLDS[item.category];
                if (!threshold) return false;
                return Number(item.stock) < threshold.value;
            })
            .sort((a, b) => Number(a.stock) - Number(b.stock));

        return {
            lowStockItems,
            hasAlerts: lowStockItems.length > 0,
            alertCount: lowStockItems.length,
        };
    }, [inventory]);
}
