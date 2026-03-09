// /src/components/views/DashboardView.jsx
import React from 'react';
import {
    Plus, Droplets, Banknote, CalendarClock, Thermometer,
    BarChart3, PieChart, AlertTriangle, CheckCircle2, ChevronRight, ChevronDown,
    Beer, BookOpen, Activity, Search, Filter, Play, X, Package, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { formatCurrency, standardizeDate, getFormattedDate } from '../../utils/formatters';
import { getThemeForCategory } from '../../utils/helpers';
import { useHistory } from '../../hooks/useHistory';
import { useActiveBatches } from '../../hooks/useActiveBatches';
import { useInventory } from '../../hooks/useInventory';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { useInventoryAlerts } from '../../hooks/useInventoryAlerts';
import { useRecipes } from '../../hooks/useRecipes';
import StatCard from '../ui/StatCard';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import Button from '../ui/Button';

export default function DashboardView() {
    const navigate = useNavigate();
    const { history } = useHistory();
    const { batches: activeBatches, startBatch } = useActiveBatches();
    const { inventory } = useInventory();
    const { recipes } = useRecipes();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [periodFilter, setPeriodFilter] = useState('6m');
    const [styleFilter, setStyleFilter] = useState('all');
    const [showBrewModal, setShowBrewModal] = useState(false);
    const [brewRecipeId, setBrewRecipeId] = useState('');
    const [brewVol, setBrewVol] = useState(20);
    const [batchIdentity, setBatchIdentity] = useState('');
    const [isStartingBrew, setIsStartingBrew] = useState(false);

    const handleStartBrew = async () => {
        if (!brewRecipeId || !brewVol || isNaN(brewVol) || brewVol <= 0 || isStartingBrew) return;
        const recipe = recipes.find(r => r.id === brewRecipeId);
        if (!recipe) return;

        setIsStartingBrew(true);
        const newBatchItem = {
            recipeId: recipe.id,
            recipeName: recipe.name || 'Sin Nombre',
            dateBrewed: getFormattedDate(),
            date: getFormattedDate(),
            timestamp: Date.now(),
            volume: brewVol || 0,
            customName: batchIdentity.trim() || null,
            og: Number(recipe.og) || 1.050,
            fg: Number(recipe.fg) || 1.010,
            abv: Number(recipe.abv) || 5.0,
            category: recipe.category || 'Otros',
            totalCost: 0,
            status: 'Cocinando',
            phase: 'cooking',
            phaseTimestamps: {
                cookingStart: Date.now(),
                fermentationStart: null,
                bottlingStart: null
            },
            deductedHops: false
        };
        try {
            const batchId = await startBatch(newBatchItem);
            navigate(`/brew/${batchId}?phase=cooking`);
        } catch (error) {
            alert("Error al iniciar el lote: " + error.message);
            setIsStartingBrew(false);
        }
    };

    const {
        totalLiters, totalCost, totalBatches, avgFermentationDays,
        avgCostPerLiter, avgABV, topStyles, maxStyleVolume, recentHistory, topIngredients, availableStyles
    } = useDashboardStats(history, searchTerm, statusFilter, recipes, periodFilter, styleFilter);

    const { lowStockItems } = useInventoryAlerts(inventory);

    return (
        <div className="space-y-6 animate-fadeIn">

            {/* ── Quick Actions & Filters ───────────────────── */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <Button
                    variant="primary"
                    size="lg"
                    onClick={() => setShowBrewModal(true)}
                    className="w-full md:w-auto md:min-w-[250px] bg-amber-500 hover:bg-amber-600 border-amber-500 text-white font-black hover:-translate-y-1 shadow-xl shadow-amber-500/20"
                >
                    <Play size={20} className="fill-white" /> ¡Cocinar Lote!
                </Button>

                <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full lg:w-auto lg:flex-1 justify-end items-center">
                    {/* Filtro Periodo */}
                    <div className="relative w-full sm:w-auto min-w-[140px]">
                        <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                        <select
                            className="w-full bg-panel text-content border border-line rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors font-bold appearance-none cursor-pointer"
                            value={periodFilter}
                            onChange={(e) => setPeriodFilter(e.target.value)}
                        >
                            <option value="1m">Último Mes</option>
                            <option value="3m">Últimos 3 Meses</option>
                            <option value="6m">Últimos 6 Meses</option>
                            <option value="1y">Último Año</option>
                            <option value="all">Histórico Completo</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
                    </div>

                    {/* Filtro Estilo */}
                    <div className="relative w-full sm:w-auto min-w-[150px]">
                        <Beer className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                        <select
                            className="w-full bg-panel text-content border border-line rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors font-bold appearance-none cursor-pointer truncate"
                            value={styleFilter}
                            onChange={(e) => setStyleFilter(e.target.value)}
                        >
                            <option value="all">Todos los Estilos</option>
                            {availableStyles && availableStyles.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
                    </div>

                    {/* Filtro Estado */}
                    <div className="flex bg-panel border border-line rounded-xl overflow-hidden shadow-sm h-10 w-full sm:w-auto">
                        {['all', 'completed', 'abandoned'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`flex-1 sm:px-4 py-2 text-xs font-bold transition-colors ${statusFilter === status
                                    ? 'bg-amber-500 text-white'
                                    : 'text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-content'
                                    }`}
                            >
                                {status === 'all' ? 'Todos' : status === 'completed' ? 'Completados' : 'Abandonados'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Active Production Banner ──────────────────── */}
            {Array.isArray(activeBatches) && activeBatches.length > 0 && (
                <button
                    onClick={() => navigate('/active')}
                    className="w-full flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 p-4 rounded-2xl transition-colors group animate-slideDown"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-500 text-white p-2 rounded-xl">
                            <Droplets size={20} />
                        </div>
                        <div className="text-left">
                            <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm block">
                                {activeBatches.length} {activeBatches.length === 1 ? 'lote' : 'lotes'} en producción
                            </span>
                            <span className="text-emerald-600/60 dark:text-emerald-500/60 text-xs font-medium">
                                Toca para ver el estado de tus fermentaciones
                            </span>
                        </div>
                    </div>
                    <ChevronRight size={20} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
                </button>
            )}

            {/* ── KPI Stat Cards ────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard
                    icon={Droplets}
                    label="Lts Producidos"
                    value={totalLiters}
                    unit="L"
                    gradient="from-blue-400 to-blue-500 dark:from-blue-600 dark:to-blue-800"
                    animateDelay={1}
                />
                <StatCard
                    icon={Banknote}
                    label="Costo / Litro"
                    value={formatCurrency(avgCostPerLiter)}
                    gradient="from-emerald-400 to-emerald-500 dark:from-emerald-600 dark:to-emerald-800"
                    animateDelay={2}
                />
                <StatCard
                    icon={CalendarClock}
                    label="Lotes"
                    value={totalBatches}
                    dark
                    animateDelay={3}
                />
                <StatCard
                    icon={Thermometer}
                    label="ABV Promedio"
                    value={avgABV}
                    unit="%"
                    dark
                    animateDelay={4}
                />
                <StatCard
                    icon={Activity}
                    label="Días Promedio Fermento"
                    value={avgFermentationDays || '-'}
                    unit={avgFermentationDays ? "días" : ""}
                    gradient="from-amber-400 to-amber-500 dark:from-amber-600 dark:to-amber-800"
                    animateDelay={5}
                />
            </div>

            {/* ── Charts + Alerts Row ───────────────────────── */}
            <div className="grid lg:grid-cols-3 gap-6">

                {/* Contenedor Izquierdo: Gráficos y KPIs */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Bar chart: Production by style */}
                    <Card animate>
                        <h3 className="font-black text-content mb-6 flex items-center gap-2">
                            <BarChart3 size={20} className="text-blue-500" /> Top Estilos (Volumen)
                        </h3>

                        {topStyles.length === 0 ? (
                            <EmptyState
                                icon={Beer}
                                title="Sin datos aún"
                                description="Cocina tu primer lote para ver estadísticas de estilos."
                            />
                        ) : (
                            <div className="space-y-5">
                                {topStyles.map(([style, vol], idx) => {
                                    const percentage = Math.max(5, (vol / maxStyleVolume) * 100);
                                    const theme = getThemeForCategory(style);
                                    return (
                                        <div key={idx} className="group">
                                            <div className="flex justify-between text-sm font-bold mb-1.5">
                                                <span className="text-content">{style}</span>
                                                <span className={theme.text}>{vol} L</span>
                                            </div>
                                            <div className="w-full bg-black/5 dark:bg-white/5 h-3 rounded-full overflow-hidden shadow-inner">
                                                <div
                                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                                    style={{ width: `${percentage}%`, backgroundColor: theme.colorBase }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>

                    {/* Top Ingredients KPI */}
                    <Card animate>
                        <h3 className="font-black text-content mb-6 flex items-center gap-2">
                            <Package size={20} className="text-emerald-500" /> Insumos Más Utilizados
                        </h3>

                        {!topIngredients || Object.keys(topIngredients).length === 0 ? (
                            <EmptyState
                                icon={Package}
                                title="Sin consumo registrado"
                                description="Cocina lotes para ver tus insumos más usados."
                            />
                        ) : (
                            <div className="grid sm:grid-cols-2 gap-6">
                                {Object.entries(topIngredients).map(([category, items]) => (
                                    <div key={category} className="bg-surface border border-line p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
                                        <h4 className="font-black text-emerald-600 dark:text-emerald-500 mb-4 text-xs uppercase tracking-widest border-b border-emerald-500/20 pb-2">{category}</h4>
                                        <div className="space-y-4">
                                            {items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm border-b border-line last:border-0 pb-2 last:pb-0">
                                                    <span className="font-bold text-content truncate pr-2" title={item.name}>{item.name}</span>
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-black whitespace-nowrap bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">
                                                        {item.amount % 1 !== 0 ? item.amount.toFixed(2) : item.amount} {category === 'Malta' ? 'kg' : category === 'Lúpulo' ? 'g' : 'u'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right column: Investment + Stock Alerts */}
                <div className="space-y-6 flex flex-col">

                    {/* Investment Total */}
                    <div className="bg-panel p-8 rounded-3xl border border-line shadow-sm flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute -right-10 -bottom-10 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform duration-1000">
                            <PieChart size={250} className="text-emerald-500" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="font-black text-content text-xl mb-2 flex items-center gap-2">
                                <Banknote size={24} className="text-emerald-500" /> Inversión Acumulada
                            </h3>
                            <p className="text-muted text-sm font-medium">
                                Suma de costos de insumos en los últimos 6 meses.
                            </p>
                        </div>
                        <div className="mt-6 text-center bg-black/5 dark:bg-white/5 p-6 rounded-2xl border border-line backdrop-blur-md relative z-10 transition-colors">
                            <span className="block text-4xl md:text-5xl font-black text-emerald-600 dark:text-emerald-400 mb-2 tracking-tighter">
                                {formatCurrency(totalCost)}
                            </span>
                            <span className="text-emerald-700/70 dark:text-emerald-500/70 text-[10px] font-black uppercase tracking-[0.3em]">CLP Histórico</span>
                        </div>
                    </div>

                    {/* Stock Alerts */}
                    <Card className="flex-1">
                        <h3 className="font-black text-content mb-5 flex items-center gap-2">
                            <AlertTriangle size={20} className="text-red-500" /> Alertas de Stock
                        </h3>
                        {lowStockItems.length === 0 ? (
                            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl text-center border border-emerald-100 dark:border-emerald-900/30">
                                <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                                <p className="text-sm text-emerald-700 dark:text-emerald-400 font-bold">Insumos suficientes</p>
                            </div>
                        ) : (
                            <ul className="space-y-2.5">
                                {lowStockItems.slice(0, 4).map(item => (
                                    <li
                                        key={item.id}
                                        className="flex justify-between items-center p-3 bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        <div className="overflow-hidden pr-2">
                                            <span className="font-bold text-content block truncate text-sm">{item.name}</span>
                                            <span className="text-[10px] uppercase font-black tracking-wider text-muted">{item.category}</span>
                                        </div>
                                        <span className="font-black text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded-md text-xs shrink-0 whitespace-nowrap">
                                            {parseFloat(Number(item.stock).toFixed(2))} {item.unit}
                                        </span>
                                    </li>
                                ))}
                                {lowStockItems.length > 4 && (
                                    <button
                                        onClick={() => navigate('/inventory')}
                                        className="w-full text-center text-xs font-bold text-red-500 hover:text-red-600 pt-2 flex justify-center items-center gap-1 transition-colors"
                                    >
                                        Ver {lowStockItems.length - 4} alertas más <ChevronRight size={14} />
                                    </button>
                                )}
                            </ul>
                        )}
                    </Card>
                </div>
            </div>

            {/* ── Recent Batches Table ──────────────────────── */}
            <Card animate animateDelay={2}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-content flex items-center gap-2">
                        <Beer size={20} className="text-amber-500" /> Últimos Lotes Cocinados
                    </h3>
                    <button
                        onClick={() => navigate('/history')}
                        className="text-sm font-bold text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1"
                    >
                        Ver historial <ChevronRight size={16} />
                    </button>
                </div>

                {recentHistory.length === 0 ? (
                    <EmptyState
                        icon={BookOpen}
                        title="Sin historial aún"
                        description="Tus lotes cocinados aparecerán aquí."
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="text-xs text-muted uppercase bg-black/5 dark:bg-white/5 border-b border-line">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-xl">Fecha</th>
                                    <th className="px-4 py-3">Receta</th>
                                    <th className="px-4 py-3">Estilo</th>
                                    <th className="px-4 py-3">Volumen</th>
                                    <th className="px-4 py-3">ABV</th>
                                    <th className="px-4 py-3 rounded-r-xl">Costo Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {recentHistory.map(h => (
                                    <tr
                                        key={h.id}
                                        className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                        onClick={() => navigate('/history')}
                                    >
                                        <td className="px-4 py-3.5 font-medium text-muted">{standardizeDate(h.date)}</td>
                                        <td className="px-4 py-3.5 font-black text-content">
                                            <div className="flex items-center gap-2">
                                                {h.recipeName}
                                                {h.status === 'Abandonada' && (
                                                    <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">
                                                        Abandonado
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="bg-black/5 dark:bg-white/5 px-2 py-1 rounded text-xs font-bold text-content">
                                                {h.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 font-bold text-blue-600 dark:text-blue-400">{h.volume} L</td>
                                        <td className="px-4 py-3.5 font-bold text-amber-500">{h.abv}%</td>
                                        <td className="px-4 py-3.5 font-black text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(h.totalCost)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* MODAL DE COCINAR LOTE */}
            {showBrewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-panel w-full max-w-md rounded-3xl shadow-2xl border border-line overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-line flex justify-between items-center bg-black/5 dark:bg-white/5">
                            <h3 className="font-black text-content text-xl flex items-center gap-2">
                                <Play size={24} className="text-amber-500 fill-amber-500" /> Nuevo Lote
                            </h3>
                            <button onClick={() => setShowBrewModal(false)} className="p-2 text-muted hover:text-content hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Selecciona Receta</label>
                                <select
                                    value={brewRecipeId}
                                    onChange={(e) => setBrewRecipeId(e.target.value)}
                                    className="w-full p-3 border border-line rounded-xl outline-none bg-surface focus:bg-panel text-content focus:border-amber-500 transition-colors cursor-pointer"
                                >
                                    <option value="" disabled>-- Elige una receta --</option>
                                    {recipes && recipes.map(r => (
                                        <option key={r.id} value={r.id}>{r.name} ({r.category})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Volumen a Cocinar (L)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={brewVol}
                                    onChange={(e) => setBrewVol(Number(e.target.value))}
                                    className="w-full p-3 border border-line rounded-xl outline-none bg-surface focus:bg-panel text-content focus:border-amber-500 transition-colors text-center font-bold text-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Nombre del Lote / ID (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Lote #42 / IPA Especial"
                                    value={batchIdentity}
                                    onChange={(e) => setBatchIdentity(e.target.value)}
                                    className="w-full p-3 border border-line rounded-xl outline-none bg-surface focus:bg-panel text-content focus:border-amber-500 transition-colors font-medium"
                                />
                            </div>

                            <button
                                onClick={handleStartBrew}
                                disabled={!brewRecipeId || brewVol <= 0 || isStartingBrew}
                                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl shadow-lg transition-transform hover:-translate-y-1 flex items-center justify-center gap-2 mt-2"
                            >
                                {isStartingBrew ? <Loader2 className="animate-spin" size={20} /> : <Thermometer size={20} />}
                                {isStartingBrew ? 'Preparando equipo...' : 'Iniciar Producción'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
