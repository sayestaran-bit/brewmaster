// /src/components/layout/AppLayout.jsx
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
    Beaker, RefreshCw, Cloud, Sun, Moon, LogOut, LayoutDashboard,
    TrendingUp, BookOpen, Hourglass, Package, History
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';

export default function AppLayout() {
    const { currentUser, logout } = useAuth();
    const {
        darkMode, setDarkMode, isSaving, forceSyncCloud, activeBatches
    } = useAppContext();

    return (
        <div className={darkMode ? 'dark' : ''}>
            <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans p-4 md:p-6 lg:p-10 selection:bg-amber-200 transition-colors duration-300">
                <div className="max-w-6xl mx-auto">

                    {/* HEADER GLOBAL REDISEÑADO */}
                    <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden border border-slate-700 gap-6">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>

                        {/* Título Izquierda */}
                        <div className="relative z-10 flex items-center gap-4 text-left w-full md:w-auto">
                            <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-4 rounded-2xl shadow-lg shrink-0">
                                <Beaker size={36} className="text-slate-900" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white mb-1">BrewMaster</h1>
                                <p className="text-slate-400 text-xs md:text-sm font-medium">Sistema operativo cervecero.</p>
                            </div>
                        </div>

                        {/* Controles Derecha */}
                        <div className="relative z-10 flex flex-col items-start md:items-end gap-4 w-full md:w-auto shrink-0">
                            <div className="flex flex-wrap items-center gap-2">
                                {currentUser && (
                                    <button onClick={forceSyncCloud} disabled={isSaving} title="Forzar Sincronización Manual" className="flex items-center gap-2 text-xs font-black bg-slate-800/80 hover:bg-slate-700 px-4 py-2.5 rounded-full border border-slate-600 backdrop-blur-sm transition-colors disabled:cursor-wait shadow-sm">
                                        {isSaving ? <><RefreshCw size={14} className="animate-spin text-amber-400" /><span className="text-amber-400">GUARDANDO...</span></> : <><Cloud size={14} className="text-emerald-400" /><span className="text-emerald-400">NUBE SINC.</span></>}
                                    </button>
                                )}

                                <button onClick={() => setDarkMode(!darkMode)} className="flex items-center justify-center w-10 h-10 bg-slate-800/80 hover:bg-slate-700 rounded-full border border-slate-600 backdrop-blur-sm transition-colors shadow-sm text-slate-300 hover:text-amber-300">
                                    {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                                </button>

                                {currentUser ? (
                                    <button onClick={logout} className="flex items-center gap-2 text-xs font-bold bg-red-900/30 hover:bg-red-900/50 text-red-300 px-4 py-2.5 rounded-full border border-red-800/50 backdrop-blur-sm transition-colors shadow-sm">
                                        <LogOut size={14} /> Salir ({currentUser.isAnonymous ? 'Invitado' : currentUser.email?.split('@')[0]})
                                    </button>
                                ) : null}
                            </div>

                            {currentUser && (
                                <NavLink to="/" end className={({ isActive }) => `bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl font-bold transition-all border border-white/10 backdrop-blur-md flex items-center gap-2 hover:scale-105 shadow-sm w-full md:w-auto justify-center ${isActive ? 'ring-2 ring-white/50' : ''}`}>
                                    <LayoutDashboard size={18} /> Dashboard
                                </NavLink>
                            )}
                        </div>
                    </div>

                    {/* Menú Principal Global - Solo visible si hay usuario autenticado */}
                    {currentUser && (
                        <div className="flex bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-x-auto mb-8">
                            <NavLink to="/" end className={({ isActive }) => `flex-1 min-w-[120px] py-4 font-black flex items-center justify-center gap-2 transition-colors ${isActive ? 'text-blue-500 border-b-4 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                <TrendingUp size={18} /> Métricas
                            </NavLink>
                            <NavLink to="/recipes" className={({ isActive }) => `flex-1 min-w-[120px] py-4 font-black flex items-center justify-center gap-2 transition-colors ${isActive ? 'text-amber-500 border-b-4 border-amber-500 bg-amber-50/50 dark:bg-amber-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                <BookOpen size={18} /> Mis Recetas
                            </NavLink>
                            <NavLink to="/active" className={({ isActive }) => `flex-1 min-w-[120px] py-4 font-black flex items-center justify-center gap-2 transition-colors ${isActive ? 'text-emerald-500 border-b-4 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                <Hourglass size={18} /> En Proceso
                                {(activeBatches?.length > 0) && <span className="bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] ml-1">{activeBatches.length}</span>}
                            </NavLink>
                            <NavLink to="/inventory" className={({ isActive }) => `flex-1 min-w-[120px] py-4 font-black flex items-center justify-center gap-2 transition-colors ${isActive ? 'text-blue-500 border-b-4 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                <Package size={18} /> Inventario
                            </NavLink>
                            <NavLink to="/history" className={({ isActive }) => `flex-1 min-w-[120px] py-4 font-black flex items-center justify-center gap-2 transition-colors ${isActive ? 'text-purple-500 border-b-4 border-purple-500 bg-purple-50/50 dark:bg-purple-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                <History size={18} /> Historial
                            </NavLink>
                        </div>
                    )}

                    {/* CONTENEDOR DE VISTAS (Outlet renderiza la ruta actual) */}
                    <main className="transition-all duration-300 ease-in-out">
                        <Outlet />
                    </main>

                </div>
            </div>
        </div>
    );
}
