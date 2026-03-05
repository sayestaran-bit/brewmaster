// /src/context/AppContext.jsx
// Contexto global de UI de la aplicación.
// (Los datos reales ahora se manejan a través de los custom hooks especializados)

import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
    // --- ESTADOS DE UI GLOBALES ---
    const [darkMode, setDarkMode] = useState(true);

    // --- EFECTO MODO OSCURO ---
    useEffect(() => {
        if (darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [darkMode]);

    // Valores a exportar
    const value = {
        darkMode, setDarkMode,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
