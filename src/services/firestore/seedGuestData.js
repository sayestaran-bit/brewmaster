// /src/services/firestore/seedGuestData.js
import { collection, doc, getDocs, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { initialRecipes, initialInventory } from '../../utils/helpers';

// Bloqueo de módulo para evitar ejecuciones concurrentes en la misma sesión de JS
let isSeeding = false;

/**
 * Inyecta datos de prueba (receta y stock) para el Guest Mode.
 * Utiliza Batches de Firestore para atomicidad y IDs determinísticos para IDEMPOTENCIA.
 * @param {string} uid - El ID del usuario anónimo
 */
export async function seedGuestData(uid) {
    if (!uid) return;
    if (isSeeding) {
        console.warn("🌱 [Seed] Ya hay un proceso de seeding en curso. Omitiendo...");
        return;
    }

    isSeeding = true;
    try {
        console.log("🌱 [Seed] Iniciando saneamiento e inyección atómica para Guest:", uid);

        const recipesRef = collection(db, 'users', uid, 'recipes');
        const inventoryRef = collection(db, 'users', uid, 'inventory');
        const timestamp = serverTimestamp();

        // 1. OBTENER ESTADO ACTUAL
        const [invSnap, recSnap] = await Promise.all([
            getDocs(inventoryRef),
            getDocs(recipesRef)
        ]);

        const batch = writeBatch(db);
        let operationsCount = 0;

        // 2. LIMPIEZA DE HUÉRFANOS (Estrategia agresiva de deduplicación)
        const stableInvIds = new Set(initialInventory.map(i => i.id));
        const baseInvNames = new Set(initialInventory.map(i => i.name.toLowerCase().trim()));

        invSnap.docs.forEach(docSnap => {
            const data = docSnap.data();
            const lowerName = (data.name || '').toLowerCase().trim();
            // Si el nombre coincide con uno base pero el ID es aleatorio (no está en helpers), borrar
            if (baseInvNames.has(lowerName) && !stableInvIds.has(docSnap.id)) {
                batch.delete(docSnap.ref);
                operationsCount++;
            }
        });

        const stableRecIds = new Set(initialRecipes.map(r => r.id));
        const baseRecNames = new Set(initialRecipes.map(r => r.name.toLowerCase().trim()));

        recSnap.docs.forEach(docSnap => {
            const data = docSnap.data();
            const lowerName = (data.name || '').toLowerCase().trim();
            if (baseRecNames.has(lowerName) && !stableRecIds.has(docSnap.id)) {
                batch.delete(docSnap.ref);
                operationsCount++;
            }
        });

        // 3. INYECCIÓN IDEMPOTENTE (Usando IDs determinísticos)
        // Sembramos TODO el catálogo para evitar "huecos" que generen duplicados luego
        initialInventory.forEach(item => {
            const { id, ...itemData } = item;
            const itemRef = doc(db, 'users', uid, 'inventory', id);
            batch.set(itemRef, {
                ...itemData,
                updatedAt: timestamp
            });
            operationsCount++;
        });

        initialRecipes.forEach(recipe => {
            const { id, ...recipeData } = recipe;
            const recipeRef = doc(db, 'users', uid, 'recipes', id);
            batch.set(recipeRef, {
                ...recipeData,
                createdAt: timestamp,
                updatedAt: timestamp
            });
            operationsCount++;
        });

        // 4. EJECUCIÓN ATÓMICA
        if (operationsCount > 0) {
            await batch.commit();
            console.log(`🌱 [Seed] Éxito: ${operationsCount} operaciones atómicas completadas.`);
        } else {
            console.log("🌱 [Seed] Todo en orden. No se requirieron cambios.");
        }

    } catch (error) {
        console.error("❌ [Seed] Error crítico en seeding:", error);
        throw error;
    } finally {
        isSeeding = false;
    }
}
