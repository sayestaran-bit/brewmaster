// /src/components/layout/AppLayout.jsx
import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
    Beaker, RefreshCw, Cloud, Sun, Moon, LogOut,
    LayoutDashboard, BookOpen, Flame, Package, History,
    BarChart2, Settings, Menu, X, User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { useActiveBatches } from '../../hooks/useActiveBatches';
import { seedGuestData } from '../../services/firestore/seedGuestData';
import { haptics } from '../../utils/haptics';

/**
 * GuestSeeder: Componente interno que asegura que los invitados tengan datos.
 */
function GuestSeeder({ user }) {
    React.useEffect(() => {
        if (user?.isAnonymous) {
            console.log("🔍 [GuestSeeder] Validando integridad de cuenta de invitado...");
            seedGuestData(user.uid).catch(err => {
                console.error("❌ [GuestSeeder] Error en auto-seeding:", err);
            });
        }
    }, [user]);
    return null;
}

const NAV_ITEMS = [
    { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, activeColor: 'text-amber-500  border-amber-500  bg-amber-50/50  dark:bg-amber-900/20' },
    { to: '/recipes', label: 'Recetas', Icon: BookOpen, activeColor: 'text-orange-500  border-orange-500  bg-orange-50/50  dark:bg-orange-900/20' },
    { to: '/active', label: 'Producción', Icon: Flame, activeColor: 'text-emerald-500 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20', badge: true },
    { to: '/inventory', label: 'Inventario', Icon: Package, activeColor: 'text-sky-500     border-sky-500     bg-sky-50/50     dark:bg-sky-900/20' },
    { to: '/equipment', label: 'Equipo', Icon: Settings, activeColor: 'text-rose-500      border-rose-500      bg-rose-50/50      dark:bg-rose-900/20' },
    { to: '/history', label: 'Historial', Icon: History, activeColor: 'text-violet-500  border-violet-500  bg-violet-50/50  dark:bg-violet-900/20' },
];

const INACTIVE = 'text-muted hover:text-content hover:bg-black/5 dark:hover:bg-white/5';

