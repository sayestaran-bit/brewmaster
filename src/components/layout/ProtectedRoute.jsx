// /src/components/layout/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { Beaker } from 'lucide-react';

export default function ProtectedRoute({ children }) {
    const { currentUser, isAuthLoading } = useAuth();
    const { isDataLoaded } = useAppContext();

    // Si Firebase Auth aún está determinando la sesión
    if (isAuthLoading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center font-sans">
                <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col items-center">
                    <Beaker size={64} className="text-amber-500 animate-bounce mb-4" />
                    <h2 className="text-2xl font-black text-white">Verificando Sesión...</h2>
                    <p className="text-slate-400 font-medium">BrewMaster</p>
                </div>
            </div>
        );
    }

    // Si no hay usuario, enviar al login
    if (!currentUser) {
        return <Navigate to="/auth" replace />;
    }

    // Si hay usuario pero Firestore aún no carga los artefactos
    if (!isDataLoaded) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center font-sans">
                <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col items-center">
                    <Beaker size={64} className="text-amber-500 animate-pulse mb-4" />
                    <h2 className="text-2xl font-black text-white">Cargando Cervecería...</h2>
                    <p className="text-slate-400 font-medium">Sincronizando con Firestore</p>
                </div>
            </div>
        );
    }

    // Si todo está bien, renderizar el componente hijo (que será el Outlet / vistas)
    return children;
}
