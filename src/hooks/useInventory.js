// /src/hooks/useInventory.js
//
// Hook que gestiona el estado del inventario en tiempo real desde Firestore.
// Incluye alertas de stock bajo basadas en los umbrales de validators.js.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    onInventorySnapshot,
    updateInventoryItemAndSync as _updateItemAndSync,
    onShoppingListsSnapshot,
    addShoppingList as _addShoppingList,
    updateShoppingList as _updateShoppingList,
    deleteShoppingList as _deleteShoppingList,
    convertPurchaseToStock as _convertPurchaseToStock,
    addInventoryItem as _addItem,
    updateInventoryItem as _updateItem,
    deleteInventoryItem as _deleteItem,
    deductBatchFromInventory as _deductBatch,
    toggleIngredientConsumption as _toggleIngredient
} from '../services/firestore/inventory';
import { getLowStockItems } from '../utils/validators';

export function useInventory() {
    const { currentUser } = useAuth();
    const [inventory, setInventory] = useState([]);
    const [shoppingLists, setShoppingLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState(null);

    // Suscripción en tiempo real
    useEffect(() => {
        if (!currentUser) {
            setInventory([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const unsubInv = onInventorySnapshot(
            currentUser.uid,
            (data) => { setInventory(data); setLoading(false); setError(null); },
            (err) => { console.error('useInventory (Inv):', err); setError(err.message); setLoading(false); }
        );

        const unsubShop = onShoppingListsSnapshot(
            currentUser.uid,
            (data) => { setShoppingLists(data); setError(null); },
            (err) => { console.error('useInventory (Shop):', err); setError(err.message); }
        );

        return () => {
            unsubInv();
            unsubShop();
        };
    }, [currentUser]);

    // Alertas de stock bajo — memoizadas, solo recalculan cuando inventory cambia
    const lowStockItems = useMemo(() => getLowStockItems(inventory), [inventory]);

    // CRUD
    const addItem = useCallback(async (data, itemId = null) => {
        return await _addItem(currentUser.uid, data, itemId);
    }, [currentUser]);

    const updateItem = useCallback(async (itemId, data) => {
        await _updateItem(currentUser.uid, itemId, data);
    }, [currentUser]);

    const updateItemAndSync = useCallback(async (itemId, data) => {
        setIsSyncing(true);
        try {
            await _updateItemAndSync(currentUser.uid, itemId, data);
        } finally {
            setIsSyncing(false);
        }
    }, [currentUser]);

    const deleteItem = useCallback(async (itemId) => {
        await _deleteItem(currentUser.uid, itemId);
    }, [currentUser]);

    // Shopping List CRUD
    const addShoppingList = useCallback(async (data) => {
        return await _addShoppingList(currentUser.uid, data);
    }, [currentUser]);

    const updateShoppingList = useCallback(async (listId, data) => {
        await _updateShoppingList(currentUser.uid, listId, data);
    }, [currentUser]);

    const deleteShoppingList = useCallback(async (listId) => {
        await _deleteShoppingList(currentUser.uid, listId);
    }, [currentUser]);

    const convertPurchaseToStock = useCallback(async (listId, confirmedItems) => {
        return await _convertPurchaseToStock(currentUser.uid, listId, confirmedItems);
    }, [currentUser]);

    /**
     * Descuenta los ingredientes de una receta del inventario (atómico).
     * Retorna array de deducciones efectivas. Lanza Error si hay fallo.
     */
    const deductBatch = useCallback(async (recipe, targetVolume, phases, ignoredIngredients = {}) => {
        return await _deductBatch(currentUser.uid, recipe, targetVolume, inventory, phases, ignoredIngredients);
    }, [currentUser.uid, inventory]);

    const toggleIngredient = useCallback(async (batchId, ingredient, isConsumed, targetVolume, recipeTargetVolume) => {
        return await _toggleIngredient(currentUser.uid, batchId, ingredient, isConsumed, targetVolume, recipeTargetVolume, inventory);
    }, [currentUser.uid, inventory]);


    return { 
        inventory, 
        shoppingLists,
        loading, 
        isSyncing,
        error, 
        lowStockItems, 
        addItem, 
        updateItem, 
        updateItemAndSync,
        deleteItem, 
        deductBatch, 
        toggleIngredient,
        addShoppingList,
        updateShoppingList,
        deleteShoppingList,
        convertPurchaseToStock
    };
}
