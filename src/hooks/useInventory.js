// /src/hooks/useInventory.js
//
// Hook que gestiona el estado del inventario en tiempo real desde Firestore.
// Incluye alertas de stock bajo basadas en los umbrales de validators.js.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    onInventorySnapshot,
    addInventoryItem as _addItem,
    updateInventoryItem as _updateItem,
    deleteInventoryItem as _deleteItem,
    deductBatchFromInventory as _deductBatch,
} from '../services/firestore/inventory';
import { getLowStockItems } from '../utils/validators';

export function useInventory() {
    const { currentUser } = useAuth();
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Suscripción en tiempo real
    useEffect(() => {
        if (!currentUser) {
            setInventory([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const unsub = onInventorySnapshot(
            currentUser.uid,
            (data) => { setInventory(data); setLoading(false); setError(null); },
            (err) => { console.error('useInventory:', err); setError(err.message); setLoading(false); }
        );
        return unsub;
    }, [currentUser]);

    // Alertas de stock bajo — memoizadas, solo recalculan cuando inventory cambia
    const lowStockItems = useMemo(() => getLowStockItems(inventory), [inventory]);

    // CRUD
    const addItem = useCallback(async (data) => {
        return await _addItem(currentUser.uid, data);
    }, [currentUser]);

    const updateItem = useCallback(async (itemId, data) => {
        await _updateItem(currentUser.uid, itemId, data);
    }, [currentUser]);

    const deleteItem = useCallback(async (itemId) => {
        await _deleteItem(currentUser.uid, itemId);
    }, [currentUser]);

    /**
     * Descuenta los ingredientes de una receta del inventario (atómico).
     * Retorna array de deducciones efectivas. Lanza Error si hay fallo.
     */
    const deductBatch = useCallback(async (recipe, targetVolume, phases) => {
        return await _deductBatch(currentUser.uid, recipe, targetVolume, inventory, phases);
    }, [currentUser.uid]); // inventory removed from dependencies as per audit


    return { inventory, loading, error, lowStockItems, addItem, updateItem, deleteItem, deductBatch };
}
