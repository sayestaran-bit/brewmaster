// /src/context/AppContext.jsx
// Contexto global de datos de la aplicación.
// Usa firestoreService.js para toda la persistencia de datos,
// con manejo de errores estricto y estado de error para la UI.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
    subscribeToUserData,
    saveUserData,
} from '../services/firestoreService';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
    const { currentUser } = useAuth();

    // --- ESTADOS GLOBALES DE DATOS ---
    const [recipes, setRecipes] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [history, setHistory] = useState([]);
    const [activeBatches, setActiveBatches] = useState([]);
    const [darkMode, setDarkMode] = useState(true);

    // --- ESTADOS DE UI ---
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [dataError, setDataError] = useState(null); // Error de Firestore para la UI

    // --- EFECTO MODO OSCURO ---
    useEffect(() => {
        if (darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [darkMode]);

    // --- SUSCRIPCIÓN A DATOS DE FIREBASE EN TIEMPO REAL ---
    useEffect(() => {
        if (!currentUser) {
            // Limpiar estado al cerrar sesión
            setRecipes([]);
            setInventory([]);
            setHistory([]);
            setActiveBatches([]);
            setDataError(null);
            setIsDataLoaded(true);
            return;
        }

        setIsDataLoaded(false);
        setDataError(null);

        const unsubscribe = subscribeToUserData(
            currentUser.uid,
            // onData: Firestore tiene nuevos datos
            (data) => {
                setRecipes(data.recipes);
                setInventory(data.inventory);
                setHistory(data.history);
                setActiveBatches(data.activeBatches);
                setIsDataLoaded(true);
            },
            // onError: Firestore tuvo un error
            (error) => {
                console.error('❌ AppContext: Error al obtener datos de Firestore:', error.message);
                setDataError('Error al conectar con la base de datos. Actualizando...');
                setIsDataLoaded(true);
            }
        );

        return () => unsubscribe();
    }, [currentUser]);

    // --- FUNCIÓN DE ACTUALIZACIÓN EN LA NUBE ---
    /**
     * Guarda datos parciales o totales en la nube (merge).
     * @param {object} newData - Datos a guardar
     * @returns {Promise<void>}
     */
    const updateCloudData = useCallback(async (newData) => {
        if (!currentUser) return;
        setIsSaving(true);
        setDataError(null);

        const { success, error } = await saveUserData(currentUser.uid, newData);

        if (!success) {
            setDataError(`Error al guardar: ${error}`);
        }

        // Mostrar indicador de guardado al menos 800ms para feedback visual
        setTimeout(() => setIsSaving(false), 800);
    }, [currentUser]);

    /**
     * Fuerza una sincronización completa del estado local hacia la nube.
     */
    const forceSyncCloud = useCallback(() => {
        return updateCloudData({ recipes, inventory, history, activeBatches });
    }, [updateCloudData, recipes, inventory, history, activeBatches]);

    // Valores a exportar
    const value = {
        recipes, setRecipes,
        inventory, setInventory,
        history, setHistory,
        activeBatches, setActiveBatches,
        darkMode, setDarkMode,
        isDataLoaded,
        isSaving,
        dataError,
        updateCloudData,
        forceSyncCloud,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
