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
    const { inventory, deductBatch, toggleIngredient } = useInventory();
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
            setBrewState(prev => ({ ...prev, isRunning: newRunning }));
        }
    };

    const handleToggleIngredient = async (ingredient, isConsumed) => {
        if (!batch) {
            alert("Inicia el proceso (Play) primero para registrar el consumo de insumos.");
            return;
        }
        try {
            await toggleIngredient(batch.id, ingredient, isConsumed, targetVolume, recipe.targetVolume);
        } catch (err) {
            console.error("Error toggling ingredient:", err);
            alert("Error al actualizar inventario: " + err.message);
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
                if (window.confirm(`¿Terminaste el día de cocción para ${recipe.name}? Esto descontará insumos restantes y pasará a Fermentación.`)) {
                    try {
                        const actualDeductions = await deductBatch(
                            recipe,
                            targetVolume,
                            ['cooking', 'fermenting_yeast'],
                            batch?.consumedIngredients || {}
                        );
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
                        const actualDeductions = await deductBatch(
                            recipe,
                            batch.volume,
                            phasesToDeduct,
                            batch?.consumedIngredients || {}
                        );
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

    const matchIngredientToStep = (ing, step, phase) => {
        if (!step) return false;
        const ingName = (ing.name || '').toLowerCase();
        const ingStage = (ing.stage || ing.time || '').toLowerCase();
        const stepTitle = (step.title || '').toLowerCase();
        const stepDesc = (step.desc || '').toLowerCase();
        const stepDetails = (step.details || '').toLowerCase();

        // 1. Literal matching by name
        if (ingName && (stepTitle.includes(ingName) || stepDesc.includes(ingName) || stepDetails.includes(ingName))) return true;

        // 2. Category + Keyword matching
        if (ing.category === 'Malta' && (stepTitle.includes('maceraci') || stepTitle.includes('mash') || stepTitle.includes('empaste'))) return true;
        if (ing.category === 'Levadura' && (stepTitle.includes('inocula') || stepTitle.includes('levadura') || stepTitle.includes('pitch'))) return true;

        // 3. Phase-based keywords
        if (phase === 'cooking') {
            if (ing.category === 'Lúpulo' && (ingStage.includes('hervor') || ingStage.includes('min'))) {
                if (stepTitle.includes('hervor') || stepTitle.includes('ebullici') || stepTitle.includes('adici') || stepTitle.includes('amargor') || stepTitle.includes('aroma')) return true;
            }
            if (ingStage.includes('whirlpool') && (stepTitle.includes('whirlpool') || stepTitle.includes('aroma') || stepTitle.includes('enfriado'))) return true;
            if (ingStage.includes('maceraci') && (stepTitle.includes('maceraci') || stepTitle.includes('mash'))) return true;
        }

        if (phase === 'fermenting') {
            if (ingStage.includes('dry hop') && (stepTitle.includes('dry hop') || stepTitle.includes('lúpulo'))) return true;
            if (ingStage.includes('madura') && stepTitle.includes('madura')) return true;
        }

        // 4. Fallback: textual matching on stage/time
        if (ingStage && (stepTitle.includes(ingStage) || stepDesc.includes(ingStage))) return true;

        return false;
    };

    const labels = getPhaseLabels();

    const { groupedPhaseIngredients, currentStepIngredientsCount } = useMemo(() => {
        if (!recipe?.ingredients) return { groupedPhaseIngredients: {}, currentStepIngredientsCount: 0 };
        const { malts = [], hops = [], others = [], yeast } = recipe.ingredients;
        let allPhase = [];

        if (currentPhase === 'cooking') {
            malts.forEach(m => allPhase.push({ ...m, category: 'Malta', logicalStage: 'Maceración' }));
            hops.filter(h => h.phase === 'cooking' || !h.phase).forEach(h => {
                const stage = (h.stage || h.time || '').toLowerCase();
                const logicalStage = stage.includes('whirlpool') ? 'Whirlpool' : 'Hervor';
                allPhase.push({ ...h, category: 'Lúpulo', logicalStage });
            });
            others.filter(o => o.phase === 'cooking' || !o.phase).forEach(o => {
                const stage = (o.stage || o.time || '').toLowerCase();
                const logicalStage = stage.includes('whirlpool') ? 'Whirlpool' : (stage.includes('maceraci') ? 'Maceración' : 'Hervor');
                allPhase.push({ ...o, category: o.category || 'Aditivos', logicalStage });
            });
            if (yeast) allPhase.push({ ...(typeof yeast === 'object' ? yeast : { name: yeast, amount: 1 }), category: 'Levadura', logicalStage: 'Final de Cocción/Inoculación' });
        } else if (currentPhase === 'fermenting') {
            hops.filter(h => h.phase === 'fermenting').forEach(h => allPhase.push({ ...h, category: 'Lúpulo', logicalStage: 'Dry Hop / Adiciones' }));
            others.filter(o => o.phase === 'fermenting').forEach(o => allPhase.push({ ...o, category: o.category || 'Aditivos', logicalStage: 'Dry Hop / Adiciones' }));
        } else if (currentPhase === 'bottling') {
            others.filter(o => o.phase === 'bottling').forEach(o => allPhase.push({ ...o, category: o.category || 'Aditivos', logicalStage: 'Envasado' }));
        }

        // Sorting ingredients within phase
        allPhase.sort((a, b) => {
            // Sort by logical stage priority
            const order = { 'Maceración': 1, 'Hervor': 2, 'Whirlpool': 3, 'Final de Cocción/Inoculación': 4, 'Dry Hop / Adiciones': 5, 'Envasado': 6 };
            if (order[a.logicalStage] !== order[b.logicalStage]) return order[a.logicalStage] - order[b.logicalStage];

            // Within same stage, sort by time (descending for boil)
            const getMinutes = (timeStr) => {
                const match = String(timeStr).match(/(\d+)/);
                return match ? parseInt(match[1]) : 0;
            };
            return getMinutes(b.time || b.stage) - getMinutes(a.time || a.stage);
        });

        // Grouping
        const groups = {};
        let currentCount = 0;
        allPhase.forEach(ing => {
            if (!groups[ing.logicalStage]) groups[ing.logicalStage] = [];
            const matchesCurrentStep = matchIngredientToStep(ing, step, currentPhase);
            if (matchesCurrentStep) currentCount++;
            groups[ing.logicalStage].push({ ...ing, matchesCurrentStep });
        });

        return { groupedPhaseIngredients: groups, currentStepIngredientsCount: currentCount };
    }, [recipe, currentPhase, step]);

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

                {Object.keys(groupedPhaseIngredients).length > 0 && batch && (
                    <div className="w-full max-w-3xl bg-slate-800/80 backdrop-blur-md p-6 md:p-8 rounded-2xl border border-slate-600/50 shadow-2xl text-left">
                        <div className="flex items-center justify-between mb-6">
                            <span className="font-black flex items-center gap-3 text-emerald-400 uppercase tracking-widest text-sm">
                                <Package size={22} className="text-emerald-500" /> Control de Insumos: {currentPhase === 'cooking' ? 'Cocción' : currentPhase === 'fermenting' ? 'Fermentación' : 'Embotellado'}
                            </span>
                            {currentStepIngredientsCount > 0 && (
                                <span className="bg-emerald-500 text-slate-900 text-[10px] font-black px-2 py-1 rounded-full animate-pulse uppercase tracking-tighter">
                                    {currentStepIngredientsCount} para este paso
                                </span>
                            )}
                        </div>

                        <div className="space-y-10">
                            {Object.entries(groupedPhaseIngredients).map(([stageName, ings]) => {
                                const hasMatches = ings.some(i => i.matchesCurrentStep);
                                return (
                                    <div key={stageName} className={`space-y-4 p-4 rounded-2xl transition-all ${hasMatches ? 'bg-emerald-500/5 border border-emerald-500/20 shadow-lg' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap ${hasMatches ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                {stageName}
                                            </span>
                                            <div className={`h-[1px] flex-1 ${hasMatches ? 'bg-emerald-500/30' : 'bg-slate-700/50'}`}></div>
                                            {hasMatches && <span className="text-[10px] font-bold text-emerald-500 italic">Corresponde al paso actual</span>}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {ings.map((ing, idx) => {
                                                const key = `${ing.category}_${ing.name}`.replace(/[~*/\[\].#$]/g, '_');
                                                const isConsumed = !!batch.consumedIngredients?.[key];
                                                const scaleFactor = targetVolume / (recipe.targetVolume || 20);
                                                const scaledAmount = ing.category === 'Lúpulo' || ing.category === 'Levadura'
                                                    ? Math.round(ing.amount * scaleFactor)
                                                    : (ing.amount * scaleFactor).toFixed(2);

                                                return (
                                                    <div
                                                        key={idx}
                                                        onClick={() => handleToggleIngredient(ing, !isConsumed)}
                                                        className={`flex flex-col p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden ${isConsumed
                                                            ? 'bg-emerald-500/20 border-emerald-500/50 shadow-inner scale-[0.98]'
                                                            : hasMatches
                                                                ? 'bg-slate-700/50 border-emerald-500/30 hover:border-emerald-400 shadow-md translate-y-[-2px]'
                                                                : 'bg-slate-700/20 border-slate-700 hover:border-slate-500 opacity-80 hover:opacity-100'
                                                            }`}
                                                    >
                                                        {ing.matchesCurrentStep && !isConsumed && (
                                                            <div className="absolute top-0 right-0 bg-emerald-500 w-2 h-full"></div>
                                                        )}

                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${isConsumed ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-900 border-slate-600 group-hover:border-slate-400'
                                                                    }`}>
                                                                    {isConsumed && <CheckCircle2 size={16} className="text-slate-900" />}
                                                                </div>
                                                                <p className={`text-sm font-bold ${isConsumed ? 'text-emerald-400 line-through opacity-70' : 'text-white'}`}>{ing.name}</p>
                                                            </div>
                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${isConsumed ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-500' : 'bg-slate-800 border-slate-700 text-slate-400'
                                                                }`}>
                                                                {ing.time || ing.stage || 'General'}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center justify-between pl-9 mt-1">
                                                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                                                                {ing.category} • {scaledAmount} {ing.unit || (ing.category === 'Malta' ? 'kg' : 'g')}
                                                            </p>
                                                            {isConsumed && (
                                                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Añadido</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-8 pt-6 border-t border-slate-700/50 flex flex-col items-center gap-2">
                            <p className="text-[10px] text-slate-600 uppercase tracking-widest font-black">Recordatorio Profesional</p>
                            <p className="text-[10px] text-slate-500 italic text-center max-w-md">Marca los insumos en el momento exacto que los agregas. El inventario se actualizará en tiempo real y el costo final del lote será milimétrico.</p>
                        </div>
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
        </div >
    );
}
