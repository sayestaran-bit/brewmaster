// /src/hooks/useInventory.js
//
// Hook que gestiona el estado del inventario en tiempo real desde Firestore.
// Incluye alertas de stock bajo basadas en los umbrales de validators.js.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
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
import { getLowStockItems, LOW_STOCK_THRESHOLDS, validateInventoryItem } from '../utils/validators';


export function useInventory() {
    const { currentUser } = useAuth();
    const [inventory, setInventory] = useState([]);
    const [shoppingLists, setShoppingLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState(null);
    const { addToast } = useToast();


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
        try {
            const { valid, errors } = validateInventoryItem(data);
            if (!valid) {
                const msg = errors.join(' ');
                addToast(msg, 'warning');
                throw new Error(msg);
            }
            const id = await _addItem(currentUser.uid, data, itemId);
            addToast('Ítem añadido al inventario.', 'success');
            return id;
        } catch (err) {
            console.error('❌ useInventory.addItem Error:', err);
            addToast(err.message || 'Error al añadir el ítem.', 'error');
            throw err;
        }
    }, [currentUser, addToast]);

    const updateItem = useCallback(async (itemId, data) => {
        try {
            // Si es un patch parcial, no validamos todo, pero al menos los tipos si vienen
            const { valid, errors } = validateInventoryItem({ ...inventory.find(i => i.id === itemId), ...data });
            if (!valid) {
                const msg = errors.join(' ');
                addToast(msg, 'warning');
                throw new Error(msg);
            }
            await _updateItem(currentUser.uid, itemId, data);
            addToast('Ítem actualizado.', 'success');
        } catch (err) {
            console.error('❌ useInventory.updateItem Error:', err);
            addToast(err.message || 'Error al actualizar el ítem.', 'error');
            throw err;
        }
    }, [currentUser, inventory, addToast]);

    const updateItemAndSync = useCallback(async (itemId, data) => {
        setIsSyncing(true);
        try {
            await _updateItemAndSync(currentUser.uid, itemId, data);
            addToast('Ítem actualizado y sincronizado con recetas.', 'success');
        } catch (err) {
            console.error('❌ useInventory.updateItemAndSync Error:', err);
            addToast('Error al sincronizar el ítem con las recetas.', 'error');
        } finally {
            setIsSyncing(false);
        }
    }, [currentUser, addToast]);

    const deleteItem = useCallback(async (itemId) => {
        try {
            await _deleteItem(currentUser.uid, itemId);
            addToast('Ítem eliminado del inventario.', 'info');
        } catch (err) {
            console.error('❌ useInventory.deleteItem Error:', err);
            addToast('No se pudo eliminar el ítem.', 'error');
            throw err;
        }
    }, [currentUser, addToast]);

    // Shopping List CRUD
    const addShoppingList = useCallback(async (data) => {
        try {
            const id = await _addShoppingList(currentUser.uid, data);
            addToast('Lista de compras guardada.', 'success');
            return id;
        } catch (err) {
            console.error('❌ useInventory.addShoppingList Error:', err);
            addToast('Error al guardar la lista de compras.', 'error');
            throw err;
        }
    }, [currentUser, addToast]);

    const updateShoppingList = useCallback(async (listId, data) => {
        try {
            await _updateShoppingList(currentUser.uid, listId, data);
        } catch (err) {
            console.error('❌ useInventory.updateShoppingList Error:', err);
            addToast('Error al actualizar la lista.', 'error');
        }
    }, [currentUser, addToast]);

    const deleteShoppingList = useCallback(async (listId) => {
        try {
            await _deleteShoppingList(currentUser.uid, listId);
            addToast('Lista de compras eliminada.', 'info');
        } catch (err) {
            console.error('❌ useInventory.deleteShoppingList Error:', err);
            addToast('Error al eliminar la lista.', 'error');
        }
    }, [currentUser, addToast]);

    const convertPurchaseToStock = useCallback(async (listId, confirmedItems) => {
        try {
            await _convertPurchaseToStock(currentUser.uid, listId, confirmedItems);
            addToast('Stock actualizado desde la compra.', 'success');
        } catch (err) {
            console.error('❌ useInventory.convertPurchaseToStock Error:', err);
            addToast('Error al procesar la compra.', 'error');
        }
    }, [currentUser, addToast]);

    /**
     * Descuenta los ingredientes de una receta del inventario (atómico).
     * Retorna array de deducciones efectivas. Lanza Error si hay fallo.
     */
    const deductBatch = useCallback(async (recipe, targetVolume, phases, ignoredIngredients = {}) => {
        const actuals = await _deductBatch(currentUser.uid, recipe, targetVolume, inventory, phases, ignoredIngredients);
        
        // Verificar si algún ítem cruzó el umbral
        if (actuals && Array.isArray(actuals)) {
            actuals.forEach(deduction => {
                const item = inventory.find(i => i.name === deduction.name && i.category === deduction.category);
                if (item) {
                    const threshold = item.minThreshold !== null ? item.minThreshold : (LOW_STOCK_THRESHOLDS[item.category]?.threshold || 0);
                    const before = Number(item.stock);
                    const after = before - deduction.actualDeducted;
                    if (after < threshold && before >= threshold) {
                        addToast(`Stock bajo: ${item.name} (${after.toFixed(2)} ${item.unit})`, 'warning');
                    }
                }
            });
        }
        return actuals;
    }, [currentUser.uid, inventory, addToast]);

    const toggleIngredient = useCallback(async (batchId, ingredient, isConsumed, targetVolume, recipeTargetVolume) => {
        try {
            const item = inventory.find(i => 
                i.category === ingredient.category && 
                (i.name || '').toLowerCase().trim().includes((ingredient.name || '').toLowerCase().trim())
            );
            
            const result = await _toggleIngredient(currentUser.uid, batchId, ingredient, isConsumed, targetVolume, recipeTargetVolume, inventory);
            
            // Alerta si es consumo y cruza umbral
            if (isConsumed && item) {
                const scaleFactor = (targetVolume || 1) / (recipeTargetVolume || 1);
                const amountToDeduct = ingredient.category === 'Lúpulo' || ingredient.category === 'Levadura'
                    ? Math.round((Number(ingredient.amount) || 0) * scaleFactor)
                    : Number(((Number(ingredient.amount) || 0) * scaleFactor).toFixed(4));
                
                const threshold = item.minThreshold !== null ? item.minThreshold : (LOW_STOCK_THRESHOLDS[item.category]?.threshold || 0);
                const before = Number(item.stock);
                const after = before - amountToDeduct;
                
                if (after < threshold && before >= threshold) {
                    addToast(`¡Atención! ${item.name} ha bajado de su umbral mínimo.`, 'warning');
                }
            }
            
            return result;
        } catch (err) {
            console.error('❌ useInventory.toggleIngredient Error:', err);
            addToast('Error al marcar ingrediente como consumido.', 'error');
            throw err;
        }
    }, [currentUser.uid, inventory, addToast]);



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
