// /src/components/views/CostAnalysisView.jsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, BarChart3, DollarSign, Beer, Package, Calendar, Filter } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useHistory } from '../../hooks/useHistory';
import { useInventory } from '../../hooks/useInventory';
import { formatCurrency, standardizeDate, parseDateToTimestamp } from '../../utils/formatters';

export default function CostAnalysisView() {
    const navigate = useNavigate();
    const { history } = useHistory();
    const { inventory } = useInventory();

    const [periodFilter, setPeriodFilter] = useState('all'); // all, 3m, 6m, 1y

    const safeHistory = useMemo(() => {
        let items = Array.isArray(history) ? [...history] : [];
        // Ordenar por timestamp desc
        items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        if (periodFilter !== 'all') {
            const now = Date.now();
            const months = periodFilter === '3m' ? 3 : periodFilter === '6m' ? 6 : 12;
            const cutoff = now - (months * 30 * 24 * 60 * 60 * 1000);
            items = items.filter(h => (h.timestamp || 0) >= cutoff);
        }
        return items;
    }, [history, periodFilter]);

    // --- Métricas Generales ---
    const totalCost = safeHistory.reduce((acc, h) => acc + (Number(h.totalCost) || 0), 0);
    const totalLiters = safeHistory.reduce((acc, h) => acc + (Number(h.volume) || 0), 0);
    const avgCostPerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;
    const totalBatches = safeHistory.length;

    // --- Costo por Estilo ---
    const costByStyle = useMemo(() => {
        const map = {};
        safeHistory.forEach(h => {
            const cat = h.category || 'Otros';
            if (!map[cat]) map[cat] = { cost: 0, liters: 0, batches: 0 };
            map[cat].cost += Number(h.totalCost) || 0;
            map[cat].liters += Number(h.volume) || 0;
            map[cat].batches += 1;
        });
        return Object.entries(map)
            .map(([style, data]) => ({ style, ...data, avgPerLiter: data.liters > 0 ? data.cost / data.liters : 0 }))
            .sort((a, b) => b.cost - a.cost);
    }, [safeHistory]);

    // --- Costo por Mes (para gráfico simple) ---
    const costByMonth = useMemo(() => {
        const map = {};
        safeHistory.forEach(h => {
            const date = h.dateBrewed || h.date || '';
            const parts = date.split('/');
            if (parts.length >= 3) {
                const key = `${parts[1]}/${parts[2]}`; // MM/YYYY
                if (!map[key]) map[key] = { cost: 0, liters: 0, batches: 0 };
                map[key].cost += Number(h.totalCost) || 0;
                map[key].liters += Number(h.volume) || 0;
                map[key].batches += 1;
            }
        });
        return Object.entries(map)
            .sort((a, b) => {
                const [mA, yA] = a[0].split('/').map(Number);
                const [mB, yB] = b[0].split('/').map(Number);
                return (yA * 12 + mA) - (yB * 12 + mB);
            })
            .map(([month, data]) => ({ month, ...data }));
    }, [safeHistory]);

    const maxMonthlyCost = Math.max(...costByMonth.map(m => m.cost), 1);

    // --- Valor de inventario actual ---
    const inventoryValue = (Array.isArray(inventory) ? inventory : []).reduce((acc, item) => acc + ((item.stock || 0) * (item.price || 0)), 0);

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-slate-700 pb-4">
                <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                    <TrendingUp className="text-emerald-500" size={32} /> Análisis de Costos
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        {[{ key: 'all', label: 'Todo' }, { key: '3m', label: '3 Meses' }, { key: '6m', label: '6 Meses' }, { key: '1y', label: '1 Año' }].map(p => (
                            <button key={p.key} onClick={() => setPeriodFilter(p.key)}
                                className={`px-4 py-2 text-xs font-black transition-colors ${periodFilter === p.key ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => navigate('/inventory')} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 font-bold bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors shadow-sm">
                        <ArrowLeft size={18} /> Inventario
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 rounded-2xl text-white shadow-lg">
                    <DollarSign size={20} className="opacity-60 mb-2" />
                    <span className="block text-[10px] font-bold uppercase tracking-wider opacity-80">Inversión Total</span>
                    <span className="block text-2xl font-black">{formatCurrency(totalCost)}</span>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-5 rounded-2xl text-white shadow-lg">
                    <Beer size={20} className="opacity-60 mb-2" />
                    <span className="block text-[10px] font-bold uppercase tracking-wider opacity-80">Litros Producidos</span>
                    <span className="block text-2xl font-black">{totalLiters} L</span>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-5 rounded-2xl text-white shadow-lg">
                    <BarChart3 size={20} className="opacity-60 mb-2" />
                    <span className="block text-[10px] font-bold uppercase tracking-wider opacity-80">Costo Promedio / L</span>
                    <span className="block text-2xl font-black">{formatCurrency(avgCostPerLiter)}</span>
                </div>
                <div className="bg-gradient-to-br from-violet-500 to-purple-700 p-5 rounded-2xl text-white shadow-lg">
                    <Package size={20} className="opacity-60 mb-2" />
                    <span className="block text-[10px] font-bold uppercase tracking-wider opacity-80">Capital en Inventario</span>
                    <span className="block text-2xl font-black">{formatCurrency(inventoryValue)}</span>
                </div>
            </div>

            {safeHistory.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl text-center shadow-sm border border-gray-100 dark:border-slate-800">
                    <TrendingUp size={72} className="mx-auto text-gray-200 dark:text-slate-700 mb-5" />
                    <h3 className="text-2xl font-black text-slate-700 dark:text-slate-300 mb-2">Sin datos para analizar</h3>
                    <p className="text-slate-500 font-medium">Cocina y embotella algunos lotes para ver tu análisis de costos aquí.</p>
                </div>
            ) : (
                <>
                    {/* Gasto por Mes (barras) */}
                    {costByMonth.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                <Calendar size={20} className="text-blue-500" /> Gasto Mensual
                            </h3>
                            <div className="flex items-end gap-2 h-48 overflow-x-auto pb-2">
                                {costByMonth.map((m, i) => (
                                    <div key={i} className="flex flex-col items-center min-w-[60px] group">
                                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {formatCurrency(m.cost)}
                                        </span>
                                        <div
                                            className="w-10 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg transition-all duration-300 hover:from-emerald-400 hover:to-emerald-300 shadow-sm relative group"
                                            style={{ height: `${Math.max(8, (m.cost / maxMonthlyCost) * 160)}px` }}
                                            title={`${m.month}: ${formatCurrency(m.cost)} (${m.batches} lotes, ${m.liters}L)`}
                                        >
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 mt-2 whitespace-nowrap">{m.month}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Costo por Estilo */}
                    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                            <Beer size={20} className="text-amber-500" /> Costo por Estilo de Cerveza
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs text-slate-400 uppercase border-b border-gray-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-4 py-3 font-bold tracking-wider">Estilo</th>
                                        <th className="px-4 py-3 font-bold tracking-wider text-right">Lotes</th>
                                        <th className="px-4 py-3 font-bold tracking-wider text-right">Litros</th>
                                        <th className="px-4 py-3 font-bold tracking-wider text-right">Inversión</th>
                                        <th className="px-4 py-3 font-bold tracking-wider text-right">$/Litro</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                                    {costByStyle.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-4 font-black text-slate-700 dark:text-slate-200">{row.style}</td>
                                            <td className="px-4 py-4 text-right font-bold text-slate-500">{row.batches}</td>
                                            <td className="px-4 py-4 text-right font-bold text-blue-600 dark:text-blue-400">{row.liters} L</td>
                                            <td className="px-4 py-4 text-right font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(row.cost)}</td>
                                            <td className="px-4 py-4 text-right font-bold text-amber-600 dark:text-amber-400">{formatCurrency(row.avgPerLiter)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Historial detallado */}
                    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                            <Filter size={20} className="text-violet-500" /> Detalle por Lote
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs text-slate-400 uppercase border-b border-gray-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-4 py-3 font-bold tracking-wider">Receta</th>
                                        <th className="px-4 py-3 font-bold tracking-wider">Fecha</th>
                                        <th className="px-4 py-3 font-bold tracking-wider text-right">Litros</th>
                                        <th className="px-4 py-3 font-bold tracking-wider text-right">Costo Total</th>
                                        <th className="px-4 py-3 font-bold tracking-wider text-right">$/Litro</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                                    {safeHistory.map((h, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">{h.recipeName}</td>
                                            <td className="px-4 py-3 text-slate-500">{standardizeDate(h.dateBrewed || h.date)}</td>
                                            <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">{h.volume || 0} L</td>
                                            <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(h.totalCost)}</td>
                                            <td className="px-4 py-3 text-right font-bold text-amber-600 dark:text-amber-400">{formatCurrency((Number(h.totalCost) || 0) / (Number(h.volume) || 1))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
