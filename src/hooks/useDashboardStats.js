// /src/hooks/useDashboardStats.js
import { useMemo } from 'react';

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

/**
 * Derives dashboard KPI stats from history data.
 * @param {Array} history - Raw history array from AppContext
 * @returns {{ totalLiters, totalCost, totalBatches, avgCostPerLiter, avgABV, topStyles, recentHistory }}
 */
export function useDashboardStats(history) {
    return useMemo(() => {
        const safeHistory = Array.isArray(history) ? history : [];

        const filteredHistory = safeHistory.filter(
            (h) => (Date.now() - h.timestamp) <= SIX_MONTHS_MS
        );

        const totalVolume = filteredHistory.reduce((sum, h) => sum + (Number(h.volume) || 0), 0);
        const totalCost = filteredHistory.reduce((sum, h) => sum + (Number(h.totalCost) || 0), 0);
        const totalBatches = filteredHistory.length;
        const totalLiters = Math.round(totalVolume);

        const avgCostPerLiter = totalVolume > 0 ? totalCost / totalVolume : 0;
        const avgABV = totalBatches > 0
            ? (filteredHistory.reduce((sum, h) => sum + (Number(h.abv) || 0), 0) / totalBatches).toFixed(1)
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

        return {
            totalLiters,
            totalCost,
            totalBatches,
            avgCostPerLiter,
            avgABV,
            topStyles,
            maxStyleVolume,
            recentHistory,
            filteredHistory,
        };
    }, [history]);
}
