import { collection, addDoc, serverTimestamp, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { initialRecipes, initialInventory } from '../../utils/helpers';

/**
 * Inyecta datos de prueba (receta y stock) para el Guest Mode.
 * Ahora utiliza los datos estandarizados de helpers.js para consistencia total.
 * @param {string} uid - El ID del usuario anónimo
 */
export async function seedGuestData(uid) {
    if (!uid) {
        console.error("🌱 [Seed] No UID provided for seeding.");
        return;
    }

    try {
        console.log("🌱 [Seed] Verificando datos existentes para Guest:", uid);

        // Verificar si ya tiene recetas para no duplicar
        const recipesRef = collection(db, 'users', uid, 'recipes');
        const inventoryRef = collection(db, 'users', uid, 'inventory');

        const q = query(recipesRef, limit(1));
        const snap = await getDocs(q);

        if (!snap.empty) {
            console.log("🌱 [Seed] El usuario ya tiene recetas. Omitiendo seed.");
            return;
        }

        console.log("🌱 [Seed] Iniciando inyección de datos oficiales...");

        const timestamp = serverTimestamp();

        // 1. Inyectar Inventario Base (Muestreo representativo)
        // Tomamos una selección de los items iniciales para que el usuario pueda empezar
        const itemsToSeed = initialInventory.slice(0, 15); // Primeros 15 items (Maltas, Lúpulos, Levas)

        let invCount = 0;
        for (const item of itemsToSeed) {
            const { id, ...itemData } = item; // Quitamos el id de helper para que Firestore genere uno nuevo
            await addDoc(inventoryRef, {
                ...itemData,
                updatedAt: timestamp
            });
            invCount++;
        }
        console.log(`🌱 [Seed] ${invCount} items de inventario inyectados.`);

        // 2. Inyectar Recetas Base (Las primeras 2: Hazy y Stout)
        const recipesToSeed = initialRecipes.slice(0, 2);

        let recCount = 0;
        for (const recipe of recipesToSeed) {
            const { id, ...recipeData } = recipe; // Quitamos ID estático
            await addDoc(recipesRef, {
                ...recipeData,
                createdAt: timestamp,
                updatedAt: timestamp
            });
            recCount++;
        }

        console.log(`🌱 [Seed] ${recCount} recetas inyectadas con éxito.`);
        console.log("🌱 [Seed] Proceso completado exitosamente.");

    } catch (error) {
        console.error("❌ [Seed] Error crítico inyectando datos:", error);
        throw error; // Lanzar para que AuthContext pueda manejarlo si es necesario
    }
}
