import { collection, addDoc, serverTimestamp, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Inyecta datos de prueba (receta y stock) para el Guest Mode.
 * @param {string} uid - El ID del usuario anónimo
 */
export async function seedGuestData(uid) {
    if (!uid) return;

    try {
        // Verificar si ya tiene recetas para no duplicar
        const recipesRefCheck = collection(db, 'users', uid, 'recipes');
        const q = query(recipesRefCheck, limit(1));
        const snap = await getDocs(q);

        if (!snap.empty) {
            console.log("🌱 [Seed] El usuario ya tiene datos. Omitiendo seed.");
            return;
        }

        console.log("🌱 [Seed] Iniciando inyección de datos para Guest:", uid);

        const timestamp = serverTimestamp();

        // 1. Inyectar Inventario Base
        const inventoryRef = collection(db, 'users', uid, 'inventory');
        const defaultItems = [
            { category: 'Malta', name: 'Malta Pilsner', stock: 10, unit: 'kg', price: 2000 },
            { category: 'Malta', name: 'Malta Carapils', stock: 2, unit: 'kg', price: 2500 },
            { category: 'Lúpulo', name: 'Saaz', stock: 500, unit: 'g', price: 50 },
            { category: 'Lúpulo', name: 'Hallertau Mittelfruh', stock: 200, unit: 'g', price: 60 },
            { category: 'Aditivos', name: 'Irish Moss', stock: 100, unit: 'g', price: 20 },
            { category: 'Levadura', name: 'Levadura Lager W-34/70', stock: 5, unit: 'sobre', price: 4000 }
        ];

        for (const item of defaultItems) {
            await addDoc(inventoryRef, {
                ...item,
                updatedAt: timestamp
            });
        }
        console.log("🌱 [Seed] Inventario inyectado.");

        // 2. Inyectar Receta Lager Base
        const recipesRef = collection(db, 'users', uid, 'recipes');
        const lagerRecipe = {
            name: "Lager de Prueba (Guest)",
            category: "Lager Clásica",
            description: "Una receta de prueba ideal para aprender a usar BrewMaster. Explora las fases de cocción, fermentación y embotellado sin riesgos.",
            targetVolume: 20,
            og: 1.045,
            fg: 1.010,
            abv: 4.5,
            ibu: 20,
            colorSRM: 4,
            waterProfile: { Ca: 50, Mg: 10, SO4: 50, Cl: 50, HCO3: 50 },
            ingredients: {
                malts: [
                    { name: 'Malta Pilsner', amount: 4, unit: 'kg' },
                    { name: 'Malta Carapils', amount: 0.2, unit: 'kg' }
                ],
                hops: [
                    { name: 'Saaz', amount: 30, time: '60', use: 'Hervor', unit: 'g', phase: 'cooking' },
                    { name: 'Hallertau Mittelfruh', amount: 15, time: '15', use: 'Hervor', unit: 'g', phase: 'cooking' }
                ],
                others: [
                    { name: 'Irish Moss', amount: 5, unit: 'g', category: 'Aditivos', phase: 'cooking' }
                ],
                yeast: { name: 'Levadura Lager W-34/70', amount: 1, unit: 'sobre' },
                water: { strike: 15, sparge: 15 }
            },
            steps: [
                { id: 1, title: 'Maceración', desc: 'Maceración simple', details: 'Remojo a 65C por 60 min', duration: '60', phase: 'cooking' },
                { id: 2, title: 'Hervor', desc: 'Adiciones de lúpulo', details: 'Hervir 60 min, Saaz min 60, Hallertau min 15', duration: '60', phase: 'cooking' },
                { id: 3, title: 'Fermentación', desc: 'Fermentación primaria', details: 'Fermentar a 12C por 14 días', duration: '14D', phase: 'fermenting' },
                { id: 4, title: 'Maduración', desc: 'Lagering en frío', details: 'DCA y bajar a 2C por 21 días', duration: '21D', phase: 'bottling' }
            ],
            tips: [
                { title: 'Control de Temperatura', desc: 'Mantén la temperatura baja para evitar esteres indeseados.' }
            ],
            modifications: [],
            createdAt: timestamp,
            updatedAt: timestamp
        };

        await addDoc(recipesRef, lagerRecipe);
        console.log("🌱 [Seed] Receta inyectada con éxito.");

    } catch (error) {
        console.error("❌ [Seed] Error inyectando datos:", error);
    }
}
