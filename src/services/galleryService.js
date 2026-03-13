/**
 * /src/services/galleryService.js
 * 
 * Servicio para la Galería Pública de Recetas y Clonación.
 */

import { 
    collection, doc, addDoc, getDoc, getDocs, query, where, 
    serverTimestamp, limit, writeBatch 
} from 'firebase/firestore';
import { db } from './firebase';
import { addRecipe } from './firestore/recipes';

const publicRecipesRef = collection(db, 'publicRecipes');

/**
 * Obtiene recetas públicas de la galería.
 */
export async function getPublicRecipes(max = 20) {
    const q = query(publicRecipesRef, limit(max));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

/**
 * Clona una receta de la galería pública a la biblioteca privada del usuario.
 * @param {string} uid - ID del usuario actual.
 * @param {Object} publicRecipe - El objeto de la receta pública a clonar.
 */
export async function clonePublicRecipe(uid, publicRecipe) {
    if (!uid || !publicRecipe) throw new Error("Missing UID or Recipe");

    // Preparamos la copia
    const { 
        id, isPublic, author, authorUid, createdAt, updatedAt, ...cleanRecipe 
    } = publicRecipe;

    const newRecipe = {
        ...cleanRecipe,
        name: `${cleanRecipe.name} (Clon)`,
        isBase: false, // Las clonadas no son base por defecto
        sourceInfo: {
            originalAuthor: author || 'Desconocido',
            clonedAt: Date.now()
        }
    };

    return await addRecipe(uid, newRecipe);
}

/**
 * Establece si una receta es pública o no.
 */
export async function toggleRecipePublicStatus(uid, recipeId, isPublic, recipeData) {
    const batch = writeBatch(db);
    
    // 1. Actualizar la receta privada
    const privateRef = doc(db, 'users', uid, 'recipes', recipeId);
    batch.update(privateRef, { isPublic, updatedAt: serverTimestamp() });

    // 2. Gestionar la colección espejo
    const publicRef = doc(db, 'publicRecipes', recipeId);
    
    if (isPublic) {
        batch.set(publicRef, {
            ...recipeData,
            id: recipeId,
            authorUid: uid,
            isPublic: true,
            updatedAt: serverTimestamp()
        });
    } else {
        batch.delete(publicRef);
    }

    await batch.commit();
}
