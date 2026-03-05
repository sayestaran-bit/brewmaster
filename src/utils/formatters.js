// /src/utils/formatters.js

/**
 * Formato de moneda CLP o aproximado
 */
export const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val || 0);
};

/**
 * Formateador estricto para base de datos a DD/MM/YYYY
 */
export const getFormattedDate = () => {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

/**
 * Limpia y unifica diferentes formatos (2-3-2026, 02/03/26, etc) a DD/MM/YYYY
 */
export const standardizeDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return getFormattedDate();
    const parts = dateStr.replace(/[-.]/g, '/').split('/');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        let year = parts[2];
        if (year.length === 2) year = `20${year}`;
        return `${day}/${month}/${year}`;
    }
    return dateStr;
};

/**
 * Convierte un DD/MM/YYYY a Timestamp para ordenar temporalmente en Firebase
 */
export const parseDateToTimestamp = (dateStr) => {
    if (!dateStr) return 0;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return 0;
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`).getTime();
};

/**
 * Formateo estricto del temporizador del BrewSession
 */
export const formatTime = (seconds) => {
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};
