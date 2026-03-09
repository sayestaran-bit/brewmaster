// /src/services/firestore/inventory.js
//
// Capa de acceso a datos para Inventario.
// Soporta las categorías actuales: Malta, Lúpulo, Levadura
// y las nuevas: Sales Minerales, Aditivos

import {
    collection, doc, addDoc, updateDoc, deleteDoc,
    onSnapshot, query, orderBy, runTransaction, serverTimestamp, getDoc, getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { getIngredientKey } from '../../utils/recipeUtils';

// ── Rutas ─────────────────────────────────────────────────────────────────────
export const batchDocRef = (uid, batchId) =>
    doc(db, 'users', uid, 'activeBatches', batchId);
const inventoryRef = (uid) =>
    collection(db, 'users', uid, 'inventory');

const inventoryDocRef = (uid, itemId) =>
    doc(db, 'users', uid, 'inventory', itemId);

// ── Suscripción en tiempo real ─────────────────────────────────────────────────
/**
 * @param {string} uid
 * @param {function} onData  - callback(items: InventoryItem[])
 * @param {function} onError
 * @returns {function} unsubscribe
 */
export function onInventorySnapshot(uid, onData, onError) {
    if (!uid) return () => { };
    const q = query(inventoryRef(uid), orderBy('category'), orderBy('name'));
    return onSnapshot(
        q,
        (snap) => onData(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
        onError
    );
}

// ── CRUD ───────────────────────────────────────────────────────────────────────
/**
 * Agrega un ítem al inventario.
 * @param {string} uid
 * @param {object} itemData - { category, name, stock, unit, price }
 * @returns {Promise<string>} id del nuevo documento
 */
export async function addInventoryItem(uid, itemData) {
    const ref = await addDoc(inventoryRef(uid), {
        ...itemData,
        stock: Number(itemData.stock) || 0,
        price: Number(itemData.price) || 0,
        updatedAt: serverTimestamp(),
    });
    return ref.id;
}

/**
 * Actualiza un ítem del inventario.
 * @param {string} uid
 * @param {string} itemId
 * @param {object} data - campos a actualizar
 */
export async function updateInventoryItem(uid, itemId, data) {
    await updateDoc(inventoryDocRef(uid, itemId), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Elimina un ítem del inventario.
 */
export async function deleteInventoryItem(uid, itemId) {
    await deleteDoc(inventoryDocRef(uid, itemId));
}

/**
 * Descuenta los insumos de un batch de forma ATÓMICA usando runTransaction.
 * Ahora soporta deducciones por FASES (cooking, fermenting, bottling).
 * Si el stock de cualquier ítem es insuficiente, cancela TODO sin escribir nada.
 *
 * @param {string} uid
 * @param {object} recipe
 * @param {number} targetVolume
 * @param {Array}  currentInventory - array local del inventario (para lookup)
 * @param {Array}  phases - Fases a descontar ['cooking', 'fermenting', 'bottling']
 * @returns {Promise<void>}
 * @throws Error si hay stock insuficiente
 */
export async function deductBatchFromInventory(uid, recipe, targetVolume, currentInventory, phases = ['cooking', 'fermenting', 'bottling'], ignoredIngredients = {}) {
    const scaleFactor = (targetVolume || 1) / (recipe.targetVolume || 1);
    const searchItem = (name, category, stageOrTime = '') => {
        const searchName = (name || '').toLowerCase().trim();
        const normalizedStage = (stageOrTime || '').toLowerCase().trim();
        const key = getIngredientKey({ category, name: searchName, stage: normalizedStage });

        if (ignoredIngredients[key]) return null; // Skip if already consumed

        return currentInventory.find(i =>
            i.category === category &&
            (i.name || '').toLowerCase().trim().includes(searchName)
        );
    };

    // Preparar lista de (docRef, amount) a descontar
    const deductions = [];

    // FASE 1: Cocción (Maltas, Lúpulos de Hervido, Aditivos pre-fermentación)
    if (phases.includes('cooking')) {
        (recipe.ingredients?.malts || []).forEach(m => {
            const item = searchItem(m.name, 'Malta');
            if (item) deductions.push({ ref: inventoryDocRef(uid, item.id), amount: parseFloat(((Number(m.amount) || 0) * scaleFactor).toFixed(4)), current: Number(item.stock), name: item.name, category: item.category, price: Number(item.price) || 0 });
        });

        (recipe.ingredients?.hops || []).forEach(h => {
            const hPhase = h.phase || '';
            const stage = h.stage || h.time || '';
            const use = stage.toString().toLowerCase();
            const isCooking = hPhase === 'cooking' || (!hPhase && !use.includes('dry') && !use.includes('ferment'));
            if (isCooking) {
                const item = searchItem(h.name, 'Lúpulo', stage);
                if (item) deductions.push({ ref: inventoryDocRef(uid, item.id), amount: Math.round((Number(h.amount) || 0) * scaleFactor), current: Number(item.stock), name: item.name, category: item.category, price: Number(item.price) || 0 });
            }
        });

        (recipe.ingredients?.others || []).forEach(o => {
            const oPhase = o.phase || '';
            const stage = o.stage || o.time || '';
            const use = stage.toString().toLowerCase();
            const isCooking = oPhase === 'cooking' || (!oPhase && !use.includes('bottle') && !use.includes('embotella') && !use.includes('priming'));
            if (isCooking) {
                const item = searchItem(o.name, o.category || 'Aditivos', stage);
                if (item) deductions.push({ ref: inventoryDocRef(uid, item.id), amount: parseFloat(((Number(o.amount) || 0) * scaleFactor).toFixed(4)), current: Number(item.stock), name: item.name, category: item.category, price: Number(item.price) || 0 });
            }
        });
    }

    // FASE 2.A: Fermentación (Levadura) - Día 1
    if (phases.includes('fermenting_yeast')) {
        const yeastObj = recipe.ingredients?.yeast;
        if (yeastObj) {
            const name = typeof yeastObj === 'string' ? yeastObj : (yeastObj.name || '');
            const amount = typeof yeastObj === 'string' ? 1 : (Number(yeastObj.amount) || 1);
            const stage = typeof yeastObj === 'object' ? (yeastObj.stage || yeastObj.time || '') : '';
            const item = searchItem(name, 'Levadura', stage);
            if (item) deductions.push({ ref: inventoryDocRef(uid, item.id), amount, current: Number(item.stock), name: item.name, category: item.category, price: Number(item.price) || 0 });
        }
    }

    // FASE 2.B: Fermentación (Lúpulos Dry Hop y Aditivos) - Detonado manualmente al pisar el paso
    if (phases.includes('fermenting_hops')) {
        (recipe.ingredients?.hops || []).forEach(h => {
            const hPhase = h.phase || '';
            const stage = h.stage || h.time || '';
            const use = stage.toString().toLowerCase();
            const isFermenting = hPhase === 'fermenting' || (!hPhase && (use.includes('dry') || use.includes('ferment')));
            if (isFermenting) {
                const item = searchItem(h.name, 'Lúpulo', stage);
                if (item) deductions.push({ ref: inventoryDocRef(uid, item.id), amount: Math.round((Number(h.amount) || 0) * scaleFactor), current: Number(item.stock), name: item.name, category: item.category, price: Number(item.price) || 0 });
            }
        });

        (recipe.ingredients?.others || []).forEach(o => {
            const oPhase = o.phase || '';
            const stage = o.stage || o.time || '';
            const isFermenting = oPhase === 'fermenting';
            if (isFermenting) {
                const item = searchItem(o.name, o.category || 'Aditivos', stage);
                if (item) deductions.push({ ref: inventoryDocRef(uid, item.id), amount: parseFloat(((Number(o.amount) || 0) * scaleFactor).toFixed(4)), current: Number(item.stock), name: item.name, category: item.category, price: Number(item.price) || 0 });
            }
        });
    }

    // FASE 3: Embotellado (Aditivos post-fermentación / Priming)
    if (phases.includes('bottling')) {
        (recipe.ingredients?.others || []).forEach(o => {
            const oPhase = o.phase || '';
            const stage = o.stage || o.time || '';
            const use = stage.toString().toLowerCase();
            const isBottling = oPhase === 'bottling' || (!oPhase && (use.includes('bottle') || use.includes('embotella') || use.includes('priming')));
            if (isBottling) {
                const item = searchItem(o.name, o.category || 'Aditivos', stage);
                if (item) deductions.push({ ref: inventoryDocRef(uid, item.id), amount: parseFloat(((Number(o.amount) || 0) * scaleFactor).toFixed(4)), current: Number(item.stock), name: item.name, category: item.category, price: Number(item.price) || 0 });
            }
        });
    }

    // Validar antes de la transacción
    const shortages = deductions.filter(d => d.current < d.amount);
    if (shortages.length > 0) {
        console.warn(`[Inventario] Stock insuficiente para ${shortages.length} insumo(s). Se ajustarán a cero y se continuará el proceso.`);
    }

    return await runTransaction(db, async (transaction) => {
        // PASADA 1: Todas las lecturas primero
        const snapshots = new Map();
        for (const d of deductions) {
            const snap = await transaction.get(d.ref);
            if (snap.exists()) {
                const path = d.ref.path;
                if (snapshots.has(path)) {
                    // Si ya existe este documento en el mapa, sumamos la cantidad a descontar
                    const existing = snapshots.get(path);
                    existing.amountToDeduct += d.amount;
                } else {
                    snapshots.set(path, {
                        ref: d.ref,
                        docData: snap.data(),
                        amountToDeduct: d.amount,
                        name: d.name,
                        category: d.category,
                        price: d.price
                    });
                }
            }
        }

        const actuals = [];

        // PASADA 2: Todas las escrituras después
        for (const [path, data] of snapshots.entries()) {
            const currentStock = Number(data.docData.stock) || 0;
            const actualDeducted = Math.min(currentStock, data.amountToDeduct);
            const newStock = Math.max(0, currentStock - data.amountToDeduct);

            transaction.update(data.ref, { stock: parseFloat(newStock.toFixed(4)), updatedAt: serverTimestamp() });

            actuals.push({
                name: data.name,
                category: data.category,
                requested: data.amountToDeduct,
                actualDeducted: actualDeducted,
                cost: actualDeducted * data.price,
                isPartial: actualDeducted < data.amountToDeduct
            });
        }

        return actuals;
    });
}

/**
 * Toggles consumption of a single ingredient in real-time.
 */
export async function toggleIngredientConsumption(uid, batchId, ingredient, isConsumed, targetVolume, recipeTargetVolume, currentInventory = []) {
    const scaleFactor = (targetVolume || 1) / (recipeTargetVolume || 1);
    const amountToToggle = ingredient.category === 'Lúpulo' || ingredient.category === 'Levadura'
        ? Math.round((Number(ingredient.amount) || 0) * scaleFactor)
        : parseFloat(((Number(ingredient.amount) || 0) * scaleFactor).toFixed(4));

    const searchName = (ingredient.name || '').toLowerCase().trim();
    const batchRef = batchDocRef(uid, batchId);

    // Sanitize key (unified: Includes stage/time for uniqueness) using central utility
    const ingredientKey = getIngredientKey(ingredient);

    return await runTransaction(db, async (transaction) => {
        // 1. Get Batch
        const batchSnap = await transaction.get(batchRef);
        if (!batchSnap.exists()) throw new Error("Batch not found");
        const batchData = batchSnap.data();

        // 2. Find relevant inventory item from passed currentInventory
        const invItem = currentInventory.find(i =>
            i.category === (ingredient.category || 'Malta') &&
            (i.name || '').toLowerCase().trim().includes(searchName)
        );

        if (!invItem) throw new Error(`Stock item not found: ${ingredient.name}`);
        const invDocRef = doc(db, 'users', uid, 'inventory', invItem.id);
        const currentInvSnap = await transaction.get(invDocRef);
        const currentStock = Number(currentInvSnap.data().stock) || 0;

        const consumed = batchData.consumedIngredients || {};
        const currentCost = Number(batchData.totalCost) || 0;
        const itemPrice = Number(invItem.price) || 0;
        const toggleCost = amountToToggle * itemPrice;

        if (isConsumed) {
            // Deduct from stock
            const newStock = Math.max(0, currentStock - amountToToggle);
            transaction.update(invDocRef, { stock: parseFloat(newStock.toFixed(4)), updatedAt: serverTimestamp() });

            // Add to batch record
            transaction.update(batchRef, {
                [`consumedIngredients.${ingredientKey}`]: {
                    name: ingredient.name,
                    category: ingredient.category,
                    amount: amountToToggle,
                    cost: toggleCost,
                    timestamp: Date.now()
                },
                totalCost: Number((currentCost + toggleCost).toFixed(2))
            });
        } else {
            // Restore to stock
            const newStock = currentStock + amountToToggle;
            transaction.update(invDocRef, { stock: parseFloat(newStock.toFixed(4)), updatedAt: serverTimestamp() });

            // Remove from batch record
            const updatedConsumed = { ...consumed };
            delete updatedConsumed[ingredientKey];

            transaction.update(batchRef, {
                consumedIngredients: updatedConsumed,
                totalCost: Number(Math.max(0, currentCost - toggleCost).toFixed(2))
            });
        }
    });
}
