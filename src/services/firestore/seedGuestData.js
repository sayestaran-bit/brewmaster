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
            category: "Lager",
            description: "Una receta de prueba ideal para aprender a usar BrewMaster. Esta Lager checa es cristalina, refrescante y con un toque floral inconfundible. Explora las fases de cocción, fermentación y embotellado paso a paso.",
            targetVolume: 20,
            og: 1.048,
            fg: 1.010,
            abv: 5.0,
            ibu: 25,
            colorSRM: 4,
            waterProfile: { Ca: 50, Mg: 5, SO4: 50, Cl: 50, HCO3: 20 },
            ingredients: {
                malts: [
                    { name: 'Malta Pilsner', amount: 4.5, unit: 'kg' },
                    { name: 'Malta Carapils', amount: 0.2, unit: 'kg' }
                ],
                hops: [
                    { name: 'Saaz', amount: 30, time: '60 min', stage: 'Hervor', unit: 'g', phase: 'cooking' },
                    { name: 'Hallertau Mittelfruh', amount: 15, time: '15 min', stage: 'Hervor', unit: 'g', phase: 'cooking' }
                ],
                others: [
                    { name: 'Irish Moss', amount: 5, unit: 'g', category: 'Aditivos', phase: 'cooking' }
                ],
                yeast: { name: 'Levadura Lager W-34/70', amount: 2, unit: 'sobres' },
                water: { strike: 18, sparge: 14 }
            },
            steps: [
                { id: 1, phase: 'cooking', title: "Escalón Proteico", desc: "52°C por 15 min. Mejora la formación de espuma.", details: "1. Inicia la maceración a 52°C.\n2. Este paso es opcional pero ayuda a la retención de espuma en maltas menos modificadas.", duration: 15 },
                { id: 2, phase: 'cooking', title: "Sacarificación", desc: "64°C por 45 min. Mosto muy fermentable.", details: "1. Sube la temperatura a 64°C.\n2. Esta temperatura baja favorece la creación de azúcares simples para una cerveza seca (crispy).", duration: 45 },
                { id: 3, phase: 'cooking', title: "Mash-Out", desc: "76°C por 10 min. Detener enzimas.", details: "1. Sube a 76°C.\n2. Ayuda a que el lavado sea más eficiente.", duration: 10 },
                { id: 4, phase: 'cooking', title: "Hervor y Esterilización", desc: "Hervir 90 min. Evaporación de DMS.", details: "1. Manten el hervor destapado por 90 minutos.\n2. Agrega el lúpulo Saaz al inicio del hervor.", duration: 90 },
                { id: 5, phase: 'cooking', title: "Adición de Aroma", desc: "Hallertau Mittelfruh a los 15 min finales.", details: "1. Agrega el lúpulo de aroma y el Irish Moss.\n2. Inicia el enfriado rápidamente después de apagar el fuego.", duration: 15 },
                { id: 6, phase: 'fermenting', title: "Fermentación Primaria", desc: "Inocular a 10°C con doble levadura.", details: "1. Enfría el mosto a 10°C.\n2. Inocula 2 sobres de W-34/70. Mantén la temperatura estable entre 10-12°C.", duration: 168 },
                { id: 7, phase: 'fermenting', title: "Descanso de Diacetilo", desc: "Subir a 16°C por 3 días.", details: "1. Sube la temperatura cuando queden pocos puntos para la densidad final.\n2. Limpia sabores indeseados a mantequilla.", duration: 72 },
                { id: 8, phase: 'bottling', title: "Lagering y Maduración", desc: "Enfriar a 1-2°C por 4 semanas.", details: "1. Baja la temperatura gradualmente.\n2. La cerveza se volverá cristalina y los sabores se redondearán.", duration: 60 },
                { id: 9, phase: 'bottling', title: "Envasado", desc: "Carbonatación media-baja.", details: "1. Embotella con 6g de azúcar por litro.\n2. Disfruta de tu primera Lager profesional.", duration: 40 }
            ],
            tips: [
                { title: 'Agua Blanda', desc: 'Las Lagers checas brillan con agua baja en minerales. Usa agua purificada si la de tu zona es muy dura.' },
                { title: 'Paciencia es Clave', desc: 'El Lagering (maduración en frío) no es negociable para obtener esa sensación limpia en boca.' }
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
