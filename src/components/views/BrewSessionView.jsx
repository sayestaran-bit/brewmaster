// /src/components/views/BrewSessionView.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Beaker, Info, Play, Pause, Save, SkipForward, ArrowLeft, AlertTriangle } from 'lucide-react';
import { formatTime, getFormattedDate } from '../../utils/formatters';
import { calculateRecipeCost } from '../../utils/costCalculator';
import { useRecipes } from '../../hooks/useRecipes';
import { useInventory } from '../../hooks/useInventory';
import { useActiveBatches } from '../../hooks/useActiveBatches';

export default function BrewSessionView() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { recipes } = useRecipes();
    const { inventory, deductBatch } = useInventory();
    const { startBatch } = useActiveBatches();

    const [recipe, setRecipe] = useState(null);
    const [targetVolume, setTargetVolume] = useState(20);
    const [stockWarnings, setStockWarnings] = useState([]);
    const [showWarningModal, setShowWarningModal] = useState(false);

    // Estado local para la sesión
    const [brewState, setBrewState] = useState({
        stepIdx: 0,
        timeLeft: 0,
        isRunning: false
    });

    // VUL-004 FIX: Efecto separado solo para cargar la receta.
    // Removimos `inventory` y `searchParams` de las dependencias para evitar
    // que los cambios de stock o re-renders reseteen el estado de la sesión.
    useEffect(() => {
        if (recipes.length > 0) {
            const found = recipes.find(r => r.id === id);
            if (found) {
                setRecipe(found);
                const volParam = searchParams.get('vol');
                const vol = volParam ? Number(volParam) : (found.targetVolume || 20);
                setTargetVolume(vol);
                const firstStep = (found.steps && found.steps[0]) ? found.steps[0] : {};
                setBrewState(prev => ({ ...prev, timeLeft: firstStep.duration ? firstStep.duration * 60 : 0 }));
            } else {
                navigate('/recipes');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, recipes, navigate]); // searchParams e inventory removidos intencionalmente

    // VUL-004 FIX: Efecto separado para verificar stock.
    // Se ejecuta solo cuando la receta o el volumen cambia, no en cada update de inventory.
    useEffect(() => {
        if (recipe && inventory && inventory.length > 0) {
            const costResult = calculateRecipeCost(recipe, inventory, targetVolume);
            if (costResult.missingItems.length > 0) {
                setStockWarnings(costResult.missingItems);
                setShowWarningModal(true);
            } else {
                setStockWarnings([]);
            }
        }
    }, [recipe, targetVolume]); // No depende del array inventory completo

    // VUL-005 FIX: El timer solo crea/destruye el intervalo cuando isRunning cambia,
    // no en cada tick de timeLeft. Esto evita crear un nuevo setInterval cada segundo.
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
    }, [brewState.isRunning]); // Solo depende de isRunning

    if (!recipe) return null;

    const stepsArray = Array.isArray(recipe.steps) && recipe.steps.length > 0 ? recipe.steps : [{ title: "Cocción Genérica", desc: "Sigue tu instinto cervecero.", duration: 60 }];
    const safeStepIdx = Math.min(brewState.stepIdx, stepsArray.length - 1);
    const step = stepsArray[safeStepIdx];
    const isLastStep = safeStepIdx === stepsArray.length - 1;

    const handleNextStep = async () => {
        if (isLastStep) {
            if (window.confirm(`¿Terminaste el día de cocción para ${recipe.name}? Esto descontará insumos de tu inventario y enviará el lote a Fermentación.`)) {
                try {
                    const costResult = calculateRecipeCost(recipe, inventory, targetVolume);

                    // Deduct inventory sequentially
                    await deductBatch(recipe, targetVolume);

                    const newBatchItem = {
                        recipeId: recipe.id,
                        recipeName: recipe.name || 'Sin Nombre',
                        dateBrewed: getFormattedDate(),
                        date: getFormattedDate(),
                        timestamp: Date.now(),
                        volume: targetVolume || 0,
                        og: recipe.og || '-',
                        fg: recipe.fg || '-',
                        abv: recipe.abv || '-',
                        category: recipe.category || 'Otros',
                        totalCost: costResult.total || 0,
                        status: 'Fermentando'
                    };

                    await startBatch(newBatchItem);
                    navigate('/active');
                } catch (error) {
                    console.error("Error al finalizar cocción:", error);
                    alert("Hubo un problema descontando el inventario: " + error.message);
                }
            }
        } else {
            const nextStep = stepsArray[safeStepIdx + 1];
            setBrewState({
                ...brewState,
                stepIdx: safeStepIdx + 1,
                timeLeft: nextStep.duration ? Number(nextStep.duration) * 60 : 0,
                isRunning: false
            });
        }
    };

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
                                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">{item.category}</span>
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
                                onClick={() => setShowWarningModal(false)}
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
                    <Beaker size={32} /> Cocinando: <span className="text-white drop-shadow-sm">{recipe.name || 'Lote'}</span>
                </h2>
                <div className="flex items-center gap-3">
                    <span className="bg-blue-900/30 text-blue-400 px-3 py-1.5 rounded-full font-black text-sm border border-blue-800/50">
                        {targetVolume}L
                    </span>
                    <span className="bg-slate-800 text-slate-300 px-4 py-2 rounded-full font-black text-sm tracking-wider uppercase border border-slate-700 shadow-inner">
                        Paso {safeStepIdx + 1} de {stepsArray.length}
                    </span>
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

                {step?.duration !== undefined ? (
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
                    <div className="my-12 p-12 border-4 border-dashed border-slate-700 rounded-3xl w-full max-w-2xl bg-slate-800/30 backdrop-blur-sm">
                        <p className="text-slate-400 font-bold text-2xl">Este paso es manual. Avanza cuando termines.</p>
                    </div>
                )}
            </div>

            <div className="border-t border-slate-700/50 pt-8 mt-auto flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                <button onClick={() => navigate(`/recipes/${id}`)} className="flex items-center gap-2 text-slate-400 hover:text-red-400 font-bold text-lg transition-colors"><ArrowLeft size={18} /> Abandonar Cocción</button>
                <button
                    onClick={handleNextStep}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-10 py-5 rounded-2xl font-black text-xl flex items-center gap-3 transition-all shadow-xl border-b-4 border-amber-700 hover:border-amber-600 active:translate-y-1 active:border-b-0 w-full md:w-auto justify-center"
                >
                    {isLastStep ? <><Save size={28} /> Enviar a Fermentador</> : <>Siguiente Paso <SkipForward size={28} /></>}
                </button>
            </div>
        </div>
    );
}
