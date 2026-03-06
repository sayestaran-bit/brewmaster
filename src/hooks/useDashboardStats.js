// /src/hooks/useDashboardStats.js
import { useMemo } from 'react';

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

/**
 * Derives dashboard KPI stats from history data.
 * @param {Array} history - Raw history array from AppContext
 * @param {string} searchTerm - Text to filter by recipe name or category
 * @param {string} statusFilter - 'all' | 'completed' | 'abandoned'
 * @param {Array} recipes - Recipes array to cross-reference ingredients
 * @param {string} periodFilter - '1m' | '3m' | '6m' | '1y' | 'all'
 * @param {string} styleFilter - 'all' | category string
 * @returns {{ totalLiters, totalCost, totalBatches, avgCostPerLiter, avgABV, topStyles, recentHistory, topIngredients, availableStyles }}
 */
export function useDashboardStats(history, searchTerm = '', statusFilter = 'all', recipes = [], periodFilter = '6m', styleFilter = 'all') {
    return useMemo(() => {
        const safeHistory = Array.isArray(history) ? history : [];
        const safeRecipes = Array.isArray(recipes) ? recipes : [];

        // Extraer todos los estilos disponibles para los filtros (antes de aplicar pre-filtros)
        const availableStyles = [...new Set(safeHistory.map(h => h.category || 'Otros'))].sort();

        const filteredHistory = safeHistory.filter((h) => {
            // Filtro de Periodo
            if (periodFilter !== 'all') {
                const days = periodFilter === '1m' ? 30 : periodFilter === '3m' ? 90 : periodFilter === '6m' ? 180 : 365;
                const msLimit = days * 24 * 60 * 60 * 1000;
                if ((Date.now() - h.timestamp) > msLimit) return false;
            }

            // Filtro de Estilo
            if (styleFilter !== 'all' && (h.category || 'Otros') !== styleFilter) return false;

            // Filtro de estado
            if (statusFilter === 'completed' && h.status !== 'Completada') return false;
            if (statusFilter === 'abandoned' && h.status !== 'Abandonada') return false;

            // Búsqueda de texto (Nombre o Estilo)
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const nameMatch = (h.recipeName || '').toLowerCase().includes(term);
                const styleMatch = (h.category || '').toLowerCase().includes(term);
                if (!nameMatch && !styleMatch) return false;
            }

            return true;
        });

        const totalVolume = filteredHistory.reduce((sum, h) => sum + (Number(h.volume) || 0), 0);
        const totalCost = filteredHistory.reduce((sum, h) => sum + (Number(h.totalCost) || 0), 0);
        const totalBatches = filteredHistory.length;
        const totalLiters = Math.round(totalVolume);

        const avgCostPerLiter = totalVolume > 0 ? totalCost / totalVolume : 0;
        const avgABV = totalBatches > 0
            ? (filteredHistory.reduce((sum, h) => sum + (Number(h.abv) || 0), 0) / totalBatches).toFixed(1)
            : 0;

        const batchesWithFerm = filteredHistory.filter(h => h.metrics && h.metrics.daysInFermentation != null);
        const avgFermentationDays = batchesWithFerm.length > 0
            ? Math.round(batchesWithFerm.reduce((sum, h) => sum + h.metrics.daysInFermentation, 0) / batchesWithFerm.length)
            : 0;

        // Volume by beer style for bar chart
        const styleCount = filteredHistory.reduce((acc, h) => {
            const cat = h.category || 'Otros';
            acc[cat] = (acc[cat] || 0) + (Number(h.volume) || 0);
            return acc;
        }, {});
        const topStyles = Object.entries(styleCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);
        const maxStyleVolume = topStyles.length > 0 ? Math.max(...topStyles.map(([, v]) => v)) : 1;

        // Last 5 batches sorted by newest first
        const recentHistory = [...filteredHistory]
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, 5);

        // Top Ingredients Calculation
        const ingredientUsage = {};

        filteredHistory.forEach(h => {
            const recipe = safeRecipes.find(r => r.id === h.recipeId);
            if (!recipe) return;

            const scaleFactor = (h.volume || 1) / (recipe.targetVolume || 1);

            // Maltas
            recipe.ingredients?.malts?.forEach(m => {
                if (!m.name) return;
                const key = `Malta|${m.name}`;
                ingredientUsage[key] = (ingredientUsage[key] || 0) + (Number(m.amount) * scaleFactor);
            });

            // Lúpulos
            recipe.ingredients?.hops?.forEach(hop => {
                if (!hop.name) return;
                const key = `Lúpulo|${hop.name}`;
                ingredientUsage[key] = (ingredientUsage[key] || 0) + (Number(hop.amount) * scaleFactor);
            });

            // Levadura
            const yeastObj = recipe.ingredients?.yeast;
            const yeastName = typeof yeastObj === 'string' ? yeastObj : (yeastObj?.name);
            if (yeastName) {
                const yeastAmt = typeof yeastObj === 'string' ? 1 : (Number(yeastObj?.amount) || 1);
                const yKey = `Levadura|${yeastName}`;
                ingredientUsage[yKey] = (ingredientUsage[yKey] || 0) + (yeastAmt * scaleFactor);
            }

            // Otros
            recipe.ingredients?.others?.forEach(o => {
                if (!o.name || !o.category) return;
                const key = `${o.category}|${o.name}`;
                ingredientUsage[key] = (ingredientUsage[key] || 0) + (Number(o.amount) * scaleFactor);
            });
        });

        // Agrupar por categoría
        const groupedIngredients = {};
        Object.entries(ingredientUsage).forEach(([key, amount]) => {
            const [cat, name] = key.split('|');
            if (!groupedIngredients[cat]) groupedIngredients[cat] = [];
            groupedIngredients[cat].push({ name, amount });
        });

        // Ordenar y tomar los top 3 por categoría
        const topIngredients = {};
        Object.keys(groupedIngredients).forEach(cat => {
            topIngredients[cat] = groupedIngredients[cat]
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 3);
        });

        return {
            totalLiters,
            totalCost,
            totalBatches,
            avgCostPerLiter,
            avgABV,
            avgFermentationDays,
            topStyles,
            maxStyleVolume,
            recentHistory,
            topIngredients,
            filteredHistory,
            availableStyles,
        };
    }, [history, searchTerm, statusFilter, recipes, periodFilter, styleFilter]);
}
