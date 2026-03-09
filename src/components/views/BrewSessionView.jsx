import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Beaker, Info, Play, Pause, Save, SkipForward, ArrowLeft, AlertTriangle, Activity, Package, Trash2, CheckCircle2 } from 'lucide-react';
import { formatCurrency, standardizeDate, formatTime, getFormattedDate } from '../../utils/formatters';
import { calculateRecipeCost, calculateActualDeductedCost } from '../../utils/costCalculator';
import { useRecipes } from '../../hooks/useRecipes';
import { useInventory } from '../../hooks/useInventory';
import { useActiveBatches } from '../../hooks/useActiveBatches';

function ElapsedTimer({ startTime, label, colorClass = "text-slate-400" }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
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
        <div className="flex flex-col items-start px-4 border-l border-slate-700/50">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">{label}</span>
            <span className={`text-sm font-black tabular-nums ${colorClass}`}>{formatElapsed(elapsed)}</span>
        </div>
    );
}

export default function BrewSessionView() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { recipes } = useRecipes();
    const { inventory, deductBatch } = useInventory();
    const { batches, startBatch, transitionBatchPhase, completeBatch, updateBatchField, updateProgress } = useActiveBatches();

    const currentPhase = searchParams.get('phase') || 'cooking';

    const [recipe, setRecipe] = useState(null);
    const [batch, setBatch] = useState(null);
    const [targetVolume, setTargetVolume] = useState(20);
    const [stockWarnings, setStockWarnings] = useState([]);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [hasDismissedWarning, setHasDismissedWarning] = useState(false);

    const [brewState, setBrewState] = useState({
        stepIdx: 0,
        timeLeft: 0,
        isRunning: false
    });
    const [productionNotes, setProductionNotes] = useState('');

    const lockRunningRef = useRef(null);

    const stepsArray = useMemo(() => {
        if (!recipe) return [];
        const rawSteps = Array.isArray(recipe.steps) && recipe.steps.length > 0 ? recipe.steps : [];
        let filtered = rawSteps.filter(s => s.phase === currentPhase);

        if (currentPhase === 'cooking' && filtered.length === 0) {
            filtered = rawSteps.filter(s => !s.phase || s.phase === 'cooking');
            if (filtered.length === 0) {
                filtered = [{ title: "Cocción Genérica", desc: "Sigue tu instinto cervecero.", duration: 60 }];
            }
        }
        if (currentPhase !== 'cooking' && filtered.length === 0) {
            filtered = [{ title: `Fase de ${currentPhase === 'fermenting' ? 'Fermentación' : 'Embotellado'} genérica`, desc: "Sigue el proceso estándar o añade notas.", duration: null }];
        }
        return filtered;
    }, [recipe, currentPhase]);

    const safeStepIdx = stepsArray.length > 0 ? Math.min(brewState.stepIdx, stepsArray.length - 1) : 0;
    const step = stepsArray[safeStepIdx];
    const isLastStep = stepsArray.length > 0 && safeStepIdx === stepsArray.length - 1;

    useEffect(() => {
        if (recipes.length > 0) {
            let foundBatch = batches.find(b => b.id === id);
            let foundRecipe = null;

            if (foundBatch) {
                setBatch(foundBatch);
                foundRecipe = recipes.find(r => r.id === foundBatch.recipeId);
            } else if (currentPhase === 'cooking') {
                foundRecipe = recipes.find(r => r.id === id);
            }

            if (foundRecipe) {
                setRecipe(foundRecipe);

                const volParam = searchParams.get('vol');
                const vol = volParam ? Number(volParam) : (foundBatch ? foundBatch.volume : (foundRecipe.targetVolume || 20));
                setTargetVolume(vol);

                const currentStepIdx = foundBatch?.currentStep || 0;
                const safeIdx = Math.min(currentStepIdx, stepsArray.length - 1);
                const currentStep = stepsArray[safeIdx] || {};

                // FIX: Use 86400 (seconds in a day) for non-cooking phases
                const multiplier = currentPhase === 'cooking' ? 60 : 86400;
                const recipeDuration = currentStep.duration ? parseFloat(currentStep.duration) * multiplier : 0;
                let initialTime = recipeDuration;
                let dbIsRunning = false;

                if (foundBatch?.timer) {
                    dbIsRunning = foundBatch.timer.isRunning;
                    if (dbIsRunning && foundBatch.timer.targetEndTime) {
                        const now = Date.now();
                        initialTime = Math.max(0, Math.floor((foundBatch.timer.targetEndTime - now) / 1000));
                    } else if (foundBatch.timeLeft !== undefined) {
                        const isSameStep = brewState.stepIdx === safeIdx;
                        if (Number(foundBatch.timeLeft) > 0 || isSameStep) {
                            initialTime = Number(foundBatch.timeLeft);
                        }
                    }
                }

                setBrewState(prev => {
                    const isSameStep = prev.stepIdx === safeIdx;
                    let finalIsRunning = dbIsRunning;
                    const now = Date.now();
                    if (lockRunningRef.current && (now - lockRunningRef.current.time) < 3000) {
                        finalIsRunning = lockRunningRef.current.state;
                    }
                    const timeDrift = Math.abs(prev.timeLeft - initialTime);

                    if (!isSameStep) {
                        return { stepIdx: safeIdx, timeLeft: initialTime, isRunning: finalIsRunning };
                    }

                    if (prev.isRunning === finalIsRunning && timeDrift < 2) {
                        return prev;
                    }

                    return { ...prev, timeLeft: initialTime, isRunning: finalIsRunning };
                });
            }
            if (foundBatch?.productionNotes) {
                setProductionNotes(foundBatch.productionNotes);
            }
        }
    }, [id, recipes, batches, currentPhase, stepsArray]);

    useEffect(() => {
        if (!hasDismissedWarning && recipe && inventory && inventory.length > 0 && currentPhase === 'cooking') {
            const costResult = calculateRecipeCost(recipe, inventory, targetVolume);
            if (costResult.missingItems.length > 0) {
                setStockWarnings(costResult.missingItems);
                setShowWarningModal(true);
            } else {
                setStockWarnings([]);
            }
        }
    }, [recipe, targetVolume, inventory, currentPhase, hasDismissedWarning]);

    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();

            if (batch?.timer?.targetEndTime) {
                const remaining = Math.max(0, Math.floor((batch.timer.targetEndTime - now) / 1000));
                setBrewState(prev => {
                    if (remaining <= 0 && prev.isRunning) return { ...prev, timeLeft: 0, isRunning: false };
                    if (remaining !== prev.timeLeft) return { ...prev, timeLeft: remaining };
                    return prev;
                });
            } else if (brewState.isRunning) {
                setBrewState(prev => {
                    if (prev.timeLeft <= 1) return { ...prev, timeLeft: 0, isRunning: false };
                    return { ...prev, timeLeft: prev.timeLeft - 1 };
                });
            }

            const rawMetrics = batch?.[`${currentPhase}_metrics`] || {};
            const metricsArray = Array.isArray(rawMetrics) ? rawMetrics : Object.values(rawMetrics);
            const currentMetric = metricsArray.find(m => Number(m.stepIdx) === Number(safeStepIdx));

            if (currentMetric?.startedAt && brewState.isRunning) {
                setElapsedTime(Math.floor((now - currentMetric.startedAt) / 1000));
            } else if (!brewState.isRunning && currentMetric?.startedAt && currentMetric?.pausedAt) {
                setElapsedTime(Math.floor((currentMetric.pausedAt - currentMetric.startedAt) / 1000));
            } else {
                setElapsedTime(0);
            }

        }, 1000);
        return () => clearInterval(interval);
    }, [brewState.isRunning, batch?.timer?.targetEndTime, step?.duration, currentPhase, safeStepIdx, batch?.[`${currentPhase}_metrics`]]);

    const handleToggleTimer = async () => {
        const newRunning = !brewState.isRunning;
        const now = Date.now();

        let currentBatchId = batch?.id;
        if (!batch && currentPhase === 'cooking') {
            try {
                const initialBatch = {
                    recipeId: recipe.id,
                    recipeName: recipe.name,
                    category: recipe.category,
                    volume: targetVolume,
                    status: 'Cocinando',
                    phase: 'cooking',
                    currentStep: brewState.stepIdx,
                    timestamp: now,
                    date: getFormattedDate(),
                    timer: {
                        isRunning: newRunning,
                        targetEndTime: newRunning ? now + (brewState.timeLeft * 1000) : null,
                        pausedAt: !newRunning ? now : null
                    },
                    cooking_metrics: {} // FIX: Correct schema for metrics
                };
                const newId = await startBatch(initialBatch);
                navigate(`/brew/${newId}?phase=cooking`, { replace: true });
                return;
            } catch (err) {
                console.error("Error al iniciar lote en nube:", err);
            }
        }

        if (currentBatchId) {
            const updates = {
                'timer.isRunning': newRunning,
                timeLeft: Number(brewState.timeLeft) || 0
            };

            lockRunningRef.current = { state: newRunning, time: now };

            if (newRunning) {
                let remainingSecs = Number(brewState.timeLeft) || 0;
                if (remainingSecs <= 0 && step?.duration) {
                    const multiplier = currentPhase === 'cooking' ? 60 : 86400;
                    remainingSecs = parseFloat(step.duration) * multiplier;
                }
                updates['timer.targetEndTime'] = now + (remainingSecs * 1000);
                updates['timer.pausedAt'] = null;
                updates['timer.isRunning'] = true;
                updates.timeLeft = remainingSecs;

                const metricKey = `${currentPhase}_metrics.${brewState.stepIdx}`;
                const rawMetrics = batch?.[`${currentPhase}_metrics`] || {};
                const metricsArray = Array.isArray(rawMetrics) ? rawMetrics : Object.values(rawMetrics);

                if (!metricsArray.find(m => Number(m.stepIdx) === Number(brewState.stepIdx))) {
                    const multiplier = currentPhase === 'cooking' ? 60 : 86400;
                    updates[metricKey] = {
                        stepIdx: brewState.stepIdx,
                        title: step.title,
                        startedAt: now,
                        planned: (Number(step.duration) || 0) * multiplier
                    };
                }
            } else {
                updates['timer.pausedAt'] = now;
                updates['timer.targetEndTime'] = null;
                updates['timer.isRunning'] = false;
                const metricKey = `${currentPhase}_metrics.${brewState.stepIdx}.pausedAt`;
                updates[metricKey] = now;
            }

            try {
                setBrewState(prev => ({ ...prev, isRunning: newRunning }));
                await updateBatchField(currentBatchId, updates);
            } catch (err) {
                console.error("Error al pausar/reanudar:", err);
                lockRunningRef.current = null;
                alert("No se pudo sincronizar el cambio con la base de datos.");
            }
        } else {
            setBrewState(prev => ({ ...prev, isRunning: newRunning }));
        }
    };

    const handleNextStep = async () => {
        const now = Date.now();
        if (batch) {
            const rawMetrics = batch[`${currentPhase}_metrics`] || {};
            const metricsArray = Array.isArray(rawMetrics) ? rawMetrics : Object.values(rawMetrics);
            const currentMetric = metricsArray.find(m => Number(m.stepIdx) === Number(safeStepIdx));

            if (currentMetric?.startedAt) {
                const actualDuration = Math.floor((now - currentMetric.startedAt) / 1000);
                await updateBatchField(batch.id, {
                    [`${currentPhase}_metrics.${safeStepIdx}.actual`]: actualDuration,
                    [`${currentPhase}_metrics.${safeStepIdx}.completedAt`]: now
                });
            }
        }

        if (isLastStep) {
            if (currentPhase === 'cooking') {
                if (window.confirm(`¿Terminaste el día de cocción para ${recipe.name}? Esto descontará insumos y pasará a Fermentación.`)) {
                    try {
                        const actualDeductions = await deductBatch(recipe, targetVolume, ['cooking', 'fermenting_yeast']);
                        const { addedCost, warnings } = calculateActualDeductedCost(actualDeductions);
                        const updateData = {
                            status: 'Fermentando',
                            phase: 'fermenting',
                            currentStep: 0,
                            'phaseTimestamps.fermentationStart': now,
                            totalCost: addedCost || 0,
                            historyNotes: warnings,
                            'timer.isRunning': false,
                            'timer.targetEndTime': null,
                            'timer.pausedAt': null,
                            timeLeft: 0
                        };
                        if (batch) await updateBatchField(batch.id, updateData);
                        navigate('/active');
                    } catch (error) {
                        alert("Error: " + error.message);
                    }
                }
            } else if (currentPhase === 'fermenting') {
                if (!batch) return;
                if (window.confirm(`¿Empezar embotellado de ${recipe.name}?`)) {
                    try {
                        const phasesToDeduct = ['bottling'];
                        if (!batch.deductedHops) phasesToDeduct.push('fermenting_hops');
                        const actualDeductions = await deductBatch(recipe, batch.volume, phasesToDeduct);
                        const { addedCost, warnings } = calculateActualDeductedCost(actualDeductions);
                        await updateBatchField(batch.id, {
                            totalCost: (batch.totalCost || 0) + addedCost,
                            historyNotes: [...(batch.historyNotes || []), ...warnings],
                            currentStep: 0, // FIX: Reset step for the next phase
                            timeLeft: 0 // FIX: Reset timer for the next phase
                        });
                        await transitionBatchPhase(batch.id, 'bottling');
                        navigate('/active');
                    } catch (error) {
                        alert("Error: " + error.message);
                    }
                }
            } else if (currentPhase === 'bottling') {
                if (!batch) return;
                if (window.confirm(`¿Lote acondicionado definitivo?`)) {
                    try {
                        const daysElapsedTotal = Math.floor((now - batch.timestamp) / 86400000);
                        const newHistoryItem = {
                            ...batch,
                            dateBottled: getFormattedDate(),
                            notes: `Completada en ${daysElapsedTotal} días.\n` + (batch.historyNotes?.join('\n') || ''),
                            productionNotes: productionNotes,
                            status: 'Completada'
                        };
                        await completeBatch(batch.id, newHistoryItem);
                        navigate('/history');
                    } catch (error) {
                        alert("Error: " + error);
                    }
                }
            }
        } else {
            const nextIdx = safeStepIdx + 1;
            const nextStep = stepsArray[nextIdx];
            const multiplier = currentPhase === 'cooking' ? 60 : 86400;
            const nextTime = (nextStep && nextStep.duration) ? parseFloat(nextStep.duration) * multiplier : 0;
            if (batch) {
                const newCompleted = Array.from(new Set([...(batch.completedSteps || []), safeStepIdx]));
                await updateBatchField(batch.id, {
                    currentStep: nextIdx,
                    completedSteps: newCompleted,
                    timeLeft: nextTime,
                    'timer.isRunning': false,
                    'timer.targetEndTime': null,
                    'timer.pausedAt': null
                });
            }
            setBrewState({ stepIdx: nextIdx, timeLeft: nextTime, isRunning: false });
        }
    };

    const handleSaveAndExit = async () => {
        if (batch) {
            try {
                await updateBatchField(batch.id, {
                    currentStep: brewState.stepIdx,
                    timeLeft: brewState.timeLeft,
                    productionNotes: productionNotes
                });
            } catch (err) {
                console.error("Error saving progress:", err);
            }
        }
        navigate(labels.backUrl);
    };

    const handleAbandon = async () => {
        if (!batch) { navigate(labels.backUrl); return; }
        if (window.confirm("¿Seguro que deseas ABANDONAR este lote en proceso?")) {
            try {
                const newHistoryItem = {
                    ...batch,
                    notes: `Lote abandonado en fase de ${currentPhase}.`,
                    productionNotes: productionNotes,
                    status: 'Abandonada'
                };
                await completeBatch(batch.id, newHistoryItem);
                navigate('/history');
            } catch (error) {
                alert("Error al abandonar lote: " + error);
            }
        }
    };

    const getPhaseLabels = () => {
        const backUrl = batch ? '/active' : (currentPhase === 'cooking' ? `/recipes/${id}` : '/active');
        if (currentPhase === 'cooking') return {
            icon: <Beaker size={32} />,
            title: "Cocinando:",
            btnIcon: <Save size={28} />,
            btnText: "Terminar Cocción / A Fermentador",
            backUrl,
            bg: "bg-amber-500",
            hoverBg: "hover:bg-amber-400",
            border: "border-amber-700"
        };
        if (currentPhase === 'fermenting') return {
            icon: <Activity size={32} />,
            title: "Fermentando:",
            btnIcon: <Package size={28} />,
            btnText: "Empezar Embotellado",
            backUrl,
            bg: "bg-emerald-500",
            hoverBg: "hover:bg-emerald-400",
            border: "border-emerald-700"
        };
        if (currentPhase === 'bottling') return {
            icon: <Package size={32} />,
            title: "Envasando:",
            btnIcon: <Save size={28} />,
            btnText: "Completar Lote (Al Historial)",
            backUrl,
            bg: "bg-blue-500",
            hoverBg: "hover:bg-blue-400",
            border: "border-blue-700"
        };
        return {
            icon: <Beaker size={32} />,
            title: "",
            btnIcon: <Save size={28} />,
            btnText: "",
            backUrl,
            bg: "bg-amber-500",
            hoverBg: "hover:bg-amber-400",
            border: "border-amber-700"
        };
    };

    const labels = getPhaseLabels();
    if (!recipe) return null;

    return (
        <div className="bg-slate-900 p-6 md:p-12 rounded-3xl shadow-2xl border border-slate-700 animate-fadeIn min-h-[75vh] flex flex-col text-white relative overflow-hidden">
            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-400 z-20">
                <div className={`w-2 h-2 rounded-full ${brewState.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                {batch ? 'Sincronizado en Tiempo Real' : 'Modo Offline'}
            </div>

            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide relative z-10">
                {stepsArray.map((s, idx) => (
                    <div
                        key={idx}
                        className={`flex-1 min-w-[120px] p-3 rounded-xl border transition-all ${idx === safeStepIdx ? 'bg-amber-500/20 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' :
                            idx < safeStepIdx ? 'bg-emerald-500/10 border-emerald-500/30 opacity-60' :
                                'bg-slate-800/50 border-slate-700 opacity-40'
                            }`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            {idx < safeStepIdx ? <CheckCircle2 size={14} className="text-emerald-500" /> :
                                <div className={`w-4 h-4 rounded-full border text-[10px] flex items-center justify-center font-bold ${idx === safeStepIdx ? 'bg-amber-500 text-slate-900' : 'text-slate-500'}`}>{idx + 1}</div>}
                            <span className={`text-[10px] font-black uppercase tracking-widest truncate ${idx === safeStepIdx ? 'text-amber-500' : 'text-slate-400'}`}>{s.title || `Paso ${idx + 1}`}</span>
                        </div>
                        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${idx === safeStepIdx ? 'bg-amber-500 w-full animate-pulse' : idx < safeStepIdx ? 'bg-emerald-500 w-full' : 'w-0'}`} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-700/50 pb-6 mb-8 relative z-10 gap-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3 text-amber-500 mb-2">
                        {labels.icon} {labels.title} <span className="text-white">{batch?.customName || recipe.name}</span>
                    </h2>
                    {batch && (
                        <div className="flex gap-2">
                            <ElapsedTimer
                                startTime={batch.timestamp}
                                label="Total Lote"
                                colorClass="text-white"
                            />
                            <ElapsedTimer
                                startTime={
                                    currentPhase === 'cooking' ? batch.timestamp :
                                        currentPhase === 'fermenting' ? batch.phaseTimestamps?.fermentationStart :
                                            batch.phaseTimestamps?.bottlingStart
                                }
                                label={`Tiempo en ${currentPhase === 'cooking' ? 'Cocción' : currentPhase === 'fermenting' ? 'Fermentación' : 'Envasado'}`}
                                colorClass={currentPhase === 'cooking' ? 'text-amber-500' : currentPhase === 'fermenting' ? 'text-emerald-500' : 'text-blue-500'}
                            />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3 self-end md:self-center">
                    <span className="bg-blue-900/30 text-blue-400 px-3 py-1.5 rounded-full font-black text-sm">{targetVolume}L</span>
                    <span className="bg-slate-800 text-slate-300 px-4 py-2 rounded-full font-black text-xs md:text-sm uppercase">Paso {safeStepIdx + 1}: {step?.title}</span>
                    <button onClick={handleAbandon} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2 md:px-4 md:py-2 rounded-full border border-transparent hover:border-red-500/50 flex items-center gap-2 font-bold text-sm">
                        <Trash2 size={18} /> <span className="hidden md:inline">Abandonar</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 relative z-10">
                <h3 className="text-4xl md:text-5xl lg:text-6xl font-black text-white">{step?.title}</h3>
                <p className="text-xl md:text-2xl text-slate-300 max-w-3xl leading-relaxed">{step?.desc}</p>

                {step?.details && (
                    <div className="bg-slate-800/80 backdrop-blur-md p-6 md:p-8 rounded-2xl text-left max-w-3xl border border-slate-600/50 text-slate-200 w-full shadow-2xl">
                        <span className="font-black flex items-center gap-2 mb-3 text-amber-400 uppercase tracking-wider text-sm"><Info size={20} /> Detalle Técnico</span>
                        <div className="leading-relaxed">{step.details}</div>
                    </div>
                )}

                {step?.duration ? (
                    <React.Fragment>
                        <div className="flex justify-center gap-12 mt-4">
                            <div className="text-center">
                                <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Transcurrido</span>
                                <span className="text-3xl font-mono font-black text-slate-300">
                                    {currentPhase === 'cooking' ? formatTime(elapsedTime) : `${Math.floor(elapsedTime / 86400)}d ${formatTime(elapsedTime % 86400)}`}
                                </span>
                            </div>
                            <div className="text-center">
                                <span className="block text-[10px] font-black text-amber-500 uppercase tracking-widest">Restante</span>
                                <span className={`text-3xl font-mono font-black ${brewState.timeLeft === 0 && brewState.isRunning ? 'text-red-500' : 'text-emerald-400'}`}>
                                    {currentPhase === 'cooking' ? formatTime(brewState.timeLeft) : `${Math.floor(brewState.timeLeft / 86400)}d ${formatTime(brewState.timeLeft % 86400)}`}
                                </span>
                            </div>
                        </div>
                        <div className={`text-8xl md:text-[10rem] font-black font-mono tracking-tighter ${brewState.timeLeft === 0 && brewState.isRunning ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                            {currentPhase === 'cooking' ? formatTime(brewState.timeLeft) : `${Math.floor(brewState.timeLeft / 86400)}d`}
                        </div>
                        <button onClick={handleToggleTimer} className={`px-12 py-6 rounded-full font-black text-2xl flex items-center gap-4 text-white transition-all shadow-xl hover:scale-105 ${brewState.isRunning ? 'bg-orange-600' : 'bg-emerald-600'}`}>
                            {brewState.isRunning ? <><Pause size={32} /> Pausar</> : <><Play size={32} /> Iniciar</>}
                        </button>
                    </React.Fragment>
                ) : (
                    <div className="my-12 p-12 border-4 border-dashed border-slate-700 rounded-3xl w-full max-w-2xl bg-slate-800/30">
                        <p className="text-slate-400 font-bold text-2xl">Aplica el proceso y avanza al siguiente paso.</p>
                    </div>
                )}

                {batch && (
                    <div className="w-full max-w-3xl bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 text-left">
                        <label className="block text-xs font-black text-amber-500/80 uppercase tracking-widest mb-3">Notas de Producción</label>
                        <textarea
                            value={productionNotes}
                            onChange={(e) => setProductionNotes(e.target.value)}
                            placeholder="Observaciones..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 min-h-[100px] text-sm resize-none"
                        />
                    </div>
                )}
            </div>

            <div className="border-t border-slate-700/50 pt-8 mt-auto flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                <button onClick={handleSaveAndExit} className="flex items-center gap-2 text-slate-400 bg-slate-800 px-6 py-4 rounded-2xl font-bold w-full md:w-auto justify-center">
                    <ArrowLeft size={18} /> Guardar y Salir
                </button>
                <button onClick={handleNextStep} className={`${labels.bg} text-slate-900 px-10 py-5 rounded-2xl font-black text-xl flex items-center gap-3 transition-all w-full md:w-auto justify-center`}>
                    {isLastStep ? <>{labels.btnIcon} {labels.btnText}</> : <>Siguiente Paso <SkipForward size={28} /></>}
                </button>
            </div>
        </div>
    );
}
