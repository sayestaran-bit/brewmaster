// /src/components/views/ActiveBatchesView.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Hourglass, ArrowLeft, Beaker, CalendarClock, CalendarPlus, Activity, Trash2, CheckCircle2, Package, ArrowRight } from 'lucide-react';
import { useActiveBatches } from '../../hooks/useActiveBatches';
import { useRecipes } from '../../hooks/useRecipes';
import { useInventory } from '../../hooks/useInventory';
import { standardizeDate, getFormattedDate, formatTime } from '../../utils/formatters';
import { getThemeForCategory } from '../../utils/helpers';

function LiveTimer({ batch }) {
    const [timeLeft, setTimeLeft] = React.useState(0);

    React.useEffect(() => {
        const calculateTime = () => {
            if (!batch.timer?.isRunning || !batch.timer?.targetEndTime) {
                return batch.timeLeft || 0;
            }
            const now = Date.now();
            return Math.max(0, Math.floor((batch.timer.targetEndTime - now) / 1000));
        };

        setTimeLeft(calculateTime());

        if (batch.timer?.isRunning) {
            const interval = setInterval(() => {
                const remaining = calculateTime();
                setTimeLeft(remaining);
                if (remaining <= 0) clearInterval(interval);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [batch.timer, batch.timeLeft]);

    return (
        <p className="text-xl font-black text-amber-500 leading-none tabular-nums">
            {timeLeft > 86400 ? `${Math.floor(timeLeft / 86400)}d ${formatTime(timeLeft % 86400)}` : formatTime(timeLeft)}
        </p>
    );
}

function ElapsedTimer({ startTime, label, colorClass = "text-muted" }) {
    const [elapsed, setElapsed] = React.useState(0);

    React.useEffect(() => {
        const calculate = () => {
            if (!startTime) return 0;
            const start = typeof startTime.toMillis === 'function' ? startTime.toMillis() : startTime;
            return Math.floor((Date.now() - start) / 1000);
        };

        setElapsed(calculate());
        const interval = setInterval(() => setElapsed(calculate()), 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    const formatElapsed = (s) => {
        const days = Math.floor(s / 86400);
        const hours = Math.floor((s % 86400) / 3600);
        const minutes = Math.floor((s % 3600) / 60);
        const seconds = s % 60;

        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
        return `${minutes}m ${seconds}s`;
    };

    return (
        <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted/60">{label}</span>
            <span className={`text-sm font-bold tabular-nums ${colorClass}`}>{formatElapsed(elapsed)}</span>
        </div>
    );
}

export default function ActiveBatchesView() {
    const navigate = useNavigate();
    const { batches: activeBatches, completeBatch, discardBatch, transitionBatchPhase, updateBatchField, updateProgress } = useActiveBatches();
    const { recipes } = useRecipes();
    const { deductBatch } = useInventory();

    const generateGoogleCalendarLink = (title, daysFromNow, startTimestamp, details) => {
        const date = new Date(startTimestamp + daysFromNow * 24 * 60 * 60 * 1000);
        const end = new Date(date.getTime() + 60 * 60 * 1000);
        const format = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
        const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
        return `${base}&text=${encodeURIComponent(title)}&dates=${format(date)}/${format(end)}&details=${encodeURIComponent(details)}`;
    };

    // Separar por fases
    const cookingBatches = activeBatches.filter(b => b.phase === 'cooking');
    const fermentingBatches = activeBatches.filter(b => b.phase === 'fermenting' || (!b.phase && b.status === 'Fermentando'));
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
                await updateBatchField(batch.id, {
                    phase: 'bottling',
                    currentStep: 0,
                    timeLeft: 0,
                    'timer.isRunning': false,
                    'timer.targetEndTime': null,
                    'timer.pausedAt': null,
                    'phaseTimestamps.bottlingStart': Date.now()
                });
                // transitionBatchPhase is redundant now but kept for consistency if needed, 
                // but direct updateBatchField is more precise here.
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

    const renderBatchCard = (batch, phaseType) => {
        const getMillis = (val) => val && typeof val.toMillis === 'function' ? val.toMillis() : (val || Date.now());

        let startDateTimestamp = batch.timestamp;
        if (phaseType === 'bottling' && batch.phaseTimestamps?.bottlingStart) {
            startDateTimestamp = getMillis(batch.phaseTimestamps.bottlingStart);
        } else if (phaseType === 'fermenting' && batch.phaseTimestamps?.fermentationStart) {
            startDateTimestamp = getMillis(batch.phaseTimestamps.fermentationStart);
        }

        const daysElapsed = Math.floor((Date.now() - startDateTimestamp) / (1000 * 60 * 60 * 24));
        const theme = getThemeForCategory(batch.category);

        return (
            <div key={batch.id} className={`bg-panel p-6 md:p-8 rounded-3xl shadow-sm border-l-8 ${phaseType === 'bottling' ? 'border-blue-500' : phaseType === 'fermenting' ? 'border-emerald-500' : 'border-amber-500'} border-y border-r border-line relative overflow-hidden group`}>
                <div className={`absolute -right-10 -top-10 opacity-5 dark:opacity-10 pointer-events-none ${phaseType === 'bottling' ? 'text-blue-500' : phaseType === 'fermenting' ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {phaseType === 'bottling' ? <Package size={150} /> : phaseType === 'fermenting' ? <Hourglass size={150} /> : <Beaker size={150} />}
                </div>

                <div className="flex flex-col lg:flex-row justify-between gap-8 relative z-10">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${theme.badge}`}>{batch.category}</span>
                            <span className={`${phaseType === 'bottling' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' : phaseType === 'fermenting' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'} px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 animate-pulse`}>
                                <Activity size={12} /> {phaseType === 'bottling' ? 'Envasando' : phaseType === 'fermenting' ? 'Fermentando' : 'Cocinando'}
                            </span>
                        </div>
                        <div className="flex flex-1 min-w-0 items-baseline gap-2">
                            <h3 className="text-3xl font-black text-content truncate transition-colors" title={batch.customName || batch.recipeName}>
                                {batch.customName || batch.recipeName}
                            </h3>
                            {batch.customName && (
                                <span className="text-sm font-bold text-muted truncate">({batch.recipeName})</span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-6 mb-6">
                            <p className="text-muted font-bold flex items-center gap-2">
                                <CalendarClock size={16} />
                                {phaseType === 'bottling' ? 'Envasado el:' : 'Iniciado el:'} {standardizeDate(batch.dateBrewed || batch.date)}
                            </p>
                            <div className="flex gap-4 border-l border-line pl-4">
                                <ElapsedTimer
                                    startTime={batch.timestamp}
                                    label="Tiempo Total Lote"
                                    colorClass="text-content"
                                />
                                <ElapsedTimer
                                    startTime={startDateTimestamp}
                                    label={`En ${phaseType === 'bottling' ? 'Envasado' : phaseType === 'fermenting' ? 'Fermentación' : 'Cocción'}`}
                                    colorClass={phaseType === 'bottling' ? 'text-blue-500' : phaseType === 'fermenting' ? 'text-emerald-500' : 'text-amber-500'}
                                />
                            </div>
                        </div>

                        {(batch.timeLeft !== undefined || batch.timer) && (
                            <div className={`p-4 rounded-2xl mb-6 flex items-center justify-between border ${phaseType === 'bottling' ? 'bg-blue-500/10 border-blue-500/20' :
                                phaseType === 'fermenting' ? 'bg-emerald-500/10 border-emerald-500/20' :
                                    'bg-amber-500/10 border-amber-500/20'
                                }`}>
                                <div>
                                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${phaseType === 'bottling' ? 'text-blue-600 dark:text-blue-400' :
                                        phaseType === 'fermenting' ? 'text-emerald-600 dark:text-emerald-400' :
                                            'text-amber-600 dark:text-amber-400'
                                        }`}>
                                        {batch.timer?.isRunning ? 'Cronómetro en Marcha' : 'Temporizador Pausado'}
                                    </h4>
                                    <p className="text-sm font-bold text-content leading-none">
                                        Paso {(batch.currentStep || 0) + 1}: {recipes.find(r => r.id === batch.recipeId)?.steps?.filter(s => s.phase === (batch.phase || 'cooking'))?.[batch.currentStep || 0]?.title || (batch.phase === 'bottling' ? 'Envasado' : batch.phase === 'fermenting' ? 'Fermentación' : 'Proceso')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${phaseType === 'bottling' ? 'text-blue-600 dark:text-blue-400' :
                                        phaseType === 'fermenting' ? 'text-emerald-600 dark:text-emerald-400' :
                                            'text-amber-600 dark:text-amber-400'
                                        }`}>Tiempo Restante</h4>
                                    <LiveTimer batch={batch} />
                                </div>
                            </div>
                        )}

                        {phaseType === 'fermenting' && (
                            <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-line mb-6">
                                <h4 className="text-xs font-black text-muted uppercase tracking-widest mb-3 flex items-center gap-2"><CalendarPlus size={16} /> Calendario Sugerido (Recipe Based)</h4>
                                <div className="flex flex-wrap gap-2">
                                    {(() => {
                                        const recipe = recipes.find(r => r.id === batch.recipeId);
                                        const fermStep = recipe?.steps?.find(s => s.phase === 'fermenting');
                                        const fermDays = parseFloat(fermStep?.duration) || 14;

                                        // Intentar buscar alertas de Dry Hop en el texto si no hay un paso de DH
                                        const dhMatch = fermStep?.details?.match(/dry\s*hop(?:\s*al)?\s*d[ií]a\s*(\d+)/i);
                                        const dhDay = dhMatch ? parseInt(dhMatch[1]) : 3;

                                        return (
                                            <>
                                                <a href={generateGoogleCalendarLink(`Dry Hop - ${batch.recipeName}`, dhDay, batch.timestamp, `Revisar actividad de fermentación y agregar lúpulo para ${batch.recipeName}.`)} target="_blank" rel="noreferrer" className="bg-surface border border-line hover:border-blue-400 hover:text-blue-600 text-content px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
                                                    Dry Hop (Día {dhDay})
                                                </a>
                                                <a href={generateGoogleCalendarLink(`Medir DF - ${batch.recipeName}`, Math.floor(fermDays * 0.7), batch.timestamp, `Medir gravedad específica de ${batch.recipeName}. Si está estable, preparar Cold Crash.`)} target="_blank" rel="noreferrer" className="bg-surface border border-line hover:border-amber-400 hover:text-amber-600 text-content px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
                                                    Medir DF (Día {Math.floor(fermDays * 0.7)})
                                                </a>
                                                <a href={generateGoogleCalendarLink(`Embotellar - ${batch.recipeName}`, fermDays, batch.timestamp, `Lavar botellas, preparar almíbar (priming) y embotellar ${batch.recipeName}.`)} target="_blank" rel="noreferrer" className="bg-surface border border-line hover:border-emerald-400 hover:text-emerald-600 text-content px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
                                                    Alerta Embotellar (Día {fermDays})
                                                </a>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col justify-end gap-3 min-w-[200px]">
                        {phaseType === 'cooking' ? (
                            <button
                                onClick={() => navigate(`/brew/${batch.id}?phase=cooking`)}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-xl shadow-md transition-all hover:-translate-y-1 w-full flex items-center justify-center gap-2"
                            >
                                <Beaker size={20} /> Continuar Cocción
                            </button>
                        ) : phaseType === 'fermenting' ? (
                            <button
                                onClick={() => navigate(`/brew/${batch.id}?phase=fermenting`)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl shadow-md transition-all hover:-translate-y-1 w-full flex items-center justify-center gap-2"
                            >
                                <Activity size={20} /> Diario de Fermentación
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate(`/brew/${batch.id}?phase=bottling`)}
                                className="bg-blue-500 hover:bg-blue-600 text-white font-black py-4 rounded-xl shadow-md transition-all hover:-translate-y-1 w-full flex items-center justify-center gap-2"
                            >
                                <Package size={20} /> Diario de Envasado
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
                    {/* SECCIÓN COCINANDO */}
                    {cookingBatches.length > 0 && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-content flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                                <Beaker className="text-amber-500" size={24} /> En Cocción
                            </h3>
                            <div className="grid gap-6">
                                {cookingBatches.map(b => renderBatchCard(b, 'cooking'))}
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN FERMENTANDO */}
                    {fermentingBatches.length > 0 && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-content flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
                                <Activity className="text-emerald-500" size={24} /> En Fermentación
                            </h3>
                            <div className="grid gap-6">
                                {fermentingBatches.map(b => renderBatchCard(b, 'fermenting'))}
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
                                {bottlingBatches.map(b => renderBatchCard(b, 'bottling'))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
