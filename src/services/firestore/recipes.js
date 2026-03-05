// /src/services/firestore/recipes.js
//
// Capa de acceso a datos para Recetas.
// Abstrae toda la lógica de Firestore para que los componentes
// no necesiten saber NADA sobre la estructura de la base de datos.

import {
    collection, doc, addDoc, updateDoc, deleteDoc,
    onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

// ── Ruta de la colección de recetas de un usuario ─────────────────────────────
const recipesRef = (uid) =>
    collection(db, 'users', uid, 'recipes');

const recipeDocRef = (uid, recipeId) =>
    doc(db, 'users', uid, 'recipes', recipeId);

// ── Suscripción en tiempo real ─────────────────────────────────────────────────
/**
 * Se suscribe a la colección de recetas del usuario en tiempo real.
 * @param {string} uid - Firebase Auth UID
 * @param {function} onData  - callback(recipes: Recipe[]) cuando hay datos nuevos
 * @param {function} onError - callback(error) en caso de error
 * @returns {function} unsubscribe — llamar para cancelar la suscripción
 */
export function onRecipesSnapshot(uid, onData, onError) {
    if (!uid) return () => { };
    const q = query(recipesRef(uid), orderBy('createdAt', 'desc'));
    return onSnapshot(
        q,
        (snap) => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        onError
    );
}

// ── CRUD ───────────────────────────────────────────────────────────────────────
/**
 * Crea una nueva receta en Firestore.
 * @param {string} uid
 * @param {object} recipeData - datos de la receta sin id ni timestamps
 * @returns {Promise<string>} id del nuevo documento
 */
export async function addRecipe(uid, recipeData) {
    const ref = await addDoc(recipesRef(uid), {
        ...recipeData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
}

/**
 * Actualiza una receta existente (merge parcial).
 * @param {string} uid
 * @param {string} recipeId
 * @param {object} data - campos a actualizar
 */
export async function updateRecipe(uid, recipeId, data) {
    await updateDoc(recipeDocRef(uid, recipeId), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Elimina una receta de Firestore.
 * @param {string} uid
 * @param {string} recipeId
 */
export async function deleteRecipe(uid, recipeId) {
    await deleteDoc(recipeDocRef(uid, recipeId));
}
