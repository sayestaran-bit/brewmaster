// /src/components/views/DashboardView.jsx
import React from 'react';
import {
    Plus, Droplets, Banknote, CalendarClock, Thermometer,
    BarChart3, PieChart, AlertTriangle, CheckCircle2, ChevronRight,
    Beer, BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, standardizeDate } from '../../utils/formatters';
import { getThemeForCategory } from '../../utils/helpers';
import { useHistory } from '../../hooks/useHistory';
import { useActiveBatches } from '../../hooks/useActiveBatches';
import { useInventory } from '../../hooks/useInventory';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { useInventoryAlerts } from '../../hooks/useInventoryAlerts';
import StatCard from '../ui/StatCard';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import Button from '../ui/Button';

export default function DashboardView() {
    const navigate = useNavigate();
    const { history } = useHistory();
    const { batches: activeBatches } = useActiveBatches();
    const { inventory } = useInventory();

    const {
        totalLiters, totalCost, totalBatches,
        avgCostPerLiter, avgABV, topStyles, maxStyleVolume, recentHistory
    } = useDashboardStats(history);

    const { lowStockItems } = useInventoryAlerts(inventory);

    return (
        <div className="space-y-6 animate-fadeIn">

            {/* ── Quick Actions ─────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3">
                <Button
                    variant="primary"
                    size="lg"
                    icon={Plus}
                    onClick={() => navigate('/recipes/add')}
                    className="flex-1"
                >
                    Crear Nueva Receta
                </Button>
            </div>

            {/* ── Active Production Banner ──────────────────── */}
            {Array.isArray(activeBatches) && activeBatches.length > 0 && (
                <button
                    onClick={() => navigate('/active')}
                    className="w-full flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 p-4 rounded-2xl transition-colors group animate-slideDown"
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon={Droplets}
                    label="Lts Producidos"
                    value={totalLiters}
                    unit="L"
                    gradient="from-blue-500 to-blue-700"
                    animateDelay={1}
                />
                <StatCard
                    icon={Banknote}
                    label="Costo / Litro"
                    value={formatCurrency(avgCostPerLiter)}
                    gradient="from-emerald-500 to-teal-600"
                    animateDelay={2}
                />
                <StatCard
                    icon={CalendarClock}
                    label="Lotes (Batches)"
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
            </div>

            {/* ── Charts + Alerts Row ───────────────────────── */}
            <div className="grid lg:grid-cols-3 gap-6">

                {/* Bar chart: Production by style */}
                <Card className="lg:col-span-2" animate>
                    <h3 className="font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
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
                                            <span className="text-slate-700 dark:text-slate-300">{style}</span>
                                            <span className={theme.text}>{vol} L</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden shadow-inner">
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

                {/* Right column: Investment + Stock Alerts */}
                <div className="space-y-6 flex flex-col">

                    {/* Investment Total */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-950 p-8 rounded-3xl border border-slate-700 shadow-xl flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                            <PieChart size={250} className="text-emerald-500" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="font-black text-white text-xl mb-2 flex items-center gap-2">
                                <Banknote size={24} className="text-emerald-400" /> Inversión Acumulada
                            </h3>
                            <p className="text-slate-400 text-sm font-medium">
                                Suma de costos de insumos en los últimos 6 meses.
                            </p>
                        </div>
                        <div className="mt-6 text-center bg-black/40 p-6 rounded-2xl border border-white/5 backdrop-blur-md relative z-10 shadow-inner group-hover:border-emerald-500/30 transition-colors">
                            <span className="block text-4xl md:text-5xl font-black text-emerald-400 mb-2 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)] tracking-tighter">
                                {formatCurrency(totalCost)}
                            </span>
                            <span className="text-emerald-500/70 text-[10px] font-black uppercase tracking-[0.3em]">CLP Histórico</span>
                        </div>
                    </div>

                    {/* Stock Alerts */}
                    <Card className="flex-1">
                        <h3 className="font-black text-slate-800 dark:text-white mb-5 flex items-center gap-2">
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
                                            <span className="font-bold text-slate-700 dark:text-slate-300 block truncate text-sm">{item.name}</span>
                                            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">{item.category}</span>
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
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
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
                            <thead className="text-xs text-slate-400 uppercase bg-gray-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-xl">Fecha</th>
                                    <th className="px-4 py-3">Receta</th>
                                    <th className="px-4 py-3">Estilo</th>
                                    <th className="px-4 py-3">Volumen</th>
                                    <th className="px-4 py-3">ABV</th>
                                    <th className="px-4 py-3 rounded-r-xl">Costo Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                                {recentHistory.map(h => (
                                    <tr
                                        key={h.id}
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                                        onClick={() => navigate('/history')}
                                    >
                                        <td className="px-4 py-3.5 font-medium text-slate-500">{standardizeDate(h.date)}</td>
                                        <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200">{h.recipeName}</td>
                                        <td className="px-4 py-3.5">
                                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-bold text-slate-600 dark:text-slate-300">
                                                {h.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 font-bold text-blue-600 dark:text-blue-400">{h.volume} L</td>
                                        <td className="px-4 py-3.5 font-bold text-red-500">{h.abv}%</td>
                                        <td className="px-4 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(h.totalCost)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
