// /src/components/layout/AppLayout.jsx
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
    Beaker, RefreshCw, Cloud, Sun, Moon, LogOut,
    LayoutDashboard, BookOpen, Flame, Package, History,
    BarChart2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';

const NAV_ITEMS = [
    { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, activeColor: 'text-amber-500  border-amber-500  bg-amber-50/50  dark:bg-amber-900/20' },
    { to: '/recipes', label: 'Recetas', Icon: BookOpen, activeColor: 'text-orange-500  border-orange-500  bg-orange-50/50  dark:bg-orange-900/20' },
    { to: '/active', label: 'Producción', Icon: Flame, activeColor: 'text-emerald-500 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20', badge: true },
    { to: '/inventory', label: 'Inventario', Icon: Package, activeColor: 'text-sky-500     border-sky-500     bg-sky-50/50     dark:bg-sky-900/20' },
    { to: '/history', label: 'Historial', Icon: History, activeColor: 'text-violet-500  border-violet-500  bg-violet-50/50  dark:bg-violet-900/20' },
];

const INACTIVE = 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800';

export default function AppLayout() {
    const { currentUser, logout } = useAuth();
    const { darkMode, setDarkMode, isSaving, forceSyncCloud, activeBatches } = useAppContext();

    const activeBatchCount = Array.isArray(activeBatches) ? activeBatches.length : 0;

    return (
        <div className={darkMode ? 'dark' : ''}>
            <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans
                            selection:bg-amber-200 transition-colors duration-300
                            /* bottom padding for mobile tab bar */
                            pb-24 md:pb-0
                            p-4 md:p-6 lg:p-10">
                <div className="max-w-6xl mx-auto">

                    {/* ── HEADER ────────────────────────────────── */}
                    <div className="bg-slate-900 text-white p-5 md:p-6 rounded-3xl shadow-xl mb-6 flex flex-col sm:flex-row justify-between items-center relative overflow-hidden border border-slate-700 gap-4">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse-slow pointer-events-none" />

                        {/* Logo */}
                        <div className="relative z-10 flex items-center gap-3 shrink-0">
                            <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-3 rounded-2xl shadow-lg">
                                <Beaker size={28} className="text-slate-900" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-none">BrewMaster</h1>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Sistema Cervecero</p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="relative z-10 flex items-center gap-2 flex-wrap justify-center">
                            {currentUser && (
                                <button
                                    onClick={forceSyncCloud}
                                    disabled={isSaving}
                                    title="Forzar Sincronización"
                                    className="flex items-center gap-1.5 text-[11px] font-black bg-slate-800/80 hover:bg-slate-700 px-3 py-2 rounded-full border border-slate-600 backdrop-blur-sm transition-colors disabled:cursor-wait shadow-sm"
                                >
                                    {isSaving
                                        ? <><RefreshCw size={12} className="animate-spin text-amber-400" /><span className="text-amber-400">GUARDANDO</span></>
                                        : <><Cloud size={12} className="text-emerald-400" /><span className="text-emerald-400 hidden sm:inline">SINCRONIZADO</span></>
                                    }
                                </button>
                            )}

                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className="flex items-center justify-center w-9 h-9 bg-slate-800/80 hover:bg-slate-700 rounded-full border border-slate-600 backdrop-blur-sm transition-colors shadow-sm text-slate-300 hover:text-amber-300"
                            >
                                {darkMode ? <Sun size={14} /> : <Moon size={14} />}
                            </button>

                            {currentUser && (
                                <button
                                    onClick={logout}
                                    className="flex items-center gap-1.5 text-[11px] font-bold bg-red-900/30 hover:bg-red-900/50 text-red-300 px-3 py-2 rounded-full border border-red-800/50 backdrop-blur-sm transition-colors shadow-sm"
                                >
                                    <LogOut size={12} /> Salir ({currentUser.isAnonymous ? 'Invitado' : currentUser.email?.split('@')[0]})
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── DESKTOP NAV BAR ───────────────────────── */}
                    {currentUser && (
                        <div className="hidden md:flex bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-x-auto mb-8">
                            {NAV_ITEMS.map(({ to, label, Icon, activeColor, badge }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    end={to === '/dashboard'}
                                    className={({ isActive }) =>
                                        `flex-1 min-w-[100px] py-3.5 font-black text-sm flex items-center justify-center gap-2 transition-all relative
                                        ${isActive ? `${activeColor} border-b-[3px]` : INACTIVE}`
                                    }
                                >
                                    <Icon size={17} /> {label}
                                    {badge && activeBatchCount > 0 && (
                                        <span className="bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black absolute top-2 right-4">
                                            {activeBatchCount}
                                        </span>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    )}

                    {/* ── MAIN CONTENT ──────────────────────────── */}
                    <main className="transition-all duration-300 ease-in-out">
                        <Outlet />
                    </main>
                </div>
            </div>

            {/* ── MOBILE BOTTOM TAB BAR ─────────────────────── */}
            {currentUser && (
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-gray-200 dark:border-slate-800 shadow-2xl">
                    <div className="flex items-stretch h-16 max-w-lg mx-auto">
                        {NAV_ITEMS.map(({ to, label, Icon, badge }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={to === '/dashboard'}
                                className={({ isActive }) =>
                                    `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors relative
                                    ${isActive ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-amber-50 dark:bg-amber-900/30' : ''}`}>
                                            <Icon size={20} />
                                        </div>
                                        <span>{label}</span>
                                        {badge && activeBatchCount > 0 && (
                                            <span className="absolute top-1.5 right-4 bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-black">
                                                {activeBatchCount}
                                            </span>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                    {/* Safe area for phones with home indicator */}
                    <div className="h-safe-area-bottom bg-white/90 dark:bg-slate-900/90" />
                </nav>
            )}
        </div>
    );
}
