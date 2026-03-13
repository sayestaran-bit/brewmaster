/**
 * /src/utils/analyticsUtils.js
 * 
 * Utilidades para transformar datos históricos en series temporales
 * compatibles con Recharts u otras librerías de visualización.
 */

import { formatCurrency } from './formatters';

/**
 * Transforma el historial en una serie temporal para gráficos de área/línea.
 * 
 * @param {Array} history - Array de objetos de historial de Firestore.
 * @param {Object} options - Opciones de agrupación { period: 'month'|'week', metric: 'efficiency'|'cost' }
 * @returns {Array} - Datos formateados para Recharts.
 */
export const transformHistoryToTimeSeries = (history, { period = 'month', metric = 'efficiency' } = {}) => {
    if (!history || history.length === 0) return [];

    // 1. Filtrar y ordenar por fecha (ascendente para series temporales)
    const sortedHistory = [...history]
        .filter(entry => entry.timestamp && entry.status === 'Completada')
        .sort((a, b) => {
            const dateA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp || 0);
            const dateB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp || 0);
            return dateA - dateB;
        });

    // 2. Agrupar por el período seleccionado
    const groups = {};
    
    sortedHistory.forEach(entry => {
        const timestamp = entry.timestamp?.toMillis ? entry.timestamp.toMillis() : (entry.timestamp || 0);
        const date = new Date(timestamp);
        
        let label = "";
        if (period === 'month') {
            label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else {
            // Simplificación: usaremos el número de semana del año si es weekly
            label = `${date.getFullYear()}-W${getWeekNumber(date)}`;
        }

        if (!groups[label]) {
            groups[label] = { label, values: [], totalCost: 0, totalLiters: 0, count: 0 };
        }

        const value = metric === 'efficiency' ? (entry.efficiency || 0) : (entry.totalCost || 0);
        groups[label].values.push(value);
        groups[label].totalCost += (entry.totalCost || 0);
        groups[label].totalLiters += (entry.targetVolume || 20); // Fallback a 20L
        groups[label].count += 1;
    });

    // 3. Calcular promedios por grupo
    return Object.keys(groups).map(key => {
        const group = groups[key];
        const average = group.values.reduce((a, b) => a + b, 0) / group.count;
        const costPerLiter = group.totalLiters > 0 ? group.totalCost / group.totalLiters : 0;

        return {
            name: key, // Eje X (fecha formateada)
            value: Number(average.toFixed(2)), // Eje Y (métrica principal)
            costPerLiter: Number(costPerLiter.toFixed(2)),
            count: group.count
        };
    });
};

/**
 * Calcula la tendencia de eficiencia de los últimos N lotes.
 */
export const getEfficiencyTrend = (history, limit = 10) => {
    const data = transformHistoryToTimeSeries(history, { period: 'week', metric: 'efficiency' });
    return data.slice(-limit);
};

/**
 * Obtiene el número de semana de una fecha.
 */
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}