export default function AppLayout() {
    const { currentUser, logout } = useAuth();
    const { darkMode, setDarkMode } = useAppContext();
    const { batches: activeBatches } = useActiveBatches();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const activeBatchCount = Array.isArray(activeBatches) ? activeBatches.length : 0;

    const toggleDrawer = () => {
        haptics.light();
        setIsDrawerOpen(!isDrawerOpen);
    };

    return (
        <div className={darkMode ? 'dark' : ''}>
            <GuestSeeder user={currentUser} />
            <div className="min-h-screen bg-surface text-content font-sans
                            selection:bg-amber-200 transition-colors duration-300
                            /* bottom padding for mobile tab bar */
                            pb-20 md:pb-0
                            p-4 md:p-6 lg:p-10">
                <div className="max-w-6xl mx-auto">

                    {/* ── HEADER ────────────────────────────────── */}
                    <div className="bg-panel text-content p-4 md:p-6 rounded-3xl shadow-sm mb-6 flex justify-between items-center relative overflow-hidden border border-line gap-4">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse-slow pointer-events-none" />

                        {/* Logo */}
                        <div className="relative z-10 flex items-center gap-3 shrink-0">
                            <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-2.5 md:p-3 rounded-2xl shadow-lg">
                                <Beaker size={24} className="text-slate-900 md:w-[28px] md:h-[28px]" />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-3xl font-black tracking-tight leading-none">BrewMaster</h1>
                                <p className="text-muted text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Sistema Cervecero</p>
                            </div>
                        </div>

                        {/* DESKTOP Controls */}
                        <div className="relative z-10 hidden md:flex items-center gap-2">
                            <button
                                onClick={() => { haptics.light(); setDarkMode(!darkMode); }}
                                className="flex items-center justify-center w-9 h-9 bg-surface hover:bg-black/10 dark:hover:bg-white/10 rounded-full border border-line backdrop-blur-sm transition-colors shadow-sm text-muted hover:text-content"
                            >
                                {darkMode ? <Sun size={14} /> : <Moon size={14} />}
                            </button>

                            {currentUser && (
                                <button
                                    onClick={() => { haptics.warning(); logout(); }}
                                    className="flex items-center gap-1.5 text-[11px] font-bold bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 px-4 py-2 rounded-full border border-red-200 dark:border-red-800/50 backdrop-blur-sm transition-colors shadow-sm"
                                >
                                    <LogOut size={12} /> Salir ({currentUser.isAnonymous ? 'Invitado' : currentUser.email?.split('@')[0]})
                                </button>
                            )}
                        </div>

                        {/* MOBILE Toggle */}
                        <div className="md:hidden relative z-10">
                            <button
                                onClick={toggleDrawer}
                                className="w-12 h-12 flex items-center justify-center bg-surface border border-line rounded-2xl text-content shadow-sm active:scale-95 transition-all"
                            >
                                <Menu size={24} />
                            </button>
                        </div>
                    </div>

                    {/* ── DESKTOP NAV BAR ───────────────────────── */}
                    {currentUser && (
                        <nav className="hidden md:flex bg-panel rounded-2xl shadow-sm border border-line overflow-x-auto mb-8">
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
                        </nav>
                    )}

                    {/* ── MAIN CONTENT ──────────────────────────── */}
                    <main className="transition-all duration-300 ease-in-out">
                        <Outlet />
                    </main>
                </div>
            </div>

            {/* ── MOBILE SIDE DRAWER ────────────────────────── */}
            <div className={`fixed inset-0 z-50 transition-all duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={toggleDrawer} />
                <div className={`absolute top-0 right-0 h-full w-[280px] bg-panel border-l border-line shadow-2xl transition-transform duration-300 transform ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-6 flex flex-col h-full">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl font-black uppercase tracking-widest text-muted">Menú</h2>
                            <button onClick={toggleDrawer} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 space-y-2">
                             <div className="bg-surface p-4 rounded-2xl border border-line mb-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-500">
                                        <User size={20} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-black text-muted uppercase tracking-wider">Usuario</p>
                                        <p className="text-sm font-bold truncate">{currentUser?.email || (currentUser?.isAnonymous ? 'Invitado' : 'Sin sesión')}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { haptics.light(); setDarkMode(!darkMode); }}
                                    className="w-full flex items-center justify-between p-3 bg-panel border border-line rounded-xl text-sm font-bold"
                                >
                                    <span className="flex items-center gap-2">
                                        {darkMode ? <Sun size={16} /> : <Moon size={16} />} 
                                        {darkMode ? 'Modo Claro' : 'Modo Oscuro'}
                                    </span>
                                    <div className={`w-10 h-5 rounded-full p-1 transition-colors ${darkMode ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                        <div className={`w-3 h-3 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                </button>
                             </div>
                        </div>

                        <div className="pt-6 border-t border-line">
                            {currentUser && (
                                <button
                                    onClick={() => { haptics.heavy(); logout(); }}
                                    className="w-full flex items-center justify-center gap-3 p-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-tighter shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                                >
                                    <LogOut size={20} /> Cerrar Sesión
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── MOBILE BOTTOM TAB BAR ─────────────────────── */}
            {
                currentUser && (
                    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-panel/90 backdrop-blur-xl border-t border-line shadow-2xl safe-area-bottom">
                        <div className="flex items-stretch h-16 max-w-lg mx-auto">
                            {NAV_ITEMS.map(({ to, label, Icon, badge }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    end={to === '/dashboard'}
                                    onClick={() => haptics.light()}
                                    className={({ isActive }) =>
                                        `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors relative h-full
                                    ${isActive ? 'text-amber-500' : 'text-muted hover:text-content'}`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-amber-50 dark:bg-amber-900/30' : ''}`}>
                                                <Icon size={22} className={isActive ? 'scale-110' : ''} />
                                            </div>
                                            <span className={isActive ? 'font-black' : ''}>{label}</span>
                                            {badge && activeBatchCount > 0 && (
                                                <span className="absolute top-2 right-1/2 translate-x-4 bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-black border-2 border-panel shadow-sm">
                                                    {activeBatchCount}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    </nav>
                )
            }
        </div >
    );
}
