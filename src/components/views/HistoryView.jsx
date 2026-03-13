// /src/components/views/HistoryView.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, ArrowLeft, CalendarClock, Trash2, Beer, Droplets, Star, Search, Filter, Settings } from 'lucide-react';
import { useHistoryContext } from '../../context/HistoryContext';
import { formatCurrency, standardizeDate } from '../../utils/formatters';
import { Activity, Download } from 'lucide-react'; 
import { useToast } from '../../context/ToastContext';
import * as XLSX from 'xlsx';

export default function HistoryView() {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const { history, stats, deleteEntry, updateTasting } = useHistoryContext();

    const [tastingFormId, setTastingFormId] = useState(null);
    const [tastingData, setTastingData] = useState({ rating: 0, notes: '' });
    const [expandedBatchId, setExpandedBatchId] = useState(null);


    const deleteHistoryItem = async (id) => {
        if (window.confirm("¿Seguro que deseas eliminar el historial de este lote? Esta acción no devolverá insumos al inventario.")) {
            try {
                console.log("HistoryView: Deleting entry", id);
                await deleteEntry(id);
                addToast("¡Entrada eliminada exitosamente!", "success");
            } catch (err) {
                console.error("Error deleting history item:", err);
                addToast("No se pudo eliminar el registro del historial.", "error");
            }
        }
    };

    const saveTasting = async () => {
        try {
            if (!tastingFormId) return;
            console.log("HistoryView: Saving tasting for ID", tastingFormId, tastingData);
            await updateTasting(tastingFormId, tastingData);
            setTastingFormId(null);
            addToast("¡Evaluación guardada exitosamente!", "success");
        } catch (err) {
            console.error("Error saving tasting:", err);
            addToast("Error al guardar la evaluación.", "error");
        }
    };

    const exportToExcel = (batch) => {
        try {
            const data = [];

            // 1. Información General
            data.push(["REPORTE DE LOTE - BREWMASTER"]);
            data.push(["Generado el", new Date().toLocaleString()]);
            data.push([]);
            data.push(["Información General"]);
            data.push(["Lote / Identidad", batch.customName || "Sin nombre"]);
            data.push(["Receta", batch.recipeName]);
            data.push(["Categoría", batch.category]);
            data.push(["Equipo", batch.equipmentName || "N/A"]);
            data.push(["Volumen", `${batch.volume} L`]);
            data.push(["Fecha Cocción", standardizeDate(batch.dateBrewed || batch.date)]);
            data.push(["Fecha Envasado", batch.dateBottled ? standardizeDate(batch.dateBottled) : "N/A"]);
            data.push(["Costo Total", formatCurrency(batch.totalCost)]);
            data.push(["Costo x Litro", formatCurrency((Number(batch.totalCost) || 0) / (Number(batch.volume) || 1))]);
            data.push([]);

            // 2. Parámetros Finales
            data.push(["Parámetros Finales"]);
            data.push(["DO", batch.og || "-"]);
            data.push(["DF", batch.fg || "-"]);
            data.push(["ABV", `${batch.abv || "-"}%`]);
            data.push([]);

            // 3. Notas
            data.push(["Notas de Producción"]);
            data.push([batch.productionNotes || "Sin notas recorded"]);
            data.push([]);
            data.push(["Evaluación de Cata"]);
            data.push(["Puntaje", batch.tasting?.rating ? `${batch.tasting.rating}/5` : "Pendiente"]);
            data.push(["Comentarios", batch.tasting?.notes || "-"]);
            data.push([]);

            // 4. Analítica de Tiempos
            data.push(["ANÁLISIS DE TIEMPOS POR FASE"]);
            data.push(["Fase", "Paso", "Meta (min/días)", "Real (min/días)", "Desviación %"]);

            ['cooking', 'fermenting', 'bottling'].forEach(phase => {
                let rawMetrics = batch[`${phase}_metrics`];

                if (phase === 'cooking' && (!rawMetrics || rawMetrics.length === 0)) {
                    rawMetrics = batch.stepsMetrics || [];
                } else if (!rawMetrics) {
                    rawMetrics = [];
                }

                const metrics = Array.isArray(rawMetrics) ? rawMetrics : Object.values(rawMetrics);

                metrics.sort((a, b) => (a.stepIdx || 0) - (b.stepIdx || 0)).forEach(m => {
                    const isCooking = phase === 'cooking';
                    const unit = isCooking ? "min" : "días";
                    const planned = isCooking ? Math.floor(m.planned / 60) : (m.planned / 86400).toFixed(1);
                    const actual = m.actual ? (isCooking ? Math.floor(m.actual / 60) : (m.actual / 86400).toFixed(1)) : "N/A";
                    const deviation = m.actual ? `${Math.round((m.actual / (m.planned || 1)) * 100)}%` : "-";

                    data.push([
                        phase.toUpperCase(),
                        m.title,
                        `${planned} ${unit}`,
                        `${actual} ${unit}`,
                        deviation
                    ]);
                });
            });

            // Crear libro y hoja
            const ws = XLSX.utils.aoa_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Reporte_Lote");

            // Descargar
            const filename = `Reporte_${batch.customName || batch.recipeName}_${batch.date}.xlsx`.replace(/\s+/g, '_');
            XLSX.writeFile(wb, filename);

        } catch (err) {
            console.error("Error exporting to Excel:", err);
            addToast("Error al generar el reporte Excel.", "error");
        }
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredHistory = history.filter(h => {
        if (statusFilter === 'completed' && h.status !== 'Completada') return false;
        if (statusFilter === 'abandoned' && h.status !== 'Abandonada') return false;
        if (searchTerm) {
            const searchInput = searchTerm.toLowerCase();
            const matchesSearch =
                h.recipeName?.toLowerCase().includes(searchInput) ||
                h.customName?.toLowerCase().includes(searchInput) ||
                h.category?.toLowerCase().includes(searchInput);
            if (!matchesSearch) return false;
        }
        return true;
    });



    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-line pb-4 gap-4">
                <h2 className="text-3xl font-black text-content flex items-center gap-3">
                    <History className="text-blue-600" size={32} /> Historial de Producción
                </h2>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar en historial..."
                            className="w-full bg-panel text-content border border-line rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-muted"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex bg-panel border border-line rounded-xl overflow-hidden shadow-sm h-11 w-full sm:w-auto">
                        {['all', 'completed', 'abandoned'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`flex-1 sm:px-4 py-2 text-xs font-bold transition-colors ${statusFilter === status
                                    ? 'bg-blue-600 text-white'
                                    : 'text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-content'
                                    }`}
                            >
                                {status === 'all' ? 'Todos' : status === 'completed' ? 'Completados' : 'Abandonados'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 font-bold bg-panel px-4 py-3 rounded-xl border border-line transition-colors shadow-sm w-full md:w-auto justify-center h-11 whitespace-nowrap"
                    >
                        <ArrowLeft size={18} /> Volver
                    </button>
                </div>
            </div>

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slideDown">
                    <div className="bg-panel p-5 rounded-2xl border border-line shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted block mb-1">Costo Promedio (L)</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.avgCostPerLiter)}</span>
                        </div>
                    </div>
                    <div className="bg-panel p-5 rounded-2xl border border-line shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted block mb-1">Eficiencia Promedio</span>
                        <div className="flex items-baseline gap-1">
                            <span className={`text-2xl font-black text-blue-500`}>{stats.avgEfficiency}%</span>
                            <span className="text-[10px] text-muted font-bold">brewhouse</span>
                        </div>
                    </div>
                    <div className="bg-panel p-5 rounded-2xl border border-line shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted block mb-1">Total Elaborado</span>
                        <span className="text-2xl font-black text-content">{stats.totalVolume} L</span>
                    </div>
                    <div className="bg-panel p-5 rounded-2xl border border-line shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted block mb-1">Lotes Totales</span>
                        <span className="text-2xl font-black text-content">{stats.batchCount}</span>
                    </div>
                </div>
            )}

            {filteredHistory.length === 0 ? (
                <div className="bg-panel p-12 rounded-3xl text-center shadow-sm border border-line">
                    <CalendarClock size={72} className="mx-auto text-gray-300 dark:text-slate-700 mb-5" />
                    <h3 className="text-2xl font-black text-content mb-2">Aún no hay lotes registrados</h3>
                    <p className="text-muted dark:text-muted font-medium">Inicia un "Día de Cocción" desde cualquier receta y guárdala al finalizar.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {[...filteredHistory].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).map((h) => (
                        <div key={h.id} className={`bg-panel p-6 md:p-8 rounded-3xl shadow-sm border transition-all relative group ${h.status === 'Abandonada' ? 'border-red-500/50 hover:border-red-500 bg-red-900/5' : 'border-line hover:border-blue-300 dark:hover:border-blue-700'}`}>

                            <button
                                onClick={() => deleteHistoryItem(h.id)}
                                className="absolute top-6 right-6 text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors md:opacity-0 group-hover:opacity-100 bg-panel p-2 rounded-lg z-10"
                                title="Eliminar registro"
                            >
                                <Trash2 size={20} />
                            </button>

                            <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mt-2">
                                <div className="flex items-start gap-5 w-full lg:w-3/5">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl text-blue-600 dark:text-blue-400 hidden sm:block mt-1 border border-blue-100 dark:border-blue-800">
                                        <Beer size={32} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl font-black text-content truncate group-hover:text-amber-500 transition-colors" title={h.customName || h.recipeName}>
                                            {h.customName || h.recipeName || 'Lote Sin Nombre'}
                                        </h3>
                                        {h.customName && (
                                            <p className="text-[10px] uppercase font-black tracking-widest text-muted mt-0.5">{h.recipeName}</p>
                                        )}
                                        <div className="flex flex-wrap gap-2 mb-4 mt-3">
                                            <span className="bg-gray-100 dark:bg-slate-800 border border-line px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1.5"><CalendarClock size={16} /> {standardizeDate(h.dateBrewed || h.date)}</span>
                                            <span className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5"><Droplets size={16} /> {h.finalVolume || h.volume || 0} L</span>
                                            <span className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-lg text-sm font-black flex items-center gap-1.5">⚡ {h.efficiency || 0}% Eficiencia</span>
                                            <span className="bg-emerald-100 dark:bg-emerald-800/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 px-3 py-1.5 rounded-lg text-sm font-black flex items-center gap-1.5">💰 {formatCurrency((Number(h.totalCost) || 0) / (Number(h.finalVolume || h.volume) || 1))}/L</span>
                                        </div>

                                        <div className="flex gap-6 text-sm text-muted font-bold border-t border-line pt-4 mt-2">
                                            <span className="flex items-center gap-1">🎯 DO: <span className="text-content">{h.og || '-'}</span></span>
                                            <span className="flex items-center gap-1">🏁 DF: <span className="text-content">{h.fg || '-'}</span></span>
                                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">🍻 ABV: {h.abv || '-'}%</span>
                                        </div>

                                    </div>
                                </div>

                                <div className={`w-full lg:w-2/5 flex flex-col justify-between h-full bg-surface p-5 rounded-2xl border ${h.status === 'Abandonada' ? 'border-red-900/20' : 'border-slate-100 dark:border-slate-700'}`}>
                                    {h.status === 'Abandonada' ? (
                                        <div className="text-center py-5">
                                            <p className="text-red-400 font-bold mb-2">Evaluación Desactivada</p>
                                            <p className="text-muted text-sm italic py-2 px-4">"{h.notes || 'El lote no superó el proceso de producción.'}"</p>
                                        </div>
                                    ) : h.tasting ? (
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Evaluación Final:</span>
                                                <div className="flex items-center">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Star key={star} size={18} className={(Number(h.tasting.rating) || 0) >= star ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-slate-600"} />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-content text-sm font-medium italic leading-relaxed mb-4">"{h.tasting.notes || ''}"</p>

                                            {h.productionNotes && (
                                                <div className="mt-4 pt-4 border-t border-line">
                                                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-2">Notas de Producción</span>
                                                    <p className="text-slate-600 dark:text-slate-400 text-xs font-medium whitespace-pre-line bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                                                        {h.productionNotes}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-5">
                                            {h.productionNotes && (
                                                <div className="mb-4 text-left">
                                                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-1">Notas de Producción</span>
                                                    <p className="text-slate-600 dark:text-slate-400 text-xs font-medium whitespace-pre-line bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                                                        {h.productionNotes}
                                                    </p>
                                                </div>
                                            )}
                                            <p className="text-slate-400 font-bold mb-4">Aún no evaluada</p>
                                            {!tastingFormId && (
                                                <button
                                                    onClick={() => { setTastingFormId(h.id); setTastingData({ rating: 0, notes: '' }); }}
                                                    className="text-white text-sm font-bold bg-amber-500 hover:bg-amber-600 px-6 py-3 rounded-xl transition-colors shadow-sm inline-flex items-center gap-2"
                                                >
                                                    <Star size={18} className="fill-white" /> Anotar Cata
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ANALÍTICA DETALLADA DE PASOS */}
                            <div className="mt-6 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-line">
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setExpandedBatchId(expandedBatchId === h.id ? null : h.id)}
                                        className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:text-blue-500 flex items-center gap-2"
                                    >
                                        {expandedBatchId === h.id ? 'Ocultar Detalles' : 'Ver Detalles de Proceso'}
                                    </button>
                                </div>
                                <button
                                    onClick={() => exportToExcel(h)}
                                    className="text-[10px] font-black uppercase tracking-widest bg-blue-600 dark:bg-blue-900/40 text-white dark:text-blue-300 hover:bg-blue-500 dark:hover:bg-blue-800 px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-sm"
                                >
                                    <Download size={14} /> Descargar Reporte Excel
                                </button>
                            </div>

                            {expandedBatchId === h.id && (
                                <div className="mt-4 grid md:grid-cols-3 gap-6 p-6 bg-surface rounded-2xl border border-line animate-slideIn">
                                    {['cooking', 'fermenting', 'bottling'].map(phase => {
                                        let rawMetrics = h[`${phase}_metrics`];

                                        // Fallback para lotes antiguos que usaban 'stepsMetrics' para cocción
                                        if (phase === 'cooking' && (!rawMetrics || rawMetrics.length === 0)) {
                                            rawMetrics = h.stepsMetrics || [];
                                        } else if (!rawMetrics) {
                                            rawMetrics = [];
                                        }

                                        const metrics = (Array.isArray(rawMetrics) ? rawMetrics : Object.values(rawMetrics))
                                            .sort((a, b) => (a.stepIdx || 0) - (b.stepIdx || 0));

                                        if (metrics.length === 0) return null;

                                        return (
                                            <div key={phase} className="space-y-4">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${phase === 'cooking' ? 'bg-amber-500' : phase === 'fermenting' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                                    {phase === 'cooking' ? 'Cocción' : phase === 'fermenting' ? 'Fermentación' : 'Embotellado'}
                                                </h4>
                                                <div className="space-y-2">
                                                    {metrics.map((m, idx) => (
                                                        <div key={idx} className="bg-panel p-3 rounded-xl border border-line text-xs">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="font-black text-content truncate max-w-[120px]">{m.title}</span>
                                                                <span className="text-[10px] text-muted font-mono">
                                                                    {m.actual ? (m.actual >= 3600 ? `${(m.actual / 3600).toFixed(1)}h` : `${Math.floor(m.actual / 60)}m`) : 'N/A'}
                                                                </span>
                                                            </div>
                                                            <div className="w-full bg-line h-1 rounded-full overflow-hidden flex">
                                                                <div
                                                                    className={`h-full ${m.actual > m.planned * 1.2 ? 'bg-red-500' : m.actual > m.planned * 1.05 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                                    style={{ width: `${Math.min(100, (m.actual / (m.planned || 1)) * 100)}%` }}
                                                                />
                                                            </div>
                                                            <div className="flex justify-between mt-1 text-[9px] font-bold text-muted uppercase">
                                                                <span>Meta: {m.planned >= 3600 ? `${(m.planned / 3600).toFixed(1)}h` : `${Math.floor(m.planned / 60)}m`}</span>
                                                                <span className={m.actual > m.planned * 1.2 ? 'text-red-500' : m.actual > m.planned * 1.05 ? 'text-amber-500' : 'text-emerald-500'}>
                                                                    {m.actual ? `${Math.round((m.actual / (m.planned || 1)) * 100)}%` : '-'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {tastingFormId === h.id && (
                                <div className="mt-8 pt-6 border-t border-dashed border-line animate-fadeIn">
                                    <h4 className="font-black text-content mb-4 flex items-center gap-2 text-lg"><Star className="text-amber-500 fill-amber-500" size={24} /> Notas de Degustación</h4>
                                    <div className="flex gap-2 mb-5 bg-surface w-fit p-3 rounded-2xl border border-line">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button key={star} onClick={() => setTastingData({ ...tastingData, rating: star })}>
                                                <Star size={36} className={`transition-transform hover:scale-110 ${star <= tastingData.rating ? "fill-amber-400 text-amber-400 drop-shadow-sm" : "text-gray-300 dark:text-slate-600"}`} />
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        className="w-full p-4 border border-line rounded-xl focus:ring-2 focus:ring-amber-500 outline-none mb-4 text-base font-medium bg-surface text-content resize-none"
                                        rows="3"
                                        placeholder="¿Qué tal el aroma a lúpulo? ¿Cuerpo sedoso? ¿Retención de espuma?"
                                        value={tastingData.notes}
                                        onChange={(e) => setTastingData({ ...tastingData, notes: e.target.value })}
                                    ></textarea>
                                    <div className="flex justify-end gap-3">
                                        <button onClick={() => setTastingFormId(null)} className="px-6 py-3 text-muted hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold transition-colors">Cancelar</button>
                                        <button onClick={saveTasting} className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black shadow-md transition-colors">Guardar Evaluación</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
