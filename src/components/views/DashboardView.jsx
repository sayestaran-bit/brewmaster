// /src/components/views/DashboardView.jsx
import React from 'react';
import {
    Plus, Droplets, Banknote, CalendarClock, Thermometer,
    BarChart3, PieChart, AlertTriangle, CheckCircle2, ChevronRight, Beer
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { formatCurrency, standardizeDate } from '../../utils/formatters';
import { getThemeForCategory } from '../../utils/helpers';

export default function DashboardView() {
    const navigate = useNavigate();
    const { recipes, inventory, history } = useAppContext();

    // Cálculos del Dashboard
    const safeHistory = Array.isArray(history) ? history : [];

    // Limitar a los últimos 6 meses para visualización inicial
    const filteredHistory = safeHistory.filter(h => {
        return (Date.now() - h.timestamp) <= 180 * 24 * 60 * 60 * 1000;
    });

    const totalVolume = filteredHistory.reduce((sum, h) => sum + (Number(h.volume) || 0), 0);
    const totalCost = filteredHistory.reduce((sum, h) => sum + (Number(h.totalCost) || 0), 0);
    const totalLiters = Math.round(totalVolume);
    const totalBatches = filteredHistory.length;

    const avgCostPerLiter = totalVolume > 0 ? (totalCost / totalVolume) : 0;
    const avgABV = totalBatches > 0 ? (filteredHistory.reduce((sum, h) => sum + (Number(h.abv) || 0), 0) / totalBatches).toFixed(1) : 0;

    // Gráfico simple de top estilos
    const styleCount = filteredHistory.reduce((acc, h) => {
        const cat = h.category || 'Otros';
        acc[cat] = (acc[cat] || 0) + (Number(h.volume) || 0);
        return acc;
    }, {});
    const topStyles = Object.entries(styleCount).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const maxStyleVolume = topStyles.length > 0 ? Math.max(...topStyles.map(s => s[1])) : 1;

    // Alertas de Inventario
    const safeInventory = Array.isArray(inventory) ? inventory : [];
    const lowStockItems = safeInventory.filter(item => {
        if (item.category === 'Malta' && item.stock < 5) return true;
        if (item.category === 'Lúpulo' && item.stock < 100) return true;
        if (item.category === 'Levadura' && item.stock < 2) return true;
        return false;
    }).sort((a, b) => a.stock - b.stock);

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Botones de Acción Rápida */}
            <div className="flex flex-col sm:flex-row gap-4 mb-2">
                <button onClick={() => navigate('/recipes/add')} className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 py-4 rounded-2xl font-black text-lg flex justify-center items-center gap-2 transition-transform shadow-lg hover:-translate-y-1">
                    <Plus size={24} /> Nueva Receta
                </button>
                <button onClick={() => navigate('/active')} className="flex-1 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 py-4 rounded-2xl font-bold text-lg flex justify-center items-center gap-2 border border-emerald-100 dark:border-emerald-900/50 transition-colors shadow-sm">
                    <Droplets size={24} /> Ir a Producción
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden transition-transform hover:scale-105">
                    <div className="absolute -right-4 -bottom-4 opacity-20"><Droplets size={100} /></div>
                    <span className="text-blue-100 text-[10px] font-black uppercase tracking-widest block mb-1 relative z-10">Lts Producidos</span>
                    <span className="text-4xl md:text-5xl font-black relative z-10">{totalLiters} <span className="text-2xl text-blue-200">L</span></span>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden transition-transform hover:scale-105">
                    <div className="absolute -right-4 -bottom-4 opacity-20"><Banknote size={100} /></div>
                    <span className="text-emerald-100 text-[10px] font-black uppercase tracking-widest block mb-1 relative z-10">Costo / Litro</span>
                    <span className="text-3xl md:text-4xl font-black relative z-10">{formatCurrency(avgCostPerLiter)}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden transition-transform hover:scale-105">
                    <div className="absolute right-[-20px] top-[-20px] opacity-5 dark:opacity-10 text-orange-500"><CalendarClock size={100} /></div>
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-1 relative z-10">Lotes (Batches)</span>
                    <span className="text-4xl font-black text-slate-800 dark:text-white relative z-10">{totalBatches}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden transition-transform hover:scale-105">
                    <div className="absolute right-[-20px] top-[-20px] opacity-5 dark:opacity-10 text-red-500"><Thermometer size={100} /></div>
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-1 relative z-10">ABV Promedio</span>
                    <span className="text-4xl font-black text-red-500 relative z-10">{avgABV}%</span>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mt-2">
                {/* GRÁFICO BARRAS: Producción por Estilo (Ocupa 2/3) */}
                <div className="lg:col-span-2 flex flex-col">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm flex-1">
                        <h3 className="font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2"><BarChart3 size={20} className="text-blue-500" /> Top Estilos (Volumen)</h3>
                        {topStyles.length === 0 ? (
                            <p className="text-slate-400 font-medium italic text-center py-8">Cocina tu primer lote para ver estadísticas.</p>
                        ) : (
                            <div className="space-y-5">
                                {topStyles.map(([style, vol], idx) => {
                                    const percentage = Math.max(5, (vol / maxStyleVolume) * 100);
                                    const theme = getThemeForCategory(style);
                                    return (
                                        <div key={idx} className="relative group">
                                            <div className="flex justify-between text-sm font-bold mb-1.5">
                                                <span className="text-slate-700 dark:text-slate-300 group-hover:text-white transition-colors">{style}</span>
                                                <span className={theme.text}>{vol} L</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden shadow-inner">
                                                <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${percentage}%`, backgroundColor: theme.colorBase }}></div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* COLUMNA DERECHA: Finanzas y Alertas (Ocupa 1/3) */}
                <div className="space-y-6 flex flex-col">
                    {/* TARJETA INVERSION TOTAL */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-950 p-8 rounded-3xl border border-slate-700 shadow-xl flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-1000"><PieChart size={250} className="text-emerald-500" /></div>
                        <div className="relative z-10">
                            <h3 className="font-black text-white text-xl mb-2 flex items-center gap-2"><Banknote size={24} className="text-emerald-400" /> Inversión Acumulada</h3>
                            <p className="text-slate-400 text-sm font-medium">Suma de costos de todos los insumos de los lotes en este periodo.</p>
                        </div>
                        <div className="mt-8 text-center bg-black/40 p-8 rounded-2xl border border-white/5 backdrop-blur-md relative z-10 shadow-inner group-hover:border-emerald-500/30 transition-colors">
                            <span className="block text-5xl md:text-6xl font-black text-emerald-400 mb-2 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)] tracking-tighter">{formatCurrency(totalCost)}</span>
                            <span className="text-emerald-500/70 text-[10px] font-black uppercase tracking-[0.3em]">CLP Histórico</span>
                        </div>
                    </div>

                    {/* ALERTAS DE STOCK */}
                    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm flex-1">
                        <h3 className="font-black text-slate-800 dark:text-white mb-5 flex items-center gap-2"><AlertTriangle size={20} className="text-red-500" /> Alertas de Stock</h3>
                        {lowStockItems.length === 0 ? (
                            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl text-center border border-emerald-100 dark:border-emerald-900/30">
                                <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                                <p className="text-sm text-emerald-700 dark:text-emerald-400 font-bold">Insumos suficientes</p>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {lowStockItems.slice(0, 4).map(item => (
                                    <li key={item.id} className="flex justify-between items-center p-3 bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20">
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
                                    <button onClick={() => navigate('/inventory')} className="w-full text-center text-xs font-bold text-red-500 hover:text-red-600 pt-3 flex justify-center items-center gap-1 transition-colors">Ver {lowStockItems.length - 4} alertas más <ChevronRight size={14} /></button>
                                )}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* NUEVO: TABLA DE ÚLTIMOS LOTES COCINADOS */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm mt-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2"><Beer size={20} className="text-amber-500" /> Últimos Lotes Cocinados</h3>
                    <button onClick={() => navigate('/history')} className="text-sm font-bold text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1">Ver todo el historial <ChevronRight size={16} /></button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="text-xs text-slate-400 uppercase bg-gray-50 dark:bg-slate-800/50 rounded-xl">
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
                            {filteredHistory.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 5).map(h => (
                                <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => navigate('/history')}>
                                    <td className="px-4 py-4 font-medium text-slate-500">{standardizeDate(h.date)}</td>
                                    <td className="px-4 py-4 font-bold text-slate-800 dark:text-slate-200">{h.recipeName}</td>
                                    <td className="px-4 py-4"><span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-bold text-slate-600 dark:text-slate-300">{h.category}</span></td>
                                    <td className="px-4 py-4 font-bold text-blue-600 dark:text-blue-400">{h.volume} L</td>
                                    <td className="px-4 py-4 font-bold text-red-500">{h.abv}%</td>
                                    <td className="px-4 py-4 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(h.totalCost)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredHistory.length === 0 && <p className="text-center text-slate-400 py-6 font-medium italic">No hay cocciones recientes en este periodo.</p>}
                </div>
            </div>
        </div>
    );
}
