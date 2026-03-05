// /src/services/firestore/history.js
//
// Capa de acceso a datos para el Historial de Producción.
// Diseñada para soportar paginación nativa cuando el historial crezca.

import {
    collection, doc, updateDoc, deleteDoc,
    onSnapshot, query, orderBy, limit, startAfter,
    getDocs, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

// ── Rutas ─────────────────────────────────────────────────────────────────────
const historyRef = (uid) =>
    collection(db, 'users', uid, 'history');

const historyDocRef = (uid, historyId) =>
    doc(db, 'users', uid, 'history', historyId);

// ── Suscripción en tiempo real (últimas N entradas) ────────────────────────────
/**
 * Escucha las últimas `pageSize` entradas del historial en tiempo real.
 * @param {string}   uid
 * @param {function} onData  - callback(entries: HistoryEntry[])
 * @param {function} onError
 * @param {number}   pageSize - cuántas entradas cargar (default: 50)
 * @returns {function} unsubscribe
 */
export function onHistorySnapshot(uid, onData, onError, pageSize = 50) {
    if (!uid) return () => { };
    const q = query(historyRef(uid), orderBy('timestamp', 'desc'), limit(pageSize));
    return onSnapshot(
        q,
        (snap) => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        onError
    );
}

// ── Paginación (carga bajo demanda) ───────────────────────────────────────────
/**
 * Carga una página de historial de forma paginada.
 * Útil para la vista de análisis histórico completo.
 *
 * @param {string} uid
 * @param {number} pageSize
 * @param {DocumentSnapshot|null} lastDoc - cursor de la página anterior (null para la primera)
 * @returns {Promise<{ entries: HistoryEntry[], lastDoc: DocumentSnapshot|null, hasMore: boolean }>}
 */
export async function getHistoryPage(uid, pageSize = 20, lastDoc = null) {
    let q = query(historyRef(uid), orderBy('timestamp', 'desc'), limit(pageSize + 1));
    if (lastDoc) q = query(historyRef(uid), orderBy('timestamp', 'desc'), startAfter(lastDoc), limit(pageSize + 1));

    const snap = await getDocs(q);
    const docs = snap.docs;
    const hasMore = docs.length > pageSize;
    const entries = docs.slice(0, pageSize).map(d => ({ id: d.id, ...d.data() }));

    return {
        entries,
        lastDoc: entries.length > 0 ? docs[entries.length - 1] : null,
        hasMore,
    };
}

// ── Operaciones ────────────────────────────────────────────────────────────────
/**
 * Guarda la nota de cata de un lote histórico.
 * @param {string} uid
 * @param {string} historyId
 * @param {{ score: number, notes: string }} tasting
 */
export async function updateTasting(uid, historyId, tasting) {
    await updateDoc(historyDocRef(uid, historyId), {
        tasting,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Elimina una entrada del historial.
 */
export async function deleteHistoryEntry(uid, historyId) {
    await deleteDoc(historyDocRef(uid, historyId));
}
