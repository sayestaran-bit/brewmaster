// /src/components/views/HistoryView.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, ArrowLeft, CalendarClock, Trash2, Beer, Droplets, Star } from 'lucide-react';
import { useHistory } from '../../hooks/useHistory';
import { formatCurrency, standardizeDate } from '../../utils/formatters';

export default function HistoryView() {
    const navigate = useNavigate();
    const { history, deleteEntry, updateTasting } = useHistory();

    const [tastingFormId, setTastingFormId] = useState(null);
    const [tastingData, setTastingData] = useState({ rating: 0, notes: '' });

    const deleteHistoryItem = async (id) => {
        if (window.confirm("¿Seguro que deseas eliminar el historial de este lote? Esta acción no devolverá insumos al inventario.")) {
            await deleteEntry(id);
        }
    };

    const saveTasting = async () => {
        await updateTasting(tastingFormId, tastingData);
        setTastingFormId(null);
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 dark:border-slate-700 pb-4 gap-4">
                <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                    <History className="text-blue-600" size={32} /> Historial de Producción
                </h2>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 font-bold bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors shadow-sm w-full md:w-auto justify-center"
                >
                    <ArrowLeft size={20} /> Volver al Panel
                </button>
            </div>

            {history.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl text-center shadow-sm border border-gray-100 dark:border-slate-800">
                    <CalendarClock size={72} className="mx-auto text-gray-300 dark:text-slate-700 mb-5" />
                    <h3 className="text-2xl font-black text-slate-700 dark:text-slate-300 mb-2">Aún no hay lotes registrados</h3>
                    <p className="text-slate-500 dark:text-slate-500 font-medium">Inicia un "Día de Cocción" desde cualquier receta y guárdala al finalizar.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {[...history].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).map((h) => (
                        <div key={h.id} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all relative group">

                            <button
                                onClick={() => deleteHistoryItem(h.id)}
                                className="absolute top-6 right-6 text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors md:opacity-0 group-hover:opacity-100 bg-white dark:bg-slate-800 p-2 rounded-lg"
                                title="Eliminar registro"
                            >
                                <Trash2 size={20} />
                            </button>

                            <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
                                <div className="flex items-start gap-5 w-full lg:w-3/5">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl text-blue-600 dark:text-blue-400 hidden sm:block mt-1 border border-blue-100 dark:border-blue-800">
                                        <Beer size={32} />
                                    </div>
                                    <div className="w-full pr-8 md:pr-0">
                                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3">{h.recipeName || 'Lote Sin Nombre'}</h3>

                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <span className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1.5"><CalendarClock size={16} /> 🔥 Cocción: {standardizeDate(h.dateBrewed || h.date)}</span>
                                            {h.dateBottled && (
                                                <span className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg text-sm text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1.5">🍾 Embotellado: {standardizeDate(h.dateBottled)}</span>
                                            )}
                                            <span className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5"><Droplets size={16} /> {h.volume || 0} L</span>
                                            <span className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-lg text-sm font-black flex items-center gap-1.5">💰 Total: {formatCurrency(h.totalCost)}</span>
                                            <span className="bg-emerald-100 dark:bg-emerald-800/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 px-3 py-1.5 rounded-lg text-sm font-black flex items-center gap-1.5 text-xs uppercase tracking-wider">🏷️ x Litro: {formatCurrency((Number(h.totalCost) || 0) / (Number(h.volume) || 1))}</span>
                                        </div>

                                        <div className="flex gap-6 text-sm text-slate-500 dark:text-slate-400 font-bold border-t border-gray-100 dark:border-slate-800 pt-4 mt-2">
                                            <span className="flex items-center gap-1">🎯 DO: <span className="text-slate-800 dark:text-white">{h.og || '-'}</span></span>
                                            <span className="flex items-center gap-1">🏁 DF: <span className="text-slate-800 dark:text-white">{h.fg || '-'}</span></span>
                                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">🍻 ABV: {h.abv || '-'}%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full lg:w-2/5 flex flex-col justify-between h-full bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    {h.tasting ? (
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Evaluación Final:</span>
                                                <div className="flex items-center">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Star key={star} size={18} className={(Number(h.tasting.rating) || 0) >= star ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-slate-600"} />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-slate-700 dark:text-slate-300 text-sm font-medium italic leading-relaxed">"{h.tasting.notes || ''}"</p>
                                        </div>
                                    ) : (
                                        <div className="text-center py-5">
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

                            {tastingFormId === h.id && (
                                <div className="mt-8 pt-6 border-t border-dashed border-gray-200 dark:border-slate-700 animate-fadeIn">
                                    <h4 className="font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2 text-lg"><Star className="text-amber-500 fill-amber-500" size={24} /> Notas de Degustación</h4>
                                    <div className="flex gap-2 mb-5 bg-slate-50 dark:bg-slate-800 w-fit p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button key={star} onClick={() => setTastingData({ ...tastingData, rating: star })}>
                                                <Star size={36} className={`transition-transform hover:scale-110 ${star <= tastingData.rating ? "fill-amber-400 text-amber-400 drop-shadow-sm" : "text-gray-300 dark:text-slate-600"}`} />
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        className="w-full p-4 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none mb-4 text-base font-medium bg-gray-50 dark:bg-slate-800 text-slate-800 dark:text-white resize-none"
                                        rows="3"
                                        placeholder="¿Qué tal el aroma a lúpulo? ¿Cuerpo sedoso? ¿Retención de espuma?"
                                        value={tastingData.notes}
                                        onChange={(e) => setTastingData({ ...tastingData, notes: e.target.value })}
                                    ></textarea>
                                    <div className="flex justify-end gap-3">
                                        <button onClick={() => setTastingFormId(null)} className="px-6 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold transition-colors">Cancelar</button>
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
