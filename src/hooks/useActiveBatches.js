// /src/hooks/useActiveBatches.js
//
// Hook que gestiona los lotes activos en tiempo real desde Firestore.

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    onBatchesSnapshot,
    startBatch as _startBatch,
    updateBatchProgress as _updateProgress,
    completeBatch as _completeBatch,
    discardBatch as _discardBatch,
    transitionBatchPhase as _transitionBatchPhase,
    updateBatchField as _updateBatchField
} from '../services/firestore/batches';

export function useActiveBatches() {
    const { currentUser } = useAuth();
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!currentUser) {
            setBatches([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const unsub = onBatchesSnapshot(
            currentUser.uid,
            (data) => { setBatches(data); setLoading(false); setError(null); },
            (err) => { console.error('useActiveBatches:', err); setError(err.message); setLoading(false); }
        );
        return unsub;
    }, [currentUser]);

    const startBatch = useCallback(async (batchData) => {
        return await _startBatch(currentUser.uid, batchData);
    }, [currentUser]);

    const updateProgress = useCallback(async (batchId, newStep, completedSteps) => {
        await _updateProgress(currentUser.uid, batchId, newStep, completedSteps);
    }, [currentUser]);

    /**
     * Completa un batch: lo elimina y lo mueve al historial en una sola operación atómica.
     * @param {string} batchId
     * @param {object} historyEntry - datos del registro histórico incluyendo brewDate y bottlingDate
     * @returns {Promise<string>} id de la nueva entrada de historial
     */
    const completeBatch = useCallback(async (batchId, historyEntry) => {
        return await _completeBatch(currentUser.uid, batchId, historyEntry);
    }, [currentUser]);

    const discardBatch = useCallback(async (batchId, historyEntry) => {
        await _discardBatch(currentUser.uid, batchId, historyEntry);
    }, [currentUser]);

    const transitionBatchPhase = useCallback(async (batchId, nextPhase) => {
        await _transitionBatchPhase(currentUser.uid, batchId, nextPhase);
    }, [currentUser]);

    const updateBatchField = useCallback(async (batchId, fields) => {
        await _updateBatchField(currentUser.uid, batchId, fields);
    }, [currentUser]);

    return { batches, loading, error, startBatch, updateProgress, completeBatch, discardBatch, transitionBatchPhase, updateBatchField };
}
