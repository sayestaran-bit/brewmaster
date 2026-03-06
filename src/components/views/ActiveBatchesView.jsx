// /src/components/views/ActiveBatchesView.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Hourglass, ArrowLeft, Beaker, CalendarClock, CalendarPlus, Activity, Trash2, CheckCircle2, Package, ArrowRight } from 'lucide-react';
import { useActiveBatches } from '../../hooks/useActiveBatches';
import { useRecipes } from '../../hooks/useRecipes';
import { useInventory } from '../../hooks/useInventory';
import { standardizeDate, getFormattedDate } from '../../utils/formatters';
import { getThemeForCategory } from '../../utils/helpers';

export default function ActiveBatchesView() {
    const navigate = useNavigate();
    const { batches: activeBatches, completeBatch, discardBatch, transitionBatchPhase } = useActiveBatches();
    const { recipes } = useRecipes();
    const { deductBatch } = useInventory();

    const generateGoogleCalendarLink = (title, daysFromNow, startTimestamp, details) => {
        const date = new Date(startTimestamp + daysFromNow * 24 * 60 * 60 * 1000);
        const end = new Date(date.getTime() + 60 * 60 * 1000);
        const format = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
        const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
        return `${base}&text=${encodeURIComponent(title)}&dates=${format(date)}/${format(end)}&details=${encodeURIComponent(details)}`;
    };

    // Separar por fases (Lotes antiguos sin 'phase' asumen 'fermenting')
    const fermentingBatches = activeBatches.filter(b => !b.phase || b.phase === 'fermenting');
    const bottlingBatches = activeBatches.filter(b => b.phase === 'bottling');

    const handleStartBottling = async (batch) => {
        const recipe = recipes.find(r => r.id === batch.recipeId);
        if (!recipe) {
            alert("No se encontró la receta original para descontar insumos de embotellado.");
            return;
        }

        if (window.confirm(`¿Seguro que deseas empezar a embotellar ${batch.recipeName}? Esto descontará insumos finales (chapas, clarificantes, etc).`)) {
            try {
                await deductBatch(recipe, batch.volume, ['bottling']);
                await transitionBatchPhase(batch.id, 'bottling');
            } catch (error) {
                alert("Hubo un error descontando insumos: " + error.message);
            }
        }
    };

    const getMillis = (val) => val && typeof val.toMillis === 'function' ? val.toMillis() : (val || Date.now());

    const handleCompleteBatch = async (batch) => {
        if (window.confirm(`¿Lote acondicionado? Mover ${batch.recipeName} al Historial definitivo.`)) {
            try {
                const daysElapsedTotal = Math.floor((Date.now() - batch.timestamp) / (1000 * 60 * 60 * 24));
                const newHistoryItem = {
                    ...batch,
                    dateBrewed: batch.dateBrewed || batch.date,
                    dateBottled: getFormattedDate(),
                    date: batch.dateBrewed || batch.date,
                    notes: `Completado en el Día ${daysElapsedTotal}`,
                    status: 'Completada',
                    // Optional: precalculate metrics
                    metrics: {
                        daysInFermentation: batch.phaseTimestamps?.fermentationStart
                            ? Math.floor((getMillis(batch.phaseTimestamps.bottlingStart) - getMillis(batch.phaseTimestamps.fermentationStart)) / 86400000)
                            : null
                    }
                };
                await completeBatch(batch.id, newHistoryItem);
                alert("¡Lote enviado al historial!");
                navigate('/history');
            } catch (error) {
                alert("Error al completar lote: " + error);
            }
        }
    };

    const renderBatchCard = (batch, isBottling) => {
        const getMillis = (val) => val && typeof val.toMillis === 'function' ? val.toMillis() : (val || Date.now());
        const startDateTimestamp = isBottling && batch.phaseTimestamps?.bottlingStart
            ? getMillis(batch.phaseTimestamps.bottlingStart)
            : batch.timestamp;

        const daysElapsed = Math.floor((Date.now() - startDateTimestamp) / (1000 * 60 * 60 * 24));
        const theme = getThemeForCategory(batch.category);

        return (
            <div key={batch.id} className={`bg-panel p-6 md:p-8 rounded-3xl shadow-sm border-l-8 ${isBottling ? 'border-blue-500' : 'border-emerald-500'} border-y border-r border-line relative overflow-hidden group`}>
                <div className={`absolute -right-10 -top-10 opacity-5 dark:opacity-10 pointer-events-none ${isBottling ? 'text-blue-500' : 'text-emerald-500'}`}>
                    {isBottling ? <Package size={150} /> : <Hourglass size={150} />}
                </div>

                <div className="flex flex-col lg:flex-row justify-between gap-8 relative z-10">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${theme.badge}`}>{batch.category}</span>
                            <span className={`${isBottling ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'} px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 animate-pulse`}>
                                <Activity size={12} /> {isBottling ? 'Acondicionando' : 'Fermentando'}
                            </span>
                        </div>
                        <h3 className="text-3xl font-black text-content mb-2">{batch.recipeName}</h3>
                        <p className="text-muted font-bold flex items-center gap-2 mb-6">
                            <CalendarClock size={16} />
                            {isBottling ? 'Embotellado el:' : 'Cocinada el:'} {standardizeDate(batch.dateBrewed || batch.date)}
                            <span className="opacity-50">•</span>
                            <span className={isBottling ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"}>Día {daysElapsed} en fase</span>
                        </p>

                        {!isBottling && (
                            <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-line mb-6">
                                <h4 className="text-xs font-black text-muted uppercase tracking-widest mb-3 flex items-center gap-2"><CalendarPlus size={16} /> Calendario de Fermentación</h4>
                                <div className="flex flex-wrap gap-2">
                                    <a href={generateGoogleCalendarLink(`Dry Hop - ${batch.recipeName}`, 3, batch.timestamp, `Revisar actividad de fermentación y agregar lúpulo para ${batch.recipeName}.`)} target="_blank" rel="noreferrer" className="bg-surface border border-line hover:border-blue-400 hover:text-blue-600 text-content px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
                                        Dry Hop (Día 3)
                                    </a>
                                    <a href={generateGoogleCalendarLink(`Medir DF - ${batch.recipeName}`, 7, batch.timestamp, `Medir gravedad específica de ${batch.recipeName}. Si está estable, preparar Cold Crash.`)} target="_blank" rel="noreferrer" className="bg-surface border border-line hover:border-amber-400 hover:text-amber-600 text-content px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
                                        Medir DF (Día 7)
                                    </a>
                                    <a href={generateGoogleCalendarLink(`Embotellar - ${batch.recipeName}`, 14, batch.timestamp, `Lavar botellas, preparar almíbar (priming) y embotellar ${batch.recipeName}.`)} target="_blank" rel="noreferrer" className="bg-surface border border-line hover:border-emerald-400 hover:text-emerald-600 text-content px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
                                        Alerta Embotellar (Día 14)
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col justify-end gap-3 min-w-[200px]">
                        {isBottling ? (
                            <button
                                onClick={() => navigate(`/brew/${batch.id}?phase=bottling`)}
                                className="bg-blue-500 hover:bg-blue-600 text-white font-black py-4 rounded-xl shadow-md transition-all hover:-translate-y-1 w-full flex items-center justify-center gap-2"
                            >
                                <Package size={20} /> Diario de Envasado
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate(`/brew/${batch.id}?phase=fermenting`)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl shadow-md transition-all hover:-translate-y-1 w-full flex items-center justify-center gap-2"
                            >
                                <Activity size={20} /> Diario de Fermentación
                            </button>
                        )}
                        <button
                            onClick={async () => {
                                if (window.confirm("¿Seguro que deseas ABANDONAR este lote? Se guardará en el historial como 'Abandonada' conservando tu registro de costos.")) {
                                    const daysElapsedTotal = Math.floor((Date.now() - batch.timestamp) / (1000 * 60 * 60 * 24));
                                    const historyEntry = {
                                        ...batch,
                                        dateBrewed: batch.dateBrewed || batch.date,
                                        date: batch.dateBrewed || batch.date,
                                        notes: `Lote abandonado en el Día ${daysElapsedTotal} de proceso.`,
                                        status: 'Abandonada'
                                    };
                                    await discardBatch(batch.id, historyEntry);
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
    };

    return (
        <div className="space-y-12 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-line pb-4 gap-4">
                <h2 className="text-3xl font-black text-content flex items-center gap-3">
                    <Hourglass className="text-emerald-500" size={32} /> Lotes en Proceso
                </h2>
                <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-muted hover:text-content font-bold bg-panel px-4 py-2 rounded-xl border border-line transition-colors shadow-sm w-full md:w-auto justify-center">
                    <ArrowLeft size={20} /> Volver al Panel
                </button>
            </div>

            {activeBatches.length === 0 ? (
                <div className="bg-panel p-12 rounded-3xl text-center shadow-sm border border-line">
                    <Beaker size={72} className="mx-auto text-emerald-100 dark:text-emerald-900/30 mb-5" />
                    <h3 className="text-2xl font-black text-content mb-2">No hay lotes en curso</h3>
                    <p className="text-muted font-medium">Ve a "Mis Recetas", elige una y presiona "¡Empezar a Cocinar!".</p>
                </div>
            ) : (
                <>
                    {/* SECCIÓN FERMENTANDO */}
                    {fermentingBatches.length > 0 && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-content flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
                                <Activity className="text-emerald-500" size={24} /> En Fermentación
                            </h3>
                            <div className="grid gap-6">
                                {fermentingBatches.map(b => renderBatchCard(b, false))}
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN EMBOTELLADO */}
                    {bottlingBatches.length > 0 && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-content flex items-center gap-2 border-l-4 border-blue-500 pl-3">
                                <Package className="text-blue-500" size={24} /> En Acondicionamiento / Embotellado
                            </h3>
                            <div className="grid gap-6">
                                {bottlingBatches.map(b => renderBatchCard(b, true))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
