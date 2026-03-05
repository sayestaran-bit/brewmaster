// /src/services/firestore/inventory.js
//
// Capa de acceso a datos para Inventario.
// Soporta las categorías actuales: Malta, Lúpulo, Levadura
// y las nuevas: Sales Minerales, Aditivos

import {
    collection, doc, addDoc, updateDoc, deleteDoc,
    onSnapshot, query, orderBy, runTransaction, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

// ── Rutas ─────────────────────────────────────────────────────────────────────
const inventoryRef = (uid) =>
    collection(db, 'brewmaster', 'users', uid, 'inventory');

const inventoryDocRef = (uid, itemId) =>
    doc(db, 'brewmaster', 'users', uid, 'inventory', itemId);

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
        (snap) => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
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
 * Si el stock de cualquier ítem es insuficiente, cancela TODO sin escribir nada.
 *
 * @param {string} uid
 * @param {object} recipe
 * @param {number} targetVolume
 * @param {Array}  currentInventory - array local del inventario (para lookup)
 * @returns {Promise<void>}
 * @throws Error si hay stock insuficiente
 */
export async function deductBatchFromInventory(uid, recipe, targetVolume, currentInventory) {
    const scaleFactor = (targetVolume || 1) / (recipe.targetVolume || 1);
    const searchItem = (name, category) => {
        const searchName = (name || '').toLowerCase().trim();
        return currentInventory.find(i =>
            i.category === category &&
            (i.name || '').toLowerCase().trim().includes(searchName)
        );
    };

    // Preparar lista de (docRef, amount) a descontar
    const deductions = [];

    (recipe.ingredients?.malts || []).forEach(m => {
        const item = searchItem(m.name, 'Malta');
        if (item) deductions.push({ ref: inventoryDocRef(uid, item.id), amount: parseFloat(((Number(m.amount) || 0) * scaleFactor).toFixed(4)), current: Number(item.stock) });
    });
    (recipe.ingredients?.hops || []).forEach(h => {
        const item = searchItem(h.name, 'Lúpulo');
        if (item) deductions.push({ ref: inventoryDocRef(uid, item.id), amount: Math.round((Number(h.amount) || 0) * scaleFactor), current: Number(item.stock) });
    });
    const yeastObj = recipe.ingredients?.yeast;
    if (yeastObj) {
        const name = typeof yeastObj === 'string' ? yeastObj : (yeastObj.name || '');
        const amount = typeof yeastObj === 'string' ? 1 : (Number(yeastObj.amount) || 1);
        const item = searchItem(name, 'Levadura');
        if (item) deductions.push({ ref: inventoryDocRef(uid, item.id), amount, current: Number(item.stock) });
    }

    // Validar antes de la transacción
    const shortages = deductions.filter(d => d.current < d.amount);
    if (shortages.length > 0) {
        throw new Error(`Stock insuficiente para ${shortages.length} insumo(s)`);
    }

    await runTransaction(db, async (transaction) => {
        for (const d of deductions) {
            const snap = await transaction.get(d.ref);
            if (!snap.exists()) continue;
            const newStock = Math.max(0, Number(snap.data().stock) - d.amount);
            transaction.update(d.ref, { stock: parseFloat(newStock.toFixed(4)), updatedAt: serverTimestamp() });
        }
    });
}
