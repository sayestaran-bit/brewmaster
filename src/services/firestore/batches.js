// /src/services/firestore/batches.js
//
// Capa de acceso a datos para Lotes Activos (Active Batches).
// Maneja el ciclo de vida de un batch: start → updateProgress → complete.

import {
    collection, doc, addDoc, updateDoc, deleteDoc,
    onSnapshot, query, orderBy, writeBatch, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { compactHistoryNotes, calculateEfficiency } from '../../utils/recipeUtils';

// ── Rutas ─────────────────────────────────────────────────────────────────────
const batchesRef = (uid) =>
    collection(db, 'users', uid, 'activeBatches');

const batchDocRef = (uid, batchId) =>
    doc(db, 'users', uid, 'activeBatches', batchId);

const historyRef = (uid) =>
    collection(db, 'users', uid, 'history');

// ── Suscripción en tiempo real ─────────────────────────────────────────────────
/**
 * @param {string} uid
 * @param {function} onData  - callback(batches: ActiveBatch[])
 * @param {function} onError
 * @returns {function} unsubscribe
 */
export function onBatchesSnapshot(uid, onData, onError) {
    if (!uid) return () => { };
    const q = query(batchesRef(uid), orderBy('startDate', 'desc'));
    return onSnapshot(
        q,
        (snap) => onData(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
        onError
    );
}

// ── CRUD ───────────────────────────────────────────────────────────────────────
/**
 * Inicia un nuevo lote de elaboración.
 * @param {string} uid
 * @param {object} batchData - { recipeId, recipeName, category, volume, costSnapshot, ... }
 * @returns {Promise<string>} id del batch creado
 */
export async function startBatch(uid, batchData) {
    const ref = await addDoc(batchesRef(uid), {
        currentStep: 0,
        completedSteps: [],
        status: 'brewing',
        phase: 'cooking', // default
        phaseTimestamps: {
            cookingStart: serverTimestamp(),
            fermentationStart: null,
            bottlingStart: null
        },
        startDate: serverTimestamp(),
        ...batchData, // Sobre-escribe los defaults si el frontend provee la fase y status
    });
    return ref.id;
}

/**
 * Transiciona el lote a la siguiente fase productiva.
 * @param {string} uid 
 * @param {string} batchId 
 * @param {string} nextPhase - 'fermenting' | 'bottling'
 */
export async function transitionBatchPhase(uid, batchId, nextPhase) {
    const updateData = { phase: nextPhase };
    if (nextPhase === 'fermenting') {
        updateData['phaseTimestamps.fermentationStart'] = serverTimestamp();
    } else if (nextPhase === 'bottling') {
        updateData['phaseTimestamps.bottlingStart'] = serverTimestamp();
    }
    await updateDoc(batchDocRef(uid, batchId), updateData);
}

/**
 * Avanza el paso actual del lote.
 * @param {string} uid
 * @param {string} batchId
 * @param {number} newStep
 * @param {number[]} completedSteps
 */
export async function updateBatchProgress(uid, batchId, newStep, completedSteps) {
    await updateDoc(batchDocRef(uid, batchId), {
        currentStep: newStep,
        completedSteps,
    });
}

/**
 * Actualiza parcialmente cualquier campo de un lote activo.
 * @param {string} uid
 * @param {string} batchId
 * @param {object} fields
 */
export async function updateBatchField(uid, batchId, fields) {
    await updateDoc(batchDocRef(uid, batchId), fields);
}

/**
 * Completa un lote: ELIMINA el batch activo y CREA una entrada de historial
 * en una sola operación atómica (writeBatch).
 * Registra tanto brewDate como bottlingDate.
 *
 * @param {string} uid
 * @param {string} batchId
 * @param {object} historyEntry - datos para el registro histórico
 *   { recipeId, recipeName, category, volume, abv, og, fg,
 *     brewDate (string DD/MM/YYYY), bottlingDate (string DD/MM/YYYY),
 *     totalCost, costPerLiter, ingredientsCost[] }
 */
export async function completeBatch(uid, batchId, historyEntry) {
    const batch = writeBatch(db);

    // 1. Eliminar el batch activo
    batch.delete(batchDocRef(uid, batchId));

    // Sanitización: eliminar campos redundantes de sesión activa (bloat)
    const { 
        timer, 
        currentStep, 
        completedSteps, 
        deductedHops, 
        phaseTimestamps,
        ...sanitizedEntry 
    } = historyEntry;

    // 2. Agregar entrada al historial
    const historyDocRef = doc(historyRef(uid));
    
    // Asegurar eficiencia y volumen final si no vienen (calculado post-cocción)
    const finalVolume = Number(sanitizedEntry.finalVolume || sanitizedEntry.targetVolume || sanitizedEntry.volume || 0);
    const efficiency = Number(sanitizedEntry.efficiency || (sanitizedEntry.og ? calculateEfficiency(sanitizedEntry.og, finalVolume, sanitizedEntry.ingredients?.malts || []) : 0));

    // Compactar notas de historial si existen
    if (sanitizedEntry.notes) {
        sanitizedEntry.notes = compactHistoryNotes(sanitizedEntry.notes, null, 1500);
    }
    if (sanitizedEntry.historyNotes) {
        sanitizedEntry.historyNotes = compactHistoryNotes(sanitizedEntry.historyNotes, null, 1500);
    }

    batch.set(historyDocRef, {
        ...sanitizedEntry,
        finalVolume,
        efficiency,
        tasting: sanitizedEntry.tasting || null,
        timestamp: Date.now(),
        createdAt: serverTimestamp(),
    });

    await batch.commit();
    return historyDocRef.id;
}

/**
 * Elimina un lote activo (descartado sin completar) y lo manda a historial.
 */
export async function discardBatch(uid, batchId, historyEntry) {
    const batch = writeBatch(db);

    batch.delete(batchDocRef(uid, batchId));

    if (historyEntry) {
        // Sanitización para abandonos
        const { timer, currentStep, completedSteps, deductedHops, ...sanitizedEntry } = historyEntry;
        
        const historyDocRef = doc(historyRef(uid));
        batch.set(historyDocRef, {
            ...sanitizedEntry,
            tasting: null,
            timestamp: Date.now(),
            createdAt: serverTimestamp(),
        });
    }

    await batch.commit();
}
