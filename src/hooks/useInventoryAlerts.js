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
 * Detects low-stock and expired items from the inventory.
 * @param {Array} inventory - Raw inventory array from AppContext
 * @returns {{ lowStockItems: Array, expiredItems: Array, suggestedPurchaseItems: Array, hasAlerts: boolean, alertCount: number }}
 */
export function useInventoryAlerts(inventory) {
    const isExpired = (item) => {
        if (!item.expiryDate) return false;
        // El input 'date' del navegador usa YYYY-MM-DD
        const [y, m, d] = item.expiryDate.split('-').map(Number);
        const expiryDateLocal = new Date(y, m - 1, d); 
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Es vencido si la fecha local de vencimiento es estrictamente menor a hoy
        return expiryDateLocal < today;
    };

    const isLowStock = (item) => {
        if (isExpired(item)) return false; // El vencimiento tiene prioridad sobre el stock bajo

        // 1. Usar umbral personalizado si existe
        if (item.minThreshold !== undefined && item.minThreshold !== null && item.minThreshold !== '') {
            return Number(item.stock) < Number(item.minThreshold);
        }

        // 2. Fallback a umbrales globales por categoría
        const globalThreshold = LOW_STOCK_THRESHOLDS[item.category];
        if (!globalThreshold) return false;
        
        return Number(item.stock) < globalThreshold.value;
    };

    const getStockStatus = (item) => {
        if (isExpired(item)) return 'expired';
        if (isLowStock(item)) return 'low';
        return 'optimal';
    };

    return useMemo(() => {
        const safeInventory = Array.isArray(inventory) ? inventory : [];

        const expiredItems = safeInventory.filter(isExpired);
        const lowStockItems = safeInventory.filter(isLowStock);
        
        // Sugerencias de compra: Ítems que están bajos o vencidos (y por ende necesitan reposición)
        const suggestedPurchaseItems = safeInventory
            .filter(item => isLowStock(item) || isExpired(item))
            .sort((a, b) => {
                // Prioridad a los vencidos, luego por stock relativo al umbral
                if (isExpired(a) && !isExpired(b)) return -1;
                if (!isExpired(a) && isExpired(b)) return 1;
                return Number(a.stock) - Number(b.stock);
            });

        return {
            lowStockItems,
            expiredItems,
            suggestedPurchaseItems,
            hasAlerts: suggestedPurchaseItems.length > 0,
            alertCount: suggestedPurchaseItems.length,
            isLowStock,
            isExpired,
            getStockStatus
        };
    }, [inventory]);
}
