// /src/components/views/BrewSessionView.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Beaker, Info, Play, Pause, Save, SkipForward, ArrowLeft } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { formatTime, getFormattedDate } from '../../utils/formatters';

export default function BrewSessionView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { recipes, inventory, setInventory, activeBatches, setActiveBatches, updateCloudData } = useAppContext();

    const [recipe, setRecipe] = useState(null);

    // Estado local para la sesión
    const [brewState, setBrewState] = useState({
        stepIdx: 0,
        timeLeft: 0,
        isRunning: false
    });

    // Calculo simplificado de costo para esta vista local importando helpers si fuera necesario
    // O podemos traernos defaultPrices
    const defaultPrices = { malta: 2500, lupulo: 40000, levadura: 4500 };
    const calculateCostForRecipe = (r, targetVol) => {
        let neto = 0;
        const safeMalts = Array.isArray(r.ingredients?.malts) ? r.ingredients.malts : [];
        const safeHops = Array.isArray(r.ingredients?.hops) ? r.ingredients.hops : [];
        const scaleFactor = (targetVol || 1) / (r.targetVolume || 1);

        safeMalts.forEach(m => {
            const scaledAmount = (Number(m.amount) || 0) * scaleFactor;
            const mName = (m.name || '').toLowerCase();
            const item = inventory.find(i => {
                const iName = (i.name || '').toLowerCase();
                return i.category === 'Malta' && iName && (iName === mName || mName.includes(iName));
            });
            if (item) neto += scaledAmount * Number(item.price); else neto += scaledAmount * defaultPrices.malta;
        });
        safeHops.forEach(h => {
            const scaledAmount = Math.round((Number(h.amount) || 0) * scaleFactor);
            const hName = (h.name || '').toLowerCase();
            const item = inventory.find(i => {
                const iName = (i.name || '').toLowerCase();
                return i.category === 'Lúpulo' && iName && hName.includes(iName);
            });
            if (item) neto += scaledAmount * Number(item.price); else neto += scaledAmount * defaultPrices.lupulo;
        });
        return neto * 1.19; // con IVA aproximado
    };

    useEffect(() => {
        if (recipes.length > 0) {
            const found = recipes.find(r => r.id === id);
            if (found) {
                setRecipe(found);
                const firstStep = (found.steps && found.steps[0]) ? found.steps[0] : {};
                setBrewState(prev => ({ ...prev, timeLeft: firstStep.duration ? firstStep.duration * 60 : 0 }));
            } else {
                navigate('/recipes');
            }
        }
    }, [id, recipes, navigate]);

    useEffect(() => {
        let interval;
        if (brewState.isRunning && brewState.timeLeft > 0) {
            interval = setInterval(() => {
                setBrewState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
            }, 1000);
        } else if (brewState.timeLeft === 0) {
            setBrewState(prev => ({ ...prev, isRunning: false }));
        }
        return () => clearInterval(interval);
    }, [brewState.isRunning, brewState.timeLeft]);

    if (!recipe) return null;

    const stepsArray = Array.isArray(recipe.steps) && recipe.steps.length > 0 ? recipe.steps : [{ title: "Cocción Genérica", desc: "Sigue tu instinto cervecero.", duration: 60 }];
    const safeStepIdx = Math.min(brewState.stepIdx, stepsArray.length - 1);
    const step = stepsArray[safeStepIdx];
    const isLastStep = safeStepIdx === stepsArray.length - 1;

    const handleNextStep = () => {
        if (isLastStep) {
            if (window.confirm(`¿Terminaste el día de cocción para ${recipe.name}? Esto descontará insumos de tu inventario y enviará el lote a Fermentación.`)) {
                try {
                    const totalCost = calculateCostForRecipe(recipe, recipe.targetVolume);

                    let currentInventory = JSON.parse(JSON.stringify(inventory));
                    (recipe.ingredients?.malts || []).forEach(m => {
                        const mName = (m.name || '').toLowerCase();
                        const item = currentInventory.find(i => {
                            const iName = (i.name || '').toLowerCase();
                            return i.category === 'Malta' && iName && (iName === mName || mName.includes(iName));
                        });
                        if (item) item.stock = parseFloat(Math.max(0, Number(item.stock) - (Number(m.amount) || 0)).toFixed(4));
                    });
                    (recipe.ingredients?.hops || []).forEach(h => {
                        const hName = (h.name || '').toLowerCase();
                        const item = currentInventory.find(i => {
                            const iName = (i.name || '').toLowerCase();
                            return i.category === 'Lúpulo' && iName && hName.includes(iName);
                        });
                        if (item) item.stock = parseFloat(Math.max(0, Number(item.stock) - (Number(h.amount) || 0)).toFixed(4));
                    });
                    const yeastObj = recipe.ingredients?.yeast;
                    if (yeastObj) {
                        const yeastName = typeof yeastObj === 'string' ? yeastObj : (yeastObj.name || '');
                        const yeastAmount = typeof yeastObj === 'string' ? 1 : (Number(yeastObj.amount) || 1);
                        const yName = (yeastName || '').toLowerCase();
                        const yItem = currentInventory.find(i => {
                            const iName = (i.name || '').toLowerCase();
                            return i.category === 'Levadura' && iName && yName.includes(iName);
                        });
                        if (yItem) yItem.stock = parseFloat(Math.max(0, Number(yItem.stock) - yeastAmount).toFixed(4));
                    }

                    const newBatchItem = {
                        id: 'batch-' + Date.now(),
                        recipeId: recipe.id,
                        recipeName: recipe.name || 'Sin Nombre',
                        date: getFormattedDate(),
                        timestamp: Date.now(),
                        volume: recipe.targetVolume || 0,
                        og: recipe.og || '-',
                        fg: recipe.fg || '-',
                        abv: recipe.abv || '-',
                        category: recipe.category || 'Otros',
                        totalCost: totalCost || 0,
                        status: 'Fermentando'
                    };

                    const newBatches = [newBatchItem, ...activeBatches];

                    setActiveBatches(newBatches);
                    setInventory(currentInventory);
                    updateCloudData({ activeBatches: newBatches, inventory: currentInventory });
                    navigate('/active');
                } catch (error) {
                    console.error("Error al finalizar cocción:", error);
                    alert("Hubo un problema descontando el inventario, pero el lote fue guardado en activos.");
                    navigate('/active');
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

            <div className="flex justify-between items-center border-b border-slate-700/50 pb-6 mb-8 relative z-10">
                <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3 text-amber-500">
                    <Beaker size={32} /> Cocinando: <span className="text-white drop-shadow-sm">{recipe.name || 'Lote'}</span>
                </h2>
                <span className="bg-slate-800 text-slate-300 px-4 py-2 rounded-full font-black text-sm tracking-wider uppercase border border-slate-700 shadow-inner">
                    Paso {safeStepIdx + 1} de {stepsArray.length}
                </span>
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
