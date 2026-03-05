// /src/services/firestoreService.js
// Capa centralizada de acceso a Firestore.
// Todas las funciones usan async/await con manejo de errores estricto.

import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, collectionPrefix } from './firebase';

/**
 * Construye la referencia al documento principal de datos del usuario.
 *
 * @param {string} userId - El UID del usuario autenticado
 * @returns {import('firebase/firestore').DocumentReference}
 * @throws {Error} Si userId es inválido
 */
export function getUserDataRef(userId) {
    if (!userId || typeof userId !== 'string') {
        throw new Error('firestoreService: userId es requerido y debe ser un string válido.');
    }
    return doc(db, 'artifacts', collectionPrefix, 'users', userId, 'brewery', 'mainData');
}

/**
 * Guarda (merge) datos del usuario en Firestore.
 *
 * @param {string} userId - El UID del usuario
 * @param {object} data - Los datos a guardar (se hace merge, no overwrite)
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function saveUserData(userId, data) {
    try {
        const docRef = getUserDataRef(userId);
        await setDoc(docRef, data, { merge: true });
        return { success: true };
    } catch (err) {
        console.error('❌ firestoreService.saveUserData Error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Inicializa un documento de datos vacío para un nuevo usuario.
 *
 * @param {string} userId - El UID del usuario
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function initializeUserData(userId) {
    const emptyData = {
        recipes: [],
        inventory: [],
        history: [],
        activeBatches: [],
    };
    return await saveUserData(userId, emptyData);
}

/**
 * Se suscribe a cambios en tiempo real del documento del usuario.
 * Retorna la función de unsuscripción para limpiar en useEffect.
 *
 * @param {string} userId - El UID del usuario
 * @param {function} onData - Callback con los datos cuando cambian: (data) => void
 * @param {function} onError - Callback de error: (error) => void
 * @returns {function} - Función para cancelar la suscripción (unsubscribe)
 */
export function subscribeToUserData(userId, onData, onError) {
    try {
        const docRef = getUserDataRef(userId);

        const unsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    onData({
                        recipes: Array.isArray(data.recipes) ? data.recipes : [],
                        inventory: Array.isArray(data.inventory) ? data.inventory : [],
                        history: Array.isArray(data.history) ? data.history : [],
                        activeBatches: Array.isArray(data.activeBatches) ? data.activeBatches : [],
                    });
                } else {
                    // Documento no existe: inicializar y notificar datos vacíos
                    initializeUserData(userId);
                    onData({
                        recipes: [],
                        inventory: [],
                        history: [],
                        activeBatches: [],
                    });
                }
            },
            (error) => {
                console.error('❌ firestoreService.subscribeToUserData Error:', error.message);
                if (onError) onError(error);
            }
        );

        return unsubscribe;

    } catch (err) {
        console.error('❌ firestoreService.subscribeToUserData setup Error:', err.message);
        if (onError) onError(err);
        // Retornar un noop en caso de fallo para que useEffect no falle
        return () => { };
    }
}
