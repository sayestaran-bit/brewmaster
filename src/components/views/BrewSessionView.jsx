import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Beaker, Info, Play, Pause, Save, SkipForward, ArrowLeft, AlertTriangle, Activity, Package, Trash2, CheckCircle2, Sparkles, Wheat, Leaf } from 'lucide-react';
import { formatCurrency, standardizeDate, formatTime, getFormattedDate } from '../../utils/formatters';
import { calculateRecipeCost, calculateActualDeductedCost } from '../../utils/costCalculator';
import { getEffectivePhase, getIngredientKey, BREWING_STAGES, TIME_UNITS, getSafeAdditionTime, getTimeMultiplier, isCountdownStage } from '../../utils/recipeUtils';
import { useRecipes } from '../../hooks/useRecipes';
import { useInventory } from '../../hooks/useInventory';
import { useActiveBatches } from '../../hooks/useActiveBatches';
import { useEquipment } from '../../hooks/useEquipment';
import { Settings } from 'lucide-react';

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

const getMillis = (val) => val && typeof val.toMillis === 'function' ? val.toMillis() : (val || Date.now());

export default function BrewSessionView() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { recipes } = useRecipes();
    const { inventory, deductBatch, toggleIngredient } = useInventory();
    const { batches, startBatch, transitionBatchPhase, completeBatch, updateBatchField, updateProgress } = useActiveBatches();
    const { equipment } = useEquipment();

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
    const [modalConfig, setModalConfig] = useState(null); // { title, message, onConfirm, danger }

    const lockRunningRef = useRef(null);

    const stepsArray = useMemo(() => {
        if (!recipe) return [];
        const rawSteps = Array.isArray(recipe.steps) && recipe.steps.length > 0 ? recipe.steps : [];
        const skippedStages = recipe.skippedStages || [];
        
        // 1. Get stages for the current phase
        const phaseStages = BREWING_STAGES.filter(stage => stage.phase === currentPhase);
        
        // 2. Build the steps array following the roadmap order
        let roadmapSteps = [];
        
        phaseStages.forEach(stage => {
            // Skip if the stage is marked as skipped
            if (skippedStages.includes(stage.id)) return;
            
            // Get sub-steps for this stage
            const subSteps = rawSteps.filter(s => s.stageId === stage.id);
            
            if (subSteps.length > 0) {
                roadmapSteps.push(...subSteps.map(s => ({ ...s, stageLabel: stage.label })));
            } else {
                // Default step if none defined but stage is active
                roadmapSteps.push({ 
                    id: `default-${stage.id}`,
                    title: stage.label, 
                    desc: "Sigue el proceso estándar.", 
                    duration: 0, 
                    timeUnit: 'm',
                    stageId: stage.id,
                    stageLabel: stage.label,
                    phase: currentPhase
                });
            }
        });

        return roadmapSteps;
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
                const rawDuration = parseFloat(currentStep.duration);
                const multiplier = getTimeMultiplier(currentStep.timeUnit);
                const recipeDuration = !isNaN(rawDuration) ? rawDuration * multiplier : 0;
                let initialTime = recipeDuration;
                let dbIsRunning = false;

                if (foundBatch?.timer) {
                    dbIsRunning = foundBatch.timer.isRunning;
                    if (dbIsRunning && foundBatch.timer.targetEndTime) {
                        const now = Date.now();
                        const targetMs = getMillis(foundBatch.timer.targetEndTime);
                        initialTime = Math.max(0, Math.floor((targetMs - now) / 1000));
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
                const targetMs = getMillis(batch.timer.targetEndTime);
                const remaining = Math.max(0, Math.floor((targetMs - now) / 1000));
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
            const activeProfile = equipment?.find(e => e.id === recipe.equipmentId) || equipment?.find(e => e.isDefault);
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
                    equipmentId: activeProfile?.id || null,
                    equipmentName: activeProfile?.name || null,
                    timer: {
                        isRunning: newRunning,
                        targetEndTime: newRunning ? now + (brewState.timeLeft * 1000) : null,
                        pausedAt: !newRunning ? now : null
                    },
                    [`${currentPhase}_metrics`]: {} 
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
                    const multiplier = getTimeMultiplier(step.timeUnit);
                    const rawDur = parseFloat(step.duration);
                    remainingSecs = !isNaN(rawDur) ? rawDur * multiplier : 0;
                }
                updates['timer.targetEndTime'] = now + (remainingSecs * 1000);
                updates['timer.pausedAt'] = null;
                updates['timer.isRunning'] = true;
                updates.timeLeft = remainingSecs;

                const metricKey = `${currentPhase}_metrics.${brewState.stepIdx}`;
                const rawMetrics = batch?.[`${currentPhase}_metrics`] || {};
                const metricsArray = Array.isArray(rawMetrics) ? rawMetrics : Object.values(rawMetrics);

                if (!metricsArray.find(m => Number(m.stepIdx) === Number(brewState.stepIdx))) {
                    const multiplier = getTimeMultiplier(step.timeUnit);
                    updates[metricKey] = {
                        stepIdx: brewState.stepIdx,
                        title: step.title,
                        startedAt: now,
                        planned: (!isNaN(parseFloat(step.duration)) ? parseFloat(step.duration) * multiplier : 0)
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
        console.log("⏭️ Intentando avanzar paso. Actual:", safeStepIdx, "Total:", stepsArray.length);
        const isLastStep = safeStepIdx === stepsArray.length - 1;
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
                setModalConfig({
                    title: "Terminar Día de Cocción",
                    message: `¿Terminaste el día de cocción para ${recipe.name}? Esto descontará insumos del inventario y el lote pasará a fase de Fermentación.`,
                    onConfirm: async () => {
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
                                totalCost: (batch?.totalCost || 0) + (addedCost || 0),
                                historyNotes: warnings,
                                'timer.isRunning': false,
                                'timer.targetEndTime': null,
                                'timer.pausedAt': null,
                                timeLeft: 0
                            };
                            if (batch) await updateBatchField(batch.id, updateData);
                            setModalConfig({
                                title: "¡Cocción Exitosa!",
                                message: "El lote ha pasado a fermentación correctamente.",
                                onConfirm: () => navigate('/active')
                            });
                        } catch (error) {
                            console.error("Error al terminar cocción:", error);
                            alert("Error: " + error.message);
                        }
                    }
                });
            } else if (currentPhase === 'fermenting') {
                if (!batch) return;
                setModalConfig({
                    title: "Pasar a Envasado",
                    message: `¿Deseas iniciar la fase de acondicionamiento/embotellado de ${recipe.name}?`,
                    onConfirm: async () => {
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
                                currentStep: 0,
                                timeLeft: 0
                            });
                            await transitionBatchPhase(batch.id, 'bottling');
                            navigate('/active');
                        } catch (error) {
                            alert("Error: " + error.message);
                        }
                    }
                });
            } else if (currentPhase === 'bottling') {
                if (!batch) return;
                setModalConfig({
                    title: "Finalizar Lote",
                    message: `¿El lote está acondicionado y listo para consumo? Se moverá al historial definitivo.`,
                    onConfirm: async () => {
                        try {
                            const startTs = getMillis(batch.timestamp || batch.startDate || batch.date);
                            const daysElapsedTotal = Math.floor((now - startTs) / 86400000);
                            const newHistoryItem = {
                                ...batch,
                                dateBottled: getFormattedDate(),
                                notes: `Completada en ${daysElapsedTotal} días.\n` + (batch.historyNotes?.join('\n') || ''),
                                productionNotes: productionNotes,
                                status: 'Completada'
                            };
                            await completeBatch(batch.id, newHistoryItem);
                            setModalConfig({
                                title: "¡Felicidades!",
                                message: "Lote completado con éxito. ¡A brindar!",
                                onConfirm: () => navigate('/history')
                            });
                        } catch (error) {
                            console.error("Error al completar lote:", error);
                            alert("Error: " + error);
                        }
                    }
                });
            }
        } else {
            const nextIdx = safeStepIdx + 1;
            const nextStep = stepsArray[nextIdx];
            const getTimeMultiplier = (u) => u === 'd' ? 86400 : (u === 'h' ? 3600 : 60);
            const rawNextDur = nextStep ? parseFloat(nextStep.duration) : NaN;
            const nextTime = !isNaN(rawNextDur) ? rawNextDur * getTimeMultiplier(nextStep?.timeUnit) : 0;
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

    const handleAbandon = async (e) => {
        if (e) e.stopPropagation();
        console.log("🗑️ Solicitud de ABANDONAR lote detectada...");
        if (!batch) { navigate(labels.backUrl); return; }

        setModalConfig({
            title: "Abandonar Lote",
            message: "¿Estás seguro de que deseas abandonar este lote en proceso? Se guardará en el historial como 'Abandonada'.",
            danger: true,
            onConfirm: async () => {
                try {
                    const startTs = getMillis(batch.timestamp || batch.startDate || batch.date);
                    const newHistoryItem = {
                        ...batch,
                        notes: `Lote abandonado en fase de ${currentPhase}.`,
                        productionNotes: productionNotes,
                        status: 'Abandonada',
                        abandonedAt: Date.now()
                    };
                    await completeBatch(batch.id, newHistoryItem);
                    navigate('/history');
                } catch (error) {
                    console.error("Error al abandonar lote:", error);
                    alert("Error al abandonar lote: " + error);
                }
            }
        });
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

        // 0. Explicit Step ID matching (Highest Priority)
        if (ing.stepId && step.id && ing.stepId === step.id) return true;

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

        if (phase === 'bottling') {
            if (ingStage.includes('envasado') && stepTitle.includes('envasado')) return true;
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

            hops.filter(h => getEffectivePhase(h) === 'cooking').forEach(h => {
                const stage = (h.stage || h.time || '').toLowerCase();
                const logicalStage = stage.includes('whirlpool') ? 'Whirlpool' : 'Hervor';
                allPhase.push({ ...h, category: 'Lúpulo', logicalStage });
            });

            others.filter(o => getEffectivePhase(o) === 'cooking').forEach(o => {
                const stage = (o.stage || o.time || '').toLowerCase();
                const logicalStage = stage.includes('whirlpool') ? 'Whirlpool' : (stage.includes('maceraci') ? 'Maceración' : 'Hervor');
                allPhase.push({ ...o, category: o.category || 'Aditivos', logicalStage });
            });

            if (yeast) allPhase.push({ ...(typeof yeast === 'object' ? yeast : { name: yeast, amount: 1 }), category: 'Levadura', logicalStage: 'Final de Cocción/Inoculación' });
        } else if (currentPhase === 'fermenting') {
            hops.filter(h => getEffectivePhase(h) === 'fermenting').forEach(h => allPhase.push({ ...h, category: 'Lúpulo', logicalStage: 'Dry Hop / Adiciones' }));
            others.filter(o => getEffectivePhase(o) === 'fermenting').forEach(o => allPhase.push({ ...o, category: o.category || 'Aditivos', logicalStage: 'Dry Hop / Adiciones' }));
        } else if (currentPhase === 'bottling') {
            others.filter(o => getEffectivePhase(o) === 'bottling').forEach(o => allPhase.push({ ...o, category: o.category || 'Aditivos', logicalStage: 'Envasado' }));
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
                        <div className="flex gap-2 ml-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                                {recipe.family || 'Ale'}
                            </span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                                {recipe.style || 'IPA'}
                            </span>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-700 px-3 py-1 rounded-lg border border-slate-600">
                                {recipe.subStyle || recipe.category}
                            </span>
                        </div>
                        {batch?.equipmentName && (
                            <div className="flex flex-col items-start ml-2 md:ml-4 border-l border-amber-500/30 pl-4">
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-0.5">Equipo de Producción</span>
                                <span className="text-sm font-black text-white px-3 py-1 bg-amber-500/20 rounded-lg border border-amber-500/30 flex items-center gap-2 shadow-lg shadow-amber-500/5">
                                    <Settings size={14} className="animate-spin-slow text-amber-500" /> {batch.equipmentName}
                                </span>
                            </div>
                        )}
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
                        <div className="leading-relaxed whitespace-pre-line">{step.details}</div>
                        
                        {/* Insumos del Paso Actual (Prominente) */}
                        {(() => {
                            const stepMalts = (recipe.ingredients.malts || []).filter(m => m.stepId === step.id);
                            const stepHops = (recipe.ingredients.hops || []).filter(h => h.stepId === step.id);
                            const stepOthers = (recipe.ingredients.others || []).filter(o => o.stepId === step.id);
                            const yeast = recipe.ingredients.yeast;
                            const isYeastInStep = yeast && yeast.stepId === step.id;
                            
                            if (stepMalts.length === 0 && stepHops.length === 0 && stepOthers.length === 0 && !isYeastInStep) return null;

                            return (
                                <div className="mt-6 pt-6 border-t border-slate-700/50">
                                    <span className="font-black flex items-center gap-2 mb-3 text-emerald-400 uppercase tracking-wider text-[10px]"><Package size={16} /> Agregar en este momento:</span>
                                    <div className="flex flex-wrap gap-3">
                                        {stepMalts.map((m, i) => (
                                            <div key={`m-${i}`} className="bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl flex items-center gap-2">
                                                <Wheat size={14} className="text-amber-500" />
                                                <span className="text-sm font-bold text-amber-100">{m.name}</span>
                                                <span className="text-xs font-black bg-amber-500/20 px-2 py-0.5 rounded text-amber-400">{Math.round(m.amount * (targetVolume / (recipe.targetVolume || 20)))} {m.unit || 'kg'}</span>
                                                {(m.additionTime !== undefined || m.time || true) && (
                                                    <span className="text-[10px] font-black text-slate-400">@ {getSafeAdditionTime(m, step)}{m.additionTimeUnit || 'm'}</span>
                                                )}
                                            </div>
                                        ))}
                                        {stepHops.map((h, i) => (
                                            <div key={`h-${i}`} className="bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-xl flex items-center gap-2">
                                                <Leaf size={14} className="text-green-500" />
                                                <span className="text-sm font-bold text-green-100">{h.name}</span>
                                                <span className="text-xs font-black bg-green-500/20 px-2 py-0.5 rounded text-green-400">{Math.round(h.amount * (targetVolume / (recipe.targetVolume || 20)))} {h.unit || 'g'}</span>
                                                {(h.additionTime !== undefined || h.time || true) && (
                                                    <span className="text-[10px] font-black text-slate-400 group relative">
                                                        @ {getSafeAdditionTime(h, step)}{h.additionTimeUnit || 'm'}
                                                        <Info size={10} className="inline ml-1 opacity-50 cursor-help" title="Tiempo relativo al proceso (ej. 60=inicio, 0=final en Hervor)" />
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                        {isYeastInStep && (
                                            <div className="bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 rounded-xl flex items-center gap-2">
                                                <Activity size={14} className="text-yellow-500" />
                                                <span className="text-sm font-bold text-yellow-100">{yeast.name}</span>
                                                <span className="text-xs font-black bg-yellow-500/20 px-2 py-0.5 rounded text-yellow-400">{yeast.amount || 1} {yeast.unit || 'sobre'}</span>
                                            </div>
                                        )}
                                        {stepOthers.map((o, i) => (
                                            <div key={`o-${i}`} className="bg-purple-500/10 border border-purple-500/20 px-3 py-2 rounded-xl flex items-center gap-2">
                                                <Sparkles size={14} className="text-purple-500" />
                                                <span className="text-sm font-bold text-purple-100">{o.name}</span>
                                                <span className="text-xs font-black bg-purple-500/20 px-2 py-0.5 rounded text-purple-400">{o.amount * (targetVolume / (recipe.targetVolume || 20))} {o.unit || 'g'}</span>
                                                {(o.additionTime !== undefined || o.time || true) && (
                                                    <span className="text-[10px] font-black text-slate-400">@ {getSafeAdditionTime(o, step)}{o.additionTimeUnit || 'm'}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
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
                            {brewState.timeLeft >= 86400 
                                ? `${Math.floor(brewState.timeLeft / 86400)}d ${formatTime(brewState.timeLeft % 86400)}`
                                : formatTime(brewState.timeLeft)
                            }
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
                        </div>

                        <div className="space-y-6">
                            {(() => {
                                const activeInCurrentStep = Object.entries(groupedPhaseIngredients).reduce((acc, [stage, ings]) => {
                                    const matches = ings.filter(i => i.matchesCurrentStep);
                                    if (matches.length > 0) acc.push(...matches);
                                    return acc;
                                }, []);

                                if (activeInCurrentStep.length === 0) {
                                    return (
                                        <div className="py-8 px-4 border-2 border-dashed border-slate-700/50 rounded-2xl text-center">
                                            <p className="text-slate-500 font-medium italic">No hay adiciones de insumos programadas para esta etapa.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {activeInCurrentStep.map((ing, idx) => {
                                            const key = getIngredientKey(ing);
                                            const isConsumed = !!batch.consumedIngredients?.[key];
                                            const scaleFactor = targetVolume / (recipe.targetVolume || 20);
                                            const scaledAmount = ing.category === 'Lúpulo' || ing.category === 'Levadura'
                                                ? Math.round(ing.amount * scaleFactor)
                                                : (ing.amount * scaleFactor).toFixed(2);

                                            const isMineral = ing.category === 'Sales Minerales';

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => handleToggleIngredient(ing, !isConsumed)}
                                                    className={`flex flex-col p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden ${isConsumed
                                                        ? 'bg-emerald-500/20 border-emerald-500/50 shadow-inner scale-[0.98]'
                                                        : 'bg-slate-700/50 border-emerald-500/30 hover:border-emerald-400 shadow-md translate-y-[-2px]'
                                                        }`}
                                                >
                                                    {!isConsumed && (
                                                        <div className={`absolute top-0 right-0 ${isMineral ? 'bg-blue-500' : 'bg-emerald-500'} w-2 h-full`}></div>
                                                    )}

                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${isConsumed ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-900 border-slate-600 group-hover:border-slate-400'
                                                                }`}>
                                                                {isConsumed ? <CheckCircle2 size={16} className="text-slate-900" /> : isMineral ? <Sparkles size={12} className="text-blue-400" /> : null}
                                                            </div>
                                                            <p className={`text-sm font-bold ${isConsumed ? 'text-emerald-400 line-through opacity-70' : isMineral ? 'text-blue-100' : 'text-white'}`}>{ing.name}</p>
                                                        </div>
                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase transition-colors ${isConsumed ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-500' : isMineral ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                                                            }`}>
                                                            {(() => {
                                                                const normTime = getSafeAdditionTime(ing, step);
                                                                const isStart = isCountdownStage(step.stageId)
                                                                    ? normTime === Number(step.duration || 0)
                                                                    : normTime === 0;

                                                                if (isStart) return 'INICIO';
                                                                return `@ ${ing.additionTime}${ing.additionTimeUnit || 'm'}`;
                                                            })()}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between pl-9 mt-1">
                                                        <p className={`text-[10px] ${isConsumed ? 'text-emerald-600' : 'text-slate-400'} font-medium uppercase tracking-tighter`}>
                                                            {ing.category} • {scaledAmount} {ing.unit || (ing.category === 'Malta' ? 'kg' : 'g')}
                                                        </p>
                                                        {isConsumed && (
                                                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Añadido</span>
                                                        )}
                                                    </div>

                                                    {!isConsumed && (
                                                        <div className="mt-3 pt-3 border-t border-slate-600/30 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">Click para marcar como añadido</span>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
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

            {/* ── MODAL DE CONFIRMACIÓN CUSTOM ───────────────── */}
            {modalConfig && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 min-w-full min-h-full">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setModalConfig(null)} />
                    <div className="bg-panel border border-line rounded-3xl p-8 max-w-md w-full relative z-10 shadow-2xl animate-scaleIn">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${modalConfig.danger ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
                            {modalConfig.danger ? <Trash2 size={32} /> : <AlertTriangle size={32} />}
                        </div>
                        <h3 className="text-2xl font-black text-content mb-3">{modalConfig.title}</h3>
                        <p className="text-muted font-medium mb-8 leading-relaxed">
                            {modalConfig.message}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setModalConfig(null)}
                                className="flex-1 bg-surface hover:bg-black/5 dark:hover:bg-white/5 text-content font-bold py-4 rounded-xl border border-line transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    const callback = modalConfig.onConfirm;
                                    setModalConfig(null);
                                    if (callback) callback();
                                }}
                                className={`flex-1 text-white font-black py-4 rounded-xl shadow-lg transition-all hover:-translate-y-1 ${modalConfig.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
