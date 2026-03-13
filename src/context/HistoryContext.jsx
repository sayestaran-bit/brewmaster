/**
 * /src/context/HistoryContext.jsx
 * 
 * Contexto global para gestionar el historial de producción.
 * Evita suscripciones duplicadas y centraliza los datos para Dashboard y HistoryView.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { onHistorySnapshot, getHistoryPage as _getPage, updateTasting as _updateTasting, deleteHistoryEntry as _deleteEntry } from '../services/firestore/history';
import { calculateEfficiency } from '../utils/recipeUtils';

const HistoryContext = createContext();

export const HistoryProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!currentUser) {
            setHistory([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        // Suscribirse a los últimos 100 registros para cubrir Dashboard y vista inicial de Historial
        const unsubscribe = onHistorySnapshot(
            currentUser.uid,
            (data) => {
                setHistory(data);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('HistoryContext Error:', err);
                setError(err.message);
                setLoading(false);
            },
            100 
        );

        return () => unsubscribe();
    }, [currentUser]);

    /**
     * "Cura" y enriquece los datos históricos para asegurar que todos tengan eficiencia y volumen final.
     */
    const enrichedHistory = useMemo(() => {
        return history.map(entry => {
            let efficiency = entry.efficiency;
            // Sanación: si falta la eficiencia pero tenemos OG, volumen e ingredientes, la calculamos
            if (efficiency === undefined && entry.og && entry.volume && entry.ingredients?.malts) {
                efficiency = calculateEfficiency(entry.og, entry.volume, entry.ingredients.malts);
            }

            return {
                ...entry,
                efficiency: efficiency || 0,
                finalVolume: entry.finalVolume || entry.volume || 0,
                totalCost: entry.productionCost?.total || entry.totalCost || 0
            };
        });
    }, [history]);

    /**
     * Calcula estadísticas globales basadas en el historial enriquecido.
     */
    const stats = useMemo(() => {
        if (enrichedHistory.length === 0) return { avgEfficiency: 0, totalVolume: 0, avgCostPerLiter: 0, batchCount: 0 };

        let totalEff = 0;
        let validEffCount = 0;
        let totalVol = 0;
        let totalCost = 0;

        enrichedHistory.forEach(entry => {
            if (entry.efficiency > 0) {
                totalEff += entry.efficiency;
                validEffCount++;
            }
            totalVol += (entry.finalVolume || 0);
            totalCost += (entry.totalCost || 0);
        });

        return {
            avgEfficiency: validEffCount > 0 ? (totalEff / validEffCount).toFixed(1) : 0,
            totalVolume: totalVol.toFixed(1),
            avgCostPerLiter: totalVol > 0 ? (totalCost / totalVol).toFixed(2) : 0,
            batchCount: enrichedHistory.length
        };
    }, [enrichedHistory]);

    const loadPage = useCallback(async (lastDoc = null) => {
        return await _getPage(currentUser.uid, 20, lastDoc);
    }, [currentUser]);

    const updateTasting = useCallback(async (historyId, tasting) => {
        await _updateTasting(currentUser.uid, historyId, tasting);
    }, [currentUser]);

    const deleteEntry = useCallback(async (historyId) => {
        await _deleteEntry(currentUser.uid, historyId);
    }, [currentUser]);

    const value = useMemo(() => ({
        history: enrichedHistory,
        rawHistory: history,
        stats,
        loading,
        error,
        loadPage,
        updateTasting,
        deleteEntry
    }), [enrichedHistory, history, stats, loading, error, loadPage, updateTasting, deleteEntry]);


    return (
        <HistoryContext.Provider value={value}>
            {children}
        </HistoryContext.Provider>
    );
};

export const useHistoryContext = () => {
    const context = useContext(HistoryContext);
    if (!context) {
        throw new Error('useHistoryContext debe usarse dentro de un HistoryProvider');
    }
    return context;
};
