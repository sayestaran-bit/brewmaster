import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Beaker, Info, Play, Pause, Save, SkipForward, ArrowLeft, AlertTriangle, Activity, Package, Trash2 } from 'lucide-react';
import { formatTime, getFormattedDate } from '../../utils/formatters';
import { calculateRecipeCost, calculateActualDeductedCost } from '../../utils/costCalculator';
import { useRecipes } from '../../hooks/useRecipes';
import { useInventory } from '../../hooks/useInventory';
import { useActiveBatches } from '../../hooks/useActiveBatches';

export default function BrewSessionView() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { recipes } = useRecipes();
    const { inventory, deductBatch } = useInventory();
    const { batches, startBatch, transitionBatchPhase, completeBatch, updateBatchField } = useActiveBatches();

    const currentPhase = searchParams.get('phase') || 'cooking';

    const [recipe, setRecipe] = useState(null);
    const [batch, setBatch] = useState(null);
    const [targetVolume, setTargetVolume] = useState(20);
    const [stockWarnings, setStockWarnings] = useState([]);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [hasDismissedWarning, setHasDismissedWarning] = useState(false);

    // Estado local para la sesión
    const [brewState, setBrewState] = useState({
        stepIdx: 0,
        timeLeft: 0,
        isRunning: false
    });

    useEffect(() => {
        if (recipes.length > 0) {
            let foundRecipe = null;
            let foundBatch = null;

            if (currentPhase === 'cooking') {
                foundRecipe = recipes.find(r => r.id === id);
            } else {
                foundBatch = batches.find(b => b.id === id);
                if (foundBatch) {
                    foundRecipe = recipes.find(r => r.id === foundBatch.recipeId);
                }
            }

            if (foundRecipe) {
                setRecipe(foundRecipe);
                setBatch(foundBatch);

                const volParam = searchParams.get('vol');
                const vol = volParam ? Number(volParam) : (foundBatch ? foundBatch.volume : (foundRecipe.targetVolume || 20));
                setTargetVolume(vol);

                // Get steps for this phase
                const rawSteps = Array.isArray(foundRecipe.steps) ? foundRecipe.steps : [];
                let phaseSteps = rawSteps.filter(s => s.phase === currentPhase);
                if (currentPhase === 'cooking' && phaseSteps.length === 0) {
                    phaseSteps = rawSteps.filter(s => !s.phase || s.phase === 'cooking');
                }

                const firstStep = phaseSteps[0] || {};
                setBrewState(prev => ({ ...prev, timeLeft: firstStep.duration && !isNaN(parseFloat(firstStep.duration)) ? parseFloat(firstStep.duration) * 60 : 0 }));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, recipes, batches, currentPhase, navigate]);

    useEffect(() => {
        // Solo verificamos inventario estrictamente en cocción previo a consumir grandes lotes.
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

    useEffect(() => {
        if (!brewState.isRunning) return;
        const interval = setInterval(() => {
            setBrewState(prev => {
                if (prev.timeLeft <= 1) {
                    return { ...prev, timeLeft: 0, isRunning: false };
                }
                return { ...prev, timeLeft: prev.timeLeft - 1 };
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [brewState.isRunning]);

    if (!recipe) return null;

    const rawSteps = Array.isArray(recipe.steps) && recipe.steps.length > 0 ? recipe.steps : [];
    let stepsArray = rawSteps.filter(s => s.phase === currentPhase);

    // Adaptador para recetas antiguas que no tienen label "phase" y lo queremos para "cooking"
    if (currentPhase === 'cooking' && stepsArray.length === 0) {
        stepsArray = rawSteps.filter(s => !s.phase || s.phase === 'cooking');
        if (stepsArray.length === 0) {
            stepsArray = [{ title: "Cocción Genérica", desc: "Sigue tu instinto cervecero.", duration: 60 }];
        }
    }
    if (currentPhase !== 'cooking' && stepsArray.length === 0) {
        stepsArray = [{ title: `Fase de ${currentPhase === 'fermenting' ? 'Fermentación' : 'Embotellado'} genérica`, desc: "Sigue el proceso estándar o añade notas.", duration: null }];
    }

    const safeStepIdx = Math.min(brewState.stepIdx, stepsArray.length - 1);
    const step = stepsArray[safeStepIdx];
    const isLastStep = safeStepIdx === stepsArray.length - 1;

    const handleNextStep = async () => {
        if (isLastStep) {
            if (currentPhase === 'cooking') {
                if (window.confirm(`¿Terminaste el día de cocción para ${recipe.name}? Esto descontará insumos de tu inventario y enviará el lote a Fermentación.`)) {
                    try {
                        const actualDeductions = await deductBatch(recipe, targetVolume, ['cooking', 'fermenting_yeast']);
                        const { addedCost, warnings } = calculateActualDeductedCost(actualDeductions);

                        const newBatchItem = {
                            recipeId: recipe.id,
                            recipeName: recipe.name || 'Sin Nombre',
                            dateBrewed: getFormattedDate(),
                            date: getFormattedDate(),
                            timestamp: Date.now(),
                            volume: targetVolume || 0,
                            og: Number(recipe.og) || 1.050,
                            fg: Number(recipe.fg) || 1.010,
                            abv: Number(recipe.abv) || 5.0,
                            category: recipe.category || 'Otros',
                            totalCost: addedCost || 0,
                            historyNotes: warnings,
                            status: 'Fermentando',
                            phase: 'fermenting',
                            phaseTimestamps: {
                                cookingStart: Date.now(),
                                fermentationStart: Date.now(),
                                bottlingStart: null
                            },
                            deductedHops: false
                        };
                        await startBatch(newBatchItem);
                        navigate('/active');
                    } catch (error) {
                        alert("Hubo un problema descontando el inventario: " + error.message);
                    }
                }
            } else if (currentPhase === 'fermenting') {
                if (!batch) return;
                if (window.confirm(`¿Seguro que deseas empezar a embotellar ${recipe.name}? Esto descontará insumos finales (chapas, clarificantes).`)) {
                    try {
                        const phasesToDeduct = ['bottling'];
                        // If they skipped directly to bottling without stepping over the hops step, deduct them now as safety
                        if (!batch.deductedHops) {
                            phasesToDeduct.push('fermenting_hops');
                        }
                        const actualDeductions = await deductBatch(recipe, batch.volume, phasesToDeduct);
                        const { addedCost, warnings } = calculateActualDeductedCost(actualDeductions);

                        await updateBatchField(batch.id, {
                            totalCost: (batch.totalCost || 0) + addedCost,
                            historyNotes: [...(batch.historyNotes || []), ...warnings]
                        });
                        await transitionBatchPhase(batch.id, 'bottling');
                        navigate('/active');
                    } catch (error) {
                        alert("Hubo un error descontando insumos: " + error.message);
                    }
                }
            } else if (currentPhase === 'bottling') {
                if (!batch) return;
                if (window.confirm(`¿Lote acondicionado? Mover ${recipe.name} al Historial definitivo.`)) {
                    try {
                        const daysElapsedTotal = Math.floor((Date.now() - batch.timestamp) / (1000 * 60 * 60 * 24));
                        const getMillis = (val) => val && typeof val.toMillis === 'function' ? val.toMillis() : (val || Date.now());

                        const notesPrefix = batch.historyNotes && batch.historyNotes.length > 0 ? batch.historyNotes.join('\n') + '\n\n' : '';

                        const newHistoryItem = {
                            ...batch,
                            dateBrewed: batch.dateBrewed || batch.date,
                            dateBottled: getFormattedDate(),
                            date: batch.dateBrewed || batch.date,
                            notes: `${notesPrefix}Completado en el Día ${daysElapsedTotal}`,
                            status: 'Completada',
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
            }
        } else {
            const nextStep = stepsArray[safeStepIdx + 1];

            // If we are in fermenting, check if this step involves dry hopping to deduct it exactly here
            if (currentPhase === 'fermenting' && batch && !batch.deductedHops) {
                const titleDesc = `${step.title || ''} ${step.desc || ''}`.toLowerCase();
                const isDryHopStep = titleDesc.includes('lúpulo') || titleDesc.includes('dry hop');
                if (isDryHopStep) {
                    try {
                        const actualDeductions = await deductBatch(recipe, batch.volume, ['fermenting_hops']);
                        const { addedCost, warnings } = calculateActualDeductedCost(actualDeductions);
                        await updateBatchField(batch.id, {
                            deductedHops: true,
                            totalCost: (batch.totalCost || 0) + addedCost,
                            historyNotes: [...(batch.historyNotes || []), ...warnings]
                        });
                    } catch (error) {
                        alert("Stock insuficiente para el Dry Hop: " + error.message);
                    }
                }
            }

            setBrewState({
                ...brewState,
                stepIdx: safeStepIdx + 1,
                timeLeft: nextStep.duration && !isNaN(parseFloat(nextStep.duration)) ? parseFloat(nextStep.duration) * 60 : 0,
                isRunning: false
            });
        }
    };

    const handleAbandon = async () => {
        if (currentPhase === 'cooking') {
            if (window.confirm("¿Seguro que deseas abandonar la cocción? No se guardará ningún registro de este intento.")) {
                navigate(labels.backUrl);
            }
        } else {
            if (!batch) return;
            if (window.confirm("¿Seguro que deseas ABANDONAR este lote en proceso? Se guardará en el historial como 'Abandonada' para mantener el registro de la pérdida.")) {
                try {
                    const daysElapsedTotal = Math.floor((Date.now() - batch.timestamp) / (1000 * 60 * 60 * 24));
                    const notesPrefix = batch.historyNotes && batch.historyNotes.length > 0 ? batch.historyNotes.join('\n') + '\n\n' : '';

                    const newHistoryItem = {
                        ...batch,
                        dateBrewed: batch.dateBrewed || batch.date,
                        date: batch.dateBrewed || batch.date,
                        notes: `${notesPrefix}Falla confirmada. Lote abandonado en fase de ${currentPhase} (Día ${daysElapsedTotal} del proceso total).`,
                        status: 'Abandonada'
                    };
                    await completeBatch(batch.id, newHistoryItem);
                    alert("El lote se ha descartado y registrado en el historial como abandonado.");
                    navigate('/history');
                } catch (error) {
                    alert("Error al abandonar lote: " + error);
                }
            }
        }
    };

    const getPhaseLabels = () => {
        if (currentPhase === 'cooking') return { icon: <Beaker size={32} />, title: "Cocinando:", btnIcon: <Save size={28} />, btnText: "Terminar Cocción / A Fermentador", backUrl: `/recipes/${id}`, bg: "bg-amber-500", hoverBg: "hover:bg-amber-400", border: "border-amber-700" };
        if (currentPhase === 'fermenting') return { icon: <Activity size={32} />, title: "Fermentando:", btnIcon: <Package size={28} />, btnText: "Empezar Embotellado", backUrl: '/active', bg: "bg-emerald-500", hoverBg: "hover:bg-emerald-400", border: "border-emerald-700" };
        if (currentPhase === 'bottling') return { icon: <Package size={32} />, title: "Envasando:", btnIcon: <Save size={28} />, btnText: "Completar Lote (Al Historial)", backUrl: '/active', bg: "bg-blue-500", hoverBg: "hover:bg-blue-400", border: "border-blue-700" };
        return { icon: <Beaker size={32} />, title: "", btnIcon: <Save size={28} />, btnText: "", backUrl: '/active', bg: "bg-amber-500", hoverBg: "hover:bg-amber-400", border: "border-amber-700" };
    };

    const labels = getPhaseLabels();

    return (
        <div className="bg-slate-900 p-6 md:p-12 rounded-3xl shadow-2xl border border-slate-700 animate-fadeIn min-h-[75vh] flex flex-col text-white relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* MODAL DE ADVERTENCIA DE STOCK */}
            {showWarningModal && stockWarnings.length > 0 && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-amber-500/50 rounded-3xl p-8 max-w-lg w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-amber-500/20 p-3 rounded-xl">
                                <AlertTriangle size={28} className="text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white">Stock Insuficiente</h3>
                                <p className="text-slate-400 text-sm font-medium">Algunos insumos no alcanzan para {targetVolume}L</p>
                            </div>
                        </div>
                        <div className="space-y-3 mb-8 max-h-60 overflow-y-auto">
                            {stockWarnings.map((item, i) => (
                                <div key={i} className="flex justify-between items-center bg-red-900/20 border border-red-800/30 p-3 rounded-xl">
                                    <div>
                                        <span className="font-bold text-white block">{item.name}</span>
                                        <span className="text-[10px] uppercase font-black tracking-wider text-muted">{item.category}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-red-400 font-black block">
                                            {item.available} / {item.needed} {item.unit}
                                        </span>
                                        <span className="text-red-500/60 text-[10px] font-bold">
                                            {item.inInventory ? `Faltan ${(item.needed - item.available).toFixed(2)}` : 'No registrado'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold transition-colors border border-slate-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    setShowWarningModal(false);
                                    setHasDismissedWarning(true);
                                }}
                                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 py-3 rounded-xl font-black transition-colors"
                            >
                                Cocinar de todas formas
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center border-b border-slate-700/50 pb-6 mb-8 relative z-10">
                <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3 text-amber-500">
                    {labels.icon} {labels.title} <span className="text-white drop-shadow-sm">{recipe.name || 'Lote'}</span>
                </h2>
                <div className="flex items-center gap-3">
                    <span className="bg-blue-900/30 text-blue-400 px-3 py-1.5 rounded-full font-black text-sm border border-blue-800/50">
                        {targetVolume}L
                    </span>
                    <span className="bg-slate-800 text-slate-300 px-4 py-2 rounded-full font-black text-sm tracking-wider uppercase border border-slate-700 shadow-inner">
                        Paso {safeStepIdx + 1} de {stepsArray.length}
                    </span>
                    <button
                        onClick={handleAbandon}
                        title="Abandonar Lote"
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 p-2 md:px-4 md:py-2 rounded-full transition-colors border border-transparent hover:border-red-500/50 flex items-center gap-2 font-bold text-sm"
                    >
                        <Trash2 size={18} />
                        <span className="hidden md:inline">Abandonar</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 relative z-10">
                <h3 className="text-4xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-md">{step?.title || 'Proceso'}</h3>
                <p className="text-xl md:text-2xl text-slate-300 max-w-3xl font-medium leading-relaxed">{step?.desc || ''}</p>

                {step?.details && typeof step.details === 'string' && (
                    <div className="bg-slate-800/80 backdrop-blur-md p-6 md:p-8 rounded-2xl text-left max-w-3xl border border-slate-600/50 text-lg text-slate-200 w-full shadow-2xl">
                        <span className="font-black flex items-center gap-2 mb-3 text-amber-400 uppercase tracking-wider text-sm"><Info size={20} /> Detalle Técnico</span>
                        <div className="leading-relaxed">
                            {step.details.split(/(?=\d+\.\s)/).filter(Boolean).map((part, i) => {
                                const match = part.match(/^(\d+\.\s)(.*)/);
                                if (match) {
                                    return <p key={i} className="mb-2"><strong>{match[1]}</strong>{match[2]}</p>;
                                }
                                return <p key={i} className="mb-2">{part}</p>;
                            })}
                        </div>
                    </div>
                )}

                {step?.duration !== undefined && step?.duration !== null && !isNaN(parseFloat(step?.duration)) ? (
                    currentPhase === 'cooking' ? (
                        <div className="my-10">
                            <div className={`text-8xl md:text-[12rem] font-black tracking-tighter font-mono drop-shadow-2xl ${brewState.timeLeft === 0 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                                {formatTime(brewState.timeLeft)}
                            </div>
                            <div className="flex justify-center gap-6 mt-12">
                                <button
                                    onClick={() => setBrewState(prev => ({ ...prev, isRunning: !prev.isRunning }))}
                                    className={`px-12 py-6 rounded-full font-black text-2xl flex items-center gap-4 text-white transition-all shadow-xl hover:scale-105 ${brewState.isRunning ? 'bg-orange-600 hover:bg-orange-500 border-b-4 border-orange-800' : 'bg-emerald-600 hover:bg-emerald-500 border-b-4 border-emerald-800'}`}
                                >
                                    {brewState.isRunning ? <><Pause className="fill-white" size={32} /> Pausar</> : <><Play className="fill-white" size={32} /> Iniciar</>}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="my-12 p-10 md:p-12 border-4 border-dashed border-slate-700/50 rounded-3xl w-full max-w-2xl bg-slate-800/30 backdrop-blur-sm shadow-inner">
                            <div className="flex flex-col items-center gap-2">
                                <p className="text-slate-400 font-bold text-xl uppercase tracking-widest">Objetivo de la Fase</p>
                                <p className={`${labels.bg.replace('bg-', 'text-')} drop-shadow-sm font-black text-5xl md:text-6xl mb-4`}>
                                    {step.duration} {Number(step.duration) === 1 ? 'Día' : 'Días'}
                                </p>
                                <p className="text-slate-300 font-medium text-lg leading-relaxed max-w-lg">
                                    Esta etapa toma múltiples días. Revisa tus lotes activos en el dashboard para ver el progreso real. No es necesario quedarse en esta pantalla.
                                </p>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="my-12 p-12 border-4 border-dashed border-slate-700 rounded-3xl w-full max-w-2xl bg-slate-800/30 backdrop-blur-sm">
                        <p className="text-slate-400 font-bold text-2xl">
                            {step?.duration ? `Tiempo de la receta: ${step.duration}` : "Aplica en su momento y avanza."}
                        </p>
                    </div>
                )}
            </div>

            <div className="border-t border-slate-700/50 pt-8 mt-auto flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                <button
                    onClick={() => navigate(labels.backUrl)}
                    className="flex items-center gap-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 font-bold px-6 py-4 rounded-2xl transition-all shadow-md w-full md:w-auto justify-center"
                >
                    <ArrowLeft size={18} /> Guardar y Salir
                </button>
                <button
                    onClick={handleNextStep}
                    className={`${labels.bg} ${labels.hoverBg} text-slate-900 px-10 py-5 rounded-2xl font-black text-xl flex items-center gap-3 transition-all shadow-xl border-b-4 ${labels.border} hover:border-transparent active:translate-y-1 active:border-b-0 w-full md:w-auto justify-center`}
                >
                    {isLastStep ? <>{labels.btnIcon} {labels.btnText}</> : <>Siguiente Paso <SkipForward size={28} /></>}
                </button>
            </div>
        </div>
    );
}
