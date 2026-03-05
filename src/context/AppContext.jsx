// /src/context/AppContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, collectionPrefix } from '../services/firebase';
import { useAuth } from './AuthContext';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
    const { currentUser } = useAuth();

    // --- ESTADOS GLOBALES ---
    const [recipes, setRecipes] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [history, setHistory] = useState([]);
    const [activeBatches, setActiveBatches] = useState([]);
    const [darkMode, setDarkMode] = useState(true);

    // UI States
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // --- EFECTO MODO OSCURO ---
    useEffect(() => {
        if (darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [darkMode]);

    // --- OBTENCIÓN DE DATOS DE FIREBASE ---
    useEffect(() => {
        if (!currentUser) {
            setRecipes([]);
            setInventory([]);
            setHistory([]);
            setActiveBatches([]);
            setIsDataLoaded(true);
            return;
        }

        const docRef = doc(db, 'artifacts', collectionPrefix, 'users', currentUser.uid, 'brewery', 'mainData');
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setRecipes(Array.isArray(data.recipes) ? data.recipes : []);
                setInventory(Array.isArray(data.inventory) ? data.inventory : []);
                setHistory(Array.isArray(data.history) ? data.history : []);
                setActiveBatches(Array.isArray(data.activeBatches) ? data.activeBatches : []);
            } else {
                // Inicializar datos vacíos para nuevo usuario
                // Note: initialRecipes y initialInventory se manejan a nivel vista si el usuario presiona "Actualizar Recetas Base" 
                // para no forzarlas en la base de datos de cada usuario nuevo automáticamente a menos que sea necesario.
                setDoc(docRef, { recipes: [], inventory: [], history: [], activeBatches: [] });
                setRecipes([]); setInventory([]); setHistory([]); setActiveBatches([]);
            }
            setIsDataLoaded(true);
        }, (error) => {
            console.error("Error al obtener datos de Firestore:", error);
            setIsDataLoaded(true);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // --- FUNCIÓN DE ACTUALIZACIÓN EN NUBE ---
    const updateCloudData = async (newData) => {
        if (!currentUser) return;
        setIsSaving(true);
        try {
            await setDoc(doc(db, 'artifacts', collectionPrefix, 'users', currentUser.uid, 'brewery', 'mainData'), newData, { merge: true });
        }
        catch (e) {
            console.error("Error guardando en la Nube:", e);
        }
        finally {
            setTimeout(() => setIsSaving(false), 800);
        }
    };

    const forceSyncCloud = () => updateCloudData({ recipes, inventory, history, activeBatches });

    // Valores a exportar
    const value = {
        recipes, setRecipes,
        inventory, setInventory,
        history, setHistory,
        activeBatches, setActiveBatches,
        darkMode, setDarkMode,
        isDataLoaded,
        isSaving,
        updateCloudData,
        forceSyncCloud
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
