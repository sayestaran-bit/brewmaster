// /src/components/layout/DataMigrator.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, setDoc, writeBatch, collection } from 'firebase/firestore';
import { db, collectionPrefix } from '../../services/firebase';
import { Loader2 } from 'lucide-react';

export default function DataMigrator({ children }) {
    const { currentUser } = useAuth();
    const [isMigrating, setIsMigrating] = useState(false);
    const [hasMigratedLocal, setHasMigratedLocal] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!currentUser || hasMigratedLocal) return;

        const checkAndMigrate = async () => {
            try {
                const mainDataRef = doc(db, 'artifacts', collectionPrefix, 'users', currentUser.uid, 'brewery', 'mainData');
                const snap = await getDoc(mainDataRef);

                if (!snap.exists() || snap.data().migrated) {
                    setHasMigratedLocal(true);
                    return;
                }

                setIsMigrating(true);
                const data = snap.data();

                // Procesar migración
                console.log('Iniciando migración de datos a subcolecciones...');

                // Nota: Firestore limit de batch is 500 ops.
                const operations = []; // array of { type: 'set', ref, data }

                const processArray = (arr, collectionName) => {
                    if (!Array.isArray(arr)) return;
                    arr.forEach(item => {
                        // usamos el id original, o generamos uno si no tiene (aunque deberían tener)
                        const id = item.id || crypto.randomUUID();
                        const colRef = collection(db, 'brewmaster', 'users', currentUser.uid, collectionName);
                        const docRef = doc(colRef, id);
                        operations.push({ ref: docRef, data: item });
                    });
                };

                processArray(data.recipes, 'recipes');
                processArray(data.inventory, 'inventory');
                processArray(data.history, 'history');
                processArray(data.activeBatches, 'activeBatches');

                // Enviar batches
                const maxBatchOps = 490;
                for (let i = 0; i < operations.length; i += maxBatchOps) {
                    const batch = writeBatch(db);
                    const chunk = operations.slice(i, i + maxBatchOps);
                    chunk.forEach(op => batch.set(op.ref, op.data));
                    await batch.commit();
                }

                // Marcar como migrado
                await setDoc(mainDataRef, { migrated: true }, { merge: true });
                console.log('Migración completada exitosamente.');
                setHasMigratedLocal(true);
            } catch (err) {
                console.error('Error durante la migración:', err);
                setError(err.message);
            } finally {
                setIsMigrating(false);
            }
        };

        checkAndMigrate();
    }, [currentUser, hasMigratedLocal]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center text-red-500 bg-red-50 dark:bg-red-950/20">
                <h2 className="text-2xl font-bold mb-4">Error de Migración</h2>
                <p>{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    if (isMigrating) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
                <Loader2 className="w-12 h-12 animate-spin text-amber-500 mb-4" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                    Actualizando arquitectura de la base de datos...
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md text-center">
                    Estamos moviendo tus datos de manera segura a la nueva estructura para que la aplicación sea más rápida. Esto tomará solo unos segundos.
                </p>
            </div>
        );
    }

    return hasMigratedLocal ? children : null;
}
