// /src/components/views/ActiveBatchesView.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Hourglass, ArrowLeft, Beaker, CalendarClock, CalendarPlus, Activity, Trash2, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { standardizeDate, getFormattedDate } from '../../utils/formatters';
import { getThemeForCategory } from '../../utils/helpers';

export default function ActiveBatchesView() {
    const navigate = useNavigate();
    const { activeBatches, setActiveBatches, history, setHistory, updateCloudData } = useAppContext();

    // Helper local que estaba en App.jsx para calendar
    const generateGoogleCalendarLink = (title, daysFromNow, startTimestamp, details) => {
        const date = new Date(startTimestamp + daysFromNow * 24 * 60 * 60 * 1000);
        const end = new Date(date.getTime() + 60 * 60 * 1000); // +1 hour
        const format = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
        const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
        return `${base}&text=${encodeURIComponent(title)}&dates=${format(date)}/${format(end)}&details=${encodeURIComponent(details)}`;
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 dark:border-slate-700 pb-4 gap-4">
                <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                    <Hourglass className="text-emerald-500" size={32} /> Lotes en Proceso
                </h2>
                <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 font-bold bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors shadow-sm w-full md:w-auto justify-center">
                    <ArrowLeft size={20} /> Volver al Panel
                </button>
            </div>

            {activeBatches.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl text-center shadow-sm border border-gray-100 dark:border-slate-800">
                    <Beaker size={72} className="mx-auto text-emerald-100 dark:text-emerald-900/30 mb-5" />
                    <h3 className="text-2xl font-black text-slate-700 dark:text-slate-300 mb-2">No hay cervezas fermentando</h3>
                    <p className="text-slate-500 dark:text-slate-500 font-medium">Ve a "Mis Recetas", elige una y presiona "¡Empezar a Cocinar!".</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {activeBatches.map(batch => {
                        const daysElapsed = Math.floor((Date.now() - batch.timestamp) / (1000 * 60 * 60 * 24));
                        const theme = getThemeForCategory(batch.category);

                        return (
                            <div key={batch.id} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border-l-8 border-emerald-500 border-y border-r border-gray-100 dark:border-slate-800 relative overflow-hidden group">
                                <div className="absolute -right-10 -top-10 opacity-5 dark:opacity-10 text-emerald-500 pointer-events-none">
                                    <Hourglass size={150} />
                                </div>

                                <div className="flex flex-col lg:flex-row justify-between gap-8 relative z-10">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${theme.badge}`}>{batch.category}</span>
                                            <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 animate-pulse"><Activity size={12} /> Fermentando</span>
                                        </div>
                                        <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-2">{batch.recipeName}</h3>
                                        <p className="text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2 mb-6">
                                            <CalendarClock size={16} /> Cocinada el: {standardizeDate(batch.date)} <span className="opacity-50">•</span> <span className="text-emerald-600 dark:text-emerald-400">Día {daysElapsed}</span>
                                        </p>

                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6">
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><CalendarPlus size={16} /> Sincronizar Calendario</h4>
                                            <div className="flex flex-wrap gap-2">
                                                <a href={generateGoogleCalendarLink(`Dry Hop - ${batch.recipeName}`, 3, batch.timestamp, `Revisar actividad de fermentación y agregar lúpulo para ${batch.recipeName}.`)} target="_blank" rel="noreferrer" className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm">
                                                    Dry Hop (Día 3)
                                                </a>
                                                <a href={generateGoogleCalendarLink(`Medir Densidad - ${batch.recipeName}`, 7, batch.timestamp, `Medir gravedad específica de ${batch.recipeName}. Si está estable, preparar Cold Crash.`)} target="_blank" rel="noreferrer" className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:border-amber-400 hover:text-amber-600 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm">
                                                    Medir DF (Día 7)
                                                </a>
                                                <a href={generateGoogleCalendarLink(`Cold Crash - ${batch.recipeName}`, 10, batch.timestamp, `Bajar temperatura a 1-2°C para clarificar ${batch.recipeName}.`)} target="_blank" rel="noreferrer" className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:border-indigo-400 hover:text-indigo-600 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm">
                                                    Cold Crash (Día 10)
                                                </a>
                                                <a href={generateGoogleCalendarLink(`Embotellar - ${batch.recipeName}`, 14, batch.timestamp, `Lavar botellas, preparar almíbar (priming) y embotellar ${batch.recipeName}.`)} target="_blank" rel="noreferrer" className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:border-emerald-400 hover:text-emerald-600 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm">
                                                    Embotellar (Día 14)
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-end gap-3 min-w-[200px]">
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`¿Seguro que deseas embotellar y mover ${batch.recipeName} al Historial definitivo?`)) {
                                                    const newHistoryItem = {
                                                        ...batch,
                                                        dateBrewed: batch.dateBrewed || batch.date,
                                                        dateBottled: getFormattedDate(),
                                                        date: batch.dateBrewed || batch.date,
                                                        id: 'hist-' + Date.now(),
                                                        notes: `Embotellada en el Día ${daysElapsed}`,
                                                        status: 'Embotellada'
                                                    };
                                                    const newHistory = [newHistoryItem, ...history];
                                                    const newActive = activeBatches.filter(b => b.id !== batch.id);
                                                    setHistory(newHistory);
                                                    setActiveBatches(newActive);
                                                    updateCloudData({ history: newHistory, activeBatches: newActive });
                                                    alert("¡Lote embotellado con éxito!");
                                                    navigate('/history');
                                                }
                                            }}
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl shadow-md transition-all hover:-translate-y-1 w-full flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 size={20} /> Embotellar Lote
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm("¿Seguro que deseas ELIMINAR este lote? No se guardará en el historial.")) {
                                                    const newActive = activeBatches.filter(b => b.id !== batch.id);
                                                    setActiveBatches(newActive);
                                                    updateCloudData({ activeBatches: newActive });
                                                }
                                            }}
                                            className="bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-500 font-bold py-3 rounded-xl transition-colors w-full flex items-center justify-center gap-2"
                                        >
                                            <Trash2 size={18} /> Descartar Lote
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
