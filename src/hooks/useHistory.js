// /src/hooks/useHistory.js
//
// Hook que gestiona el historial de producción desde Firestore.
// Soporta tanto suscripción en tiempo real como carga paginada.

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    onHistorySnapshot,
    getHistoryPage as _getPage,
    updateTasting as _updateTasting,
    deleteHistoryEntry as _deleteEntry,
} from '../services/firestore/history';

export function useHistory(pageSize = 50) {
    const { currentUser } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Suscripción en tiempo real (últimas `pageSize` entradas)
    useEffect(() => {
        if (!currentUser) {
            setHistory([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const unsub = onHistorySnapshot(
            currentUser.uid,
            (data) => { setHistory(data); setLoading(false); setError(null); },
            (err) => { console.error('useHistory:', err); setError(err.message); setLoading(false); },
            pageSize
        );
        return unsub;
    }, [currentUser, pageSize]);

    /**
     * Carga una página de historial (para vistas de análisis con "Cargar más").
     * @param {DocumentSnapshot|null} lastDoc - cursor de la página anterior
     * @returns {Promise<{ entries, lastDoc, hasMore }>}
     */
    const loadPage = useCallback(async (lastDoc = null) => {
        return await _getPage(currentUser.uid, 20, lastDoc);
    }, [currentUser]);

    const updateTasting = useCallback(async (historyId, tasting) => {
        await _updateTasting(currentUser.uid, historyId, tasting);
    }, [currentUser]);

    const deleteEntry = useCallback(async (historyId) => {
        await _deleteEntry(currentUser.uid, historyId);
    }, [currentUser]);

    return { history, loading, error, loadPage, updateTasting, deleteEntry };
}
