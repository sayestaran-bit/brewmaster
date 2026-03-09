// /src/components/views/RecipeDetailView.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Thermometer, Clock, CheckCircle2, Activity, Play, Star, BookOpen, Droplets, Info, FileClock, Loader2, BrainCircuit, Wand2, Sparkles, Banknote, Scale, Wheat, Leaf, Beaker, ChevronDown, ChevronUp, X, Trash2 } from 'lucide-react';
import { getThemeForCategory, getSrmColor, baseWater } from '../../utils/helpers';
import { formatCurrency, getFormattedDate } from '../../utils/formatters';
import { calculateRecipeCost } from '../../utils/costCalculator';
import { getRecipeAdvice } from '../../services/gemini';
import { useRecipes } from '../../hooks/useRecipes';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../context/AuthContext';
import { useActiveBatches } from '../../hooks/useActiveBatches';

export default function RecipeDetailView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const isGuest = currentUser?.isAnonymous;
    const guestTooltip = "Regístrate para crear recetas ilimitadas y más!";
    const { recipes, deleteRecipe } = useRecipes();
    const { inventory } = useInventory();

    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [targetVol, setTargetVol] = useState(20);
    const [activeTab, setActiveTab] = useState('recipe');
    const [completedSteps, setCompletedSteps] = useState([]);
    const [expandedStep, setExpandedStep] = useState(null);
    const [aiAdvice, setAiAdvice] = useState(null);
    const [isAdvising, setIsAdvising] = useState(false);
    const [showBrewModal, setShowBrewModal] = useState(false);
    const [batchIdentity, setBatchIdentity] = useState('');
    const [isStartingBrew, setIsStartingBrew] = useState(false);

    const { startBatch } = useActiveBatches();

    const handleStartBrew = async () => {
        if (!targetVol || targetVol <= 0 || !selectedRecipe) return;
        setIsStartingBrew(true);

        const newBatchItem = {
            recipeId: selectedRecipe.id,
            recipeName: selectedRecipe.name || 'Sin Nombre',
            customName: batchIdentity.trim() || null,
            dateBrewed: getFormattedDate(),
            date: getFormattedDate(),
            timestamp: Date.now(),
            volume: targetVol || 0,
            og: Number(selectedRecipe.og) || 1.050,
            fg: Number(selectedRecipe.fg) || 1.010,
            abv: Number(selectedRecipe.abv) || 5.0,
            category: selectedRecipe.category || 'Otros',
            totalCost: 0,
            status: 'Cocinando',
            phase: 'cooking',
            phaseTimestamps: {
                cookingStart: Date.now(),
                fermentationStart: null,
                bottlingStart: null
            },
            deductedHops: false
        };
        try {
            const batchId = await startBatch(newBatchItem);
            setShowBrewModal(false);
            navigate(`/brew/${batchId}?phase=cooking`);
        } catch (error) {
            console.error("Error starting batch:", error);
            alert("Error al iniciar el lote: " + error.message);
        } finally {
            setIsStartingBrew(false);
        }
    };

    const handleDelete = async () => {
        if (isGuest) {
            alert(guestTooltip);
            return;
        }
        if (window.confirm(`¿Seguro que deseas eliminar la receta: ${selectedRecipe.name}? Esta acción no se puede deshacer.`)) {
            try {
                await deleteRecipe(selectedRecipe.id);
                navigate('/recipes');
            } catch (error) {
                console.error("Error deleting recipe:", error);
                alert("Error al eliminar la receta: " + error.message);
            }
        }
    };

    useEffect(() => {
        if (recipes.length > 0) {
            const found = recipes.find(r => r.id === id);
            if (found) {
                setSelectedRecipe(found);
                setTargetVol(found.targetVolume || 20);
            } else {
                navigate('/recipes');
            }
        }
    }, [id, recipes, navigate]);

    // --- HOOKS ALWAYS AT THE TOP TO AVOID REACT ERROR 310 ---
    const scaledRecipe = useMemo(() => {
        if (!selectedRecipe) return null;
        const scaleFactor = (targetVol || 1) / (selectedRecipe.targetVolume || 1);
        const safeMalts = Array.isArray(selectedRecipe.ingredients?.malts) ? selectedRecipe.ingredients.malts : [];
        const safeHops = Array.isArray(selectedRecipe.ingredients?.hops) ? selectedRecipe.ingredients.hops : [];
        const safeOthers = Array.isArray(selectedRecipe.ingredients?.others) ? selectedRecipe.ingredients.others : [];
        const safeYeast = typeof selectedRecipe.ingredients?.yeast === 'string'
            ? { name: selectedRecipe.ingredients.yeast, amount: 1, unit: 'sobre' }
            : (selectedRecipe.ingredients?.yeast || { name: 'Levadura', amount: 1, unit: 'sobre' });
        return {
            ...selectedRecipe,
            ingredients: {
                malts: safeMalts.map(m => ({ ...m, amount: ((Number(m.amount) || 0) * scaleFactor).toFixed(2) })),
                hops: safeHops.map(h => ({ ...h, amount: Math.round((Number(h.amount) || 0) * scaleFactor) })),
                others: safeOthers.map(o => ({ ...o, amount: ((Number(o.amount) || 0) * scaleFactor).toFixed(2) })),
                yeast: safeYeast,
                water: {
                    strike: ((Number(selectedRecipe.ingredients?.water?.strike) || 15) * scaleFactor).toFixed(1),
                    sparge: ((Number(selectedRecipe.ingredients?.water?.sparge) || 15) * scaleFactor).toFixed(1),
                },
            },
        };
    }, [selectedRecipe, targetVol]);

    const costInfo = useMemo(
        () => selectedRecipe ? calculateRecipeCost(selectedRecipe, inventory, targetVol) : null,
        [selectedRecipe, inventory, targetVol]
    );

    const saltAdditions = useMemo(() => {
        if (!scaledRecipe || !scaledRecipe.waterProfile) return null;
        const target = scaledRecipe.waterProfile;
        const totalWaterLiters = Number(scaledRecipe.ingredients.water.strike) + Number(scaledRecipe.ingredients.water.sparge);
        if (totalWaterLiters <= 0) return null;
        const diff = {
            Ca: Math.max(0, (Number(target.Ca) || 0) - baseWater.Ca),
            Mg: Math.max(0, (Number(target.Mg) || 0) - baseWater.Mg),
            SO4: Math.max(0, (Number(target.SO4) || 0) - baseWater.SO4),
            Cl: Math.max(0, (Number(target.Cl) || 0) - baseWater.Cl),
            HCO3: Math.max(0, (Number(target.HCO3) || 0) - baseWater.HCO3),
        };
        const epsomGrams = (diff.Mg * totalWaterLiters) / 99;
        const epsomSO4Contributed = (epsomGrams * 390) / totalWaterLiters || 0;
        const cacl2Grams = (diff.Cl * totalWaterLiters) / 482;
        const cacl2CaContributed = (cacl2Grams * 272) / totalWaterLiters || 0;
        const bakingSodaGrams = (diff.HCO3 * totalWaterLiters) / 728;
        const remainingSO4 = Math.max(0, diff.SO4 - epsomSO4Contributed);
        const gypsumGrams = (remainingSO4 * totalWaterLiters) / 558;
        const gypsumCaContributed = (gypsumGrams * 232) / totalWaterLiters || 0;
        return {
            totalWater: totalWaterLiters.toFixed(1),
            gypsum: gypsumGrams.toFixed(1),
            cacl2: cacl2Grams.toFixed(1),
            epsom: epsomGrams.toFixed(1),
            bakingSoda: bakingSodaGrams.toFixed(1),
            finalEstimates: {
                Ca: Math.round(baseWater.Ca + cacl2CaContributed + gypsumCaContributed),
                Mg: Math.round(baseWater.Mg + diff.Mg),
                SO4: Math.round(baseWater.SO4 + epsomSO4Contributed + remainingSO4),
                Cl: Math.round(baseWater.Cl + diff.Cl),
                HCO3: Math.round(baseWater.HCO3 + diff.HCO3),
            },
        };
    }, [scaledRecipe]);

    const toggleStep = (id) => setCompletedSteps(prev => prev.includes(id) ? prev.filter(stepId => stepId !== id) : [...prev, id]);
    const toggleStepDetails = (e, id) => { e.stopPropagation(); setExpandedStep(prev => prev === id ? null : id); };

    // Debounce ref: prevent spam-clicking the IA button
    const aiDebounceRef = useRef(null);
    const handleGetAiAdvice = async () => {
        if (aiDebounceRef.current) return; // already pending / cooling down
        aiDebounceRef.current = setTimeout(() => { aiDebounceRef.current = null; }, 3000);
        setIsAdvising(true);
        setAiAdvice(null);
        try {
            const response = await getRecipeAdvice(scaledRecipe);
            setAiAdvice(response);
        } catch (err) {
            setAiAdvice("El Maestro Cervecero de la IA está descansando. Intenta de nuevo más tarde.");
        } finally {
            setIsAdvising(false);
        }
    };

    if (!selectedRecipe || !scaledRecipe || !costInfo) return null;

    const theme = getThemeForCategory(selectedRecipe.category);

    return (
        <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => navigate('/recipes')} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 font-bold bg-panel px-4 py-2 rounded-xl transition-all shadow-sm border border-line hover:-translate-x-1">
                    <ArrowLeft size={20} /> Mis Recetas
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={() => { if (!isGuest) navigate(`/recipes/${id}/edit`); else alert(guestTooltip); }}
                        disabled={isGuest}
                        title={isGuest ? guestTooltip : undefined}
                        className="flex items-center gap-2 text-white font-bold bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition-all shadow-sm hover:scale-105 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Edit3 size={18} /> Editar
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isGuest}
                        title={isGuest ? guestTooltip : undefined}
                        className="flex items-center gap-2 text-red-500 font-bold bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-xl transition-all shadow-sm hover:scale-105 border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Trash2 size={18} /> Eliminar
                    </button>
                </div>
            </div>

            {/* HEADER DINÁMICO */}
            <div className={`${theme.bg} text-white p-8 md:p-12 rounded-t-[2.5rem] shadow-xl flex flex-col md:flex-row justify-between items-start md:items-end relative overflow-hidden`}>
                <div className="relative z-10 w-full md:w-2/3">
                    <span className="bg-white/20 px-5 py-2 rounded-full text-sm font-black tracking-[0.2em] uppercase mb-4 inline-block shadow-sm backdrop-blur-md">
                        {scaledRecipe.category || 'Sin Categoría'}
                    </span>
                    <h2 className="text-5xl md:text-6xl font-black mb-3 leading-[0.9] drop-shadow-md tracking-tighter">{scaledRecipe.name || 'Receta Sin Nombre'}</h2>

                    {scaledRecipe.description && (
                        <p className="text-white/80 font-medium text-lg leading-relaxed mt-4 max-w-2xl bg-black/10 p-4 rounded-xl backdrop-blur-sm border border-white/5">
                            {scaledRecipe.description}
                        </p>
                    )}

                    <div className="flex flex-wrap gap-3 mt-6 font-bold text-white/90">
                        <span className="flex items-center gap-1.5 bg-black/20 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm" title="Alcohol por Volumen"><Thermometer size={18} /> ABV: {scaledRecipe.abv}%</span>
                        <span className="flex items-center gap-1.5 bg-black/20 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm" title="Gravedad Original"><Clock size={18} /> DO: {scaledRecipe.og}</span>
                        <span className="flex items-center gap-1.5 bg-black/20 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm" title="Gravedad Final"><CheckCircle2 size={18} /> DF: {scaledRecipe.fg}</span>
                        {(scaledRecipe.ibu > 0) && <span className="flex items-center gap-1.5 bg-black/20 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm" title="Amargor (IBU)"><Activity size={18} /> IBU: {scaledRecipe.ibu}</span>}
                        {(scaledRecipe.colorSRM > 0) && (
                            <span className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm" title="Color Estimado (SRM)">
                                <div className="w-4 h-4 rounded-full border border-white/50" style={{ backgroundColor: getSrmColor(scaledRecipe.colorSRM) }}></div> SRM: {scaledRecipe.colorSRM}
                            </span>
                        )}
                    </div>
                </div>

                <div className="mt-8 md:mt-0 flex flex-col items-center md:items-end gap-4 relative z-10 w-full md:w-auto">
                    <div className="flex flex-col items-end bg-black/20 p-5 rounded-3xl backdrop-blur-md border border-white/20 shadow-lg w-full md:w-auto">
                        <label className="font-bold text-white/90 text-[10px] mb-2 uppercase tracking-widest text-center md:text-right w-full">Volumen Objetivo</label>
                        <div className="flex items-center justify-center gap-3 w-full">
                            <input
                                type="number"
                                value={targetVol}
                                onChange={(e) => setTargetVol(Number(e.target.value) || 0)}
                                className="w-24 p-2 bg-white text-slate-800 rounded-2xl text-center focus:ring-4 focus:ring-white/50 outline-none text-2xl font-black shadow-inner"
                                min="1"
                            />
                            <span className="text-white font-black text-2xl italic">L</span>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowBrewModal(true)}
                        className="bg-white text-slate-900 px-6 py-4 rounded-[1.5rem] font-black text-lg transition-all duration-300 shadow-2xl hover:scale-105 active:scale-95 flex items-center justify-center gap-3 w-full border-4 border-white/10 hover:border-white/30"
                    >
                        <Play size={20} className="text-amber-500 fill-amber-500" /> ¡COCINAR!
                    </button>
                </div>
            </div>

            {/* TABS NAVEGACIÓN */}
            <div className="flex flex-wrap border-b border-line bg-panel shadow-sm overflow-x-auto rounded-b-none">
                <button onClick={() => setActiveTab('recipe')} className={`flex-1 min-w-[100px] py-5 font-black text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'recipe' ? `bg-surface border-b-4 ${theme.border} ${theme.text}` : 'text-muted hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <BookOpen size={18} /> Receta
                </button>
                <button onClick={() => setActiveTab('process')} className={`flex-1 min-w-[100px] py-5 font-black text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'process' ? `bg-surface border-b-4 ${theme.border} ${theme.text}` : 'text-muted hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <CheckCircle2 size={18} /> Proceso
                </button>
                <button onClick={() => setActiveTab('water')} className={`flex-1 min-w-[100px] py-5 font-black text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'water' ? `bg-surface border-b-4 ${theme.border} ${theme.text}` : 'text-muted hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Droplets size={18} /> Agua
                </button>
                <button onClick={() => setActiveTab('tips')} className={`flex-1 min-w-[100px] py-5 font-black text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'tips' ? `bg-surface border-b-4 ${theme.border} ${theme.text}` : 'text-muted hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Info size={18} /> Tips
                </button>
                {(Array.isArray(scaledRecipe.modifications) && scaledRecipe.modifications.length > 0) && (
                    <button onClick={() => setActiveTab('history')} className={`flex-1 min-w-[100px] py-5 font-black text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'history' ? `bg-surface border-b-4 ${theme.border} ${theme.text}` : 'text-muted hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <FileClock size={18} /> Cambios
                    </button>
                )}
            </div>

            <div className="bg-panel p-6 md:p-10 rounded-b-[2.5rem] shadow-sm border border-t-0 border-line mt-0">

                {/* TAB: RECETA */}
                {activeTab === 'recipe' && (
                    <div className="space-y-10 animate-fadeIn">

                        {/* BOTON IA Y CONSEJOS */}
                        <div className="flex justify-end">
                            <button
                                onClick={handleGetAiAdvice}
                                disabled={isAdvising}
                                className="bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-400 font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow-md disabled:opacity-50 border border-amber-200 dark:border-amber-800"
                            >
                                {isAdvising ? <Loader2 className="animate-spin" size={18} /> : <BrainCircuit size={18} />}
                                {isAdvising ? 'Analizando parámetros...' : '✨ Consultar al Maestro IA'}
                            </button>
                        </div>

                        {aiAdvice && (
                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800 p-8 rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-inner relative animate-in zoom-in duration-500">
                                <div className="absolute top-6 right-6 text-amber-400/20"><Sparkles size={64} /></div>
                                <h4 className="font-black text-amber-800 dark:text-amber-500 text-xl flex items-center gap-2 mb-4">
                                    <Wand2 size={24} /> Análisis Experto de la Receta
                                </h4>
                                <div className="text-content font-medium text-base whitespace-pre-line leading-relaxed">
                                    {aiAdvice}
                                </div>
                            </div>
                        )}

                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-8 rounded-3xl border border-emerald-200 dark:border-emerald-800/50 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
                            <div className="flex items-center gap-5 w-full md:w-auto">
                                <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-5 rounded-2xl text-white shadow-lg flex-shrink-0">
                                    <Banknote size={36} />
                                </div>
                                <div>
                                    <h4 className="font-black text-emerald-900 dark:text-emerald-400 text-2xl tracking-tight">Costo de Producción</h4>
                                    {!costInfo.allFound && <p className="text-sm text-emerald-700 dark:text-emerald-600 font-medium flex items-center gap-1 mt-1"><Info size={14} /> Faltan ítems, usando estimación.</p>}
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-8 bg-panel p-6 rounded-2xl shadow-sm border border-emerald-100 dark:border-slate-700 w-full md:w-auto flex-1 md:flex-none justify-end">
                                <div className="flex flex-col text-sm border-b md:border-b-0 md:border-r border-gray-100 dark:border-slate-700 pb-4 md:pb-0 md:pr-8 justify-center">
                                    <div className="flex justify-between gap-10 text-muted mb-2">
                                        <span>Neto:</span>
                                        <span className="font-bold text-content">{formatCurrency(costInfo.neto)}</span>
                                    </div>
                                    <div className="flex justify-between gap-10 text-muted">
                                        <span>IVA (19%):</span>
                                        <span className="font-bold text-content">{formatCurrency(costInfo.iva)}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between md:flex-col items-center md:items-end md:justify-center gap-3 pl-0 md:pl-4">
                                    <div className="text-left md:text-right w-full">
                                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Lote</span>
                                        <span className="text-3xl font-black text-emerald-600 leading-none block">{formatCurrency(costInfo.total)}</span>
                                    </div>
                                    <div className="text-right w-full border-l border-gray-100 dark:border-slate-700 pl-4 md:border-none md:pl-0 mt-0 md:mt-2">
                                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Costo x Litro</span>
                                        <span className="text-xl font-black text-emerald-500 leading-none block">{formatCurrency(costInfo.perLiter)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-amber-50/50 dark:bg-amber-900/10 p-8 rounded-3xl border border-amber-200 dark:border-amber-800/30 shadow-sm">
                                <h3 className="text-2xl font-black flex items-center gap-3 border-b border-amber-200 dark:border-amber-800/50 pb-4 mb-6 text-amber-900 dark:text-amber-500">
                                    <Wheat className="text-amber-500" size={28} /> Granos y Agua
                                </h3>
                                <ul className="space-y-4">
                                    {scaledRecipe.ingredients.malts.map((malt, idx) => {
                                        const stockItem = costInfo.ingredients.find(i => i.category === 'Malta' && i.name === (malt.name || 'Malta desconocida'));
                                        const invItem = Array.isArray(inventory) ? inventory.find(i => i.category === 'Malta' && (i.name || '').toLowerCase().trim() === (malt.name || '').toLowerCase().trim()) : null;
                                        return (
                                            <li key={idx} className="flex justify-between items-center text-lg border-b border-amber-100 dark:border-amber-900/30 pb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1 group/tooltip relative">
                                                        <span className="font-bold text-content">{malt.name || 'Malta'}</span>
                                                        {invItem?.description && (
                                                            <>
                                                                <Info size={16} className="text-blue-400 cursor-help ml-1" />
                                                                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-48 bg-slate-800 text-white text-xs p-3 rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all shadow-xl z-50 pointer-events-none whitespace-normal">
                                                                    {invItem.description}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    {stockItem && (
                                                        stockItem.hasEnough
                                                            ? <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black" title={`Stock: ${stockItem.available} ${stockItem.unit}`}>✅ {stockItem.available} {stockItem.unit}</span>
                                                            : stockItem.inInventory
                                                                ? <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-black" title={`Faltan ${(stockItem.needed - stockItem.available).toFixed(2)} ${stockItem.unit}`}>⚠️ {stockItem.available} {stockItem.unit}</span>
                                                                : <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-black">❌ Sin stock</span>
                                                    )}
                                                </div>
                                                <span className="bg-panel border border-amber-200 dark:border-slate-700 text-amber-800 dark:text-amber-400 px-4 py-1.5 rounded-xl font-black shadow-sm">{malt.amount} {malt.unit || 'kg'}</span>
                                            </li>
                                        );
                                    })}
                                    <li className="flex justify-between items-center pt-4 mt-4 border-t border-dashed border-amber-300 dark:border-amber-800/50">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-2"><Droplets size={18} /> Agua Strike (Macerar)</span>
                                        <span className="font-black text-blue-800 dark:text-blue-300 text-xl">{scaledRecipe.ingredients.water.strike} L</span>
                                    </li>
                                    <li className="flex justify-between items-center pt-3">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-2"><Droplets size={18} /> Agua Sparge (Lavar)</span>
                                        <span className="font-black text-blue-800 dark:text-blue-300 text-xl">{scaledRecipe.ingredients.water.sparge} L</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-green-50/50 dark:bg-green-900/10 p-8 rounded-3xl border border-green-200 dark:border-green-800/30 shadow-sm flex flex-col h-full">
                                <h3 className="text-2xl font-black flex items-center gap-3 border-b border-green-200 dark:border-green-800/50 pb-4 mb-6 text-green-900 dark:text-green-500">
                                    <Leaf className="text-green-500" size={28} /> Lúpulos
                                </h3>
                                <ul className="space-y-5 flex-1">
                                    {scaledRecipe.ingredients.hops.map((hop, idx) => {
                                        const stockItem = costInfo.ingredients.find(i => i.category === 'Lúpulo' && i.name === (hop.name || 'Lúpulo desconocido'));
                                        const invItem = Array.isArray(inventory) ? inventory.find(i => i.category === 'Lúpulo' && (i.name || '').toLowerCase().trim() === (hop.name || '').toLowerCase().trim()) : null;
                                        return (
                                            <li key={idx} className="flex flex-col border-b border-green-100 dark:border-green-900/30 pb-4 last:border-0 relative">
                                                <div className="flex justify-between items-center mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-1 group/tooltip relative">
                                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xl">{hop.name || 'Lúpulo'}</span>
                                                            {invItem?.description && (
                                                                <>
                                                                    <Info size={16} className="text-blue-400 cursor-help ml-1" />
                                                                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-48 bg-slate-800 text-white text-xs p-3 rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all shadow-xl z-50 pointer-events-none whitespace-normal">
                                                                        {invItem.description}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                        {stockItem && (
                                                            stockItem.hasEnough
                                                                ? <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black">✅</span>
                                                                : stockItem.inInventory
                                                                    ? <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-black">⚠️</span>
                                                                    : <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-black">❌</span>
                                                        )}
                                                    </div>
                                                    <span className="bg-panel border border-green-200 dark:border-slate-700 text-green-800 dark:text-green-400 px-4 py-1.5 rounded-xl font-black shadow-sm">{hop.amount} {hop.unit || 'g'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {hop.time && (
                                                        <span className="text-green-700 dark:text-green-300 font-bold text-sm flex items-center gap-1 bg-green-100/50 dark:bg-green-900/40 w-fit px-3 py-1.5 rounded-lg border border-green-200/50 dark:border-green-800">
                                                            <Clock size={16} /> {hop.time} | {hop.use || hop.stage || 'Hervor'}
                                                        </span>
                                                    )}
                                                    {hop.phase === 'fermenting' && (
                                                        <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-100/50 dark:bg-purple-900/40 px-3 py-1.5 rounded-lg border border-purple-200/50 dark:border-purple-800"><Activity size={14} className="inline mr-1" />DH</span>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-surface p-8 rounded-3xl border border-line flex flex-col items-start gap-6 shadow-sm justify-center">
                                <div className="flex items-center gap-4 border-b border-line pb-4 w-full">
                                    <div className="bg-white dark:bg-slate-700 p-4 rounded-2xl text-slate-600 dark:text-white shadow-md border border-slate-200 dark:border-slate-600">
                                        <Beaker size={28} />
                                    </div>
                                    <h4 className="font-black text-muted uppercase tracking-widest text-sm">Levadura Recomendada</h4>
                                </div>
                                <p className="text-content font-black text-3xl">{scaledRecipe.ingredients.yeast.amount} <span className="text-xl font-bold text-muted">{scaledRecipe.ingredients.yeast.unit || 'sobre'}</span></p>
                                <div className="group/tooltip relative w-full">
                                    <p className="flex justify-center items-center gap-2 text-amber-600 dark:text-amber-500 font-bold text-2xl bg-amber-50 dark:bg-amber-900/10 px-4 py-2 rounded-xl w-full text-center border border-amber-100 dark:border-amber-900/30">
                                        {scaledRecipe.ingredients.yeast.name || 'Genérica'}
                                        {Array.isArray(inventory) && inventory.find(i => i.category === 'Levadura' && (i.name || '').toLowerCase().trim() === (scaledRecipe.ingredients.yeast.name || '').toLowerCase().trim())?.description && (
                                            <>
                                                <Info size={16} className="text-blue-400 cursor-help" />
                                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 bg-slate-800 text-white text-xs p-3 rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all shadow-xl z-50 pointer-events-none whitespace-normal text-left">
                                                    {inventory.find(i => i.category === 'Levadura' && (i.name || '').toLowerCase().trim() === (scaledRecipe.ingredients.yeast.name || '').toLowerCase().trim()).description}
                                                </div>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {scaledRecipe.ingredients.others && scaledRecipe.ingredients.others.length > 0 && (
                                <div className="bg-purple-50/50 dark:bg-purple-900/10 p-8 rounded-3xl border border-purple-200 dark:border-purple-800/30 shadow-sm flex flex-col">
                                    <h3 className="text-2xl font-black flex items-center gap-3 border-b border-purple-200 dark:border-purple-800/50 pb-4 mb-6 text-purple-900 dark:text-purple-500">
                                        <Sparkles className="text-purple-500" size={28} /> Sales y Aditivos
                                    </h3>
                                    <ul className="space-y-4 flex-1">
                                        {scaledRecipe.ingredients.others.map((other, idx) => {
                                            const stockItem = costInfo.ingredients.find(i => i.category === (other.category || 'Aditivos') && i.name === (other.name || 'Aditivo desconocido'));
                                            const invItem = Array.isArray(inventory) ? inventory.find(i => i.category === (other.category || 'Aditivos') && (i.name || '').toLowerCase().trim() === (other.name || '').toLowerCase().trim()) : null;
                                            return (
                                                <li key={idx} className="flex flex-col border-b border-purple-100 dark:border-purple-900/30 pb-4 last:border-0 relative">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1 group/tooltip relative">
                                                                <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">{other.name || 'Aditivo'}</span>
                                                                {invItem?.description && (
                                                                    <>
                                                                        <Info size={16} className="text-blue-400 cursor-help ml-1" />
                                                                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-48 bg-slate-800 text-white text-xs p-3 rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all shadow-xl z-50 pointer-events-none whitespace-normal">
                                                                            {invItem.description}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                            {stockItem && (stockItem.hasEnough ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black">✅</span> : stockItem.inInventory ? <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black">⚠️</span> : <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black">❌</span>)}
                                                        </div>
                                                        <span className="bg-panel border border-purple-200 dark:border-slate-700 text-purple-800 dark:text-purple-400 px-3 py-1 rounded-xl font-black shadow-sm text-sm">{other.amount} {other.unit || 'g'}</span>
                                                    </div>
                                                    <span className="text-purple-700 dark:text-purple-300 font-bold text-[11px] flex items-center w-fit px-2 py-1 rounded-md border border-purple-200/50 dark:border-purple-800 bg-purple-100/50 dark:bg-purple-900/40 uppercase tracking-widest">
                                                        {other.phase === 'fermenting' ? 'Fermentación' : other.phase === 'bottling' ? 'Embotellado' : 'Cocción'}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB: PROCESO */}
                {activeTab === 'process' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className={`${theme.bg} text-white p-6 md:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 mb-10`}>
                            <div className="text-center md:text-left">
                                <h3 className="text-3xl font-black flex items-center justify-center md:justify-start gap-3 mb-2 tracking-tighter"><Play size={28} className="fill-white" /> Proceso de Producción</h3>
                                <p className="text-white/90 font-medium text-sm">Sigue los pasos según cada fase. Al transicionar descontaremos de tu inventario.</p>
                            </div>
                        </div>

                        {[
                            { id: 'cooking', title: 'Fases de Cocción', steps: (scaledRecipe.steps || []).filter(s => !s.phase || s.phase === 'cooking'), icon: <Thermometer size={24} />, colorClass: 'text-amber-600 dark:text-amber-500', bgClass: 'bg-amber-50/50 dark:bg-amber-900/10' },
                            { id: 'fermenting', title: 'Fases de Fermentación', steps: (scaledRecipe.steps || []).filter(s => s.phase === 'fermenting'), icon: <Activity size={24} />, colorClass: 'text-purple-600 dark:text-purple-500', bgClass: 'bg-purple-50/50 dark:bg-purple-900/10' },
                            { id: 'bottling', title: 'Fase de Embotellamiento', steps: (scaledRecipe.steps || []).filter(s => s.phase === 'bottling'), icon: <Clock size={24} />, colorClass: 'text-blue-600 dark:text-blue-500', bgClass: 'bg-blue-50/50 dark:bg-blue-900/10' }
                        ].map(phaseGrp => phaseGrp.steps.length > 0 && (
                            <div key={phaseGrp.id} className={`p-8 rounded-3xl border border-line shadow-sm mb-8 ${phaseGrp.bgClass}`}>
                                <h4 className={`text-2xl font-black flex items-center gap-3 mb-6 ${phaseGrp.colorClass} border-b border-gray-200/50 dark:border-slate-700/50 pb-4`}>
                                    {phaseGrp.icon} {phaseGrp.title}
                                </h4>
                                <div className="space-y-4">
                                    {phaseGrp.steps.map((step, localIdx) => {
                                        const globalId = step.id || `${phaseGrp.id}-${localIdx}`;
                                        return (
                                            <div key={globalId} className="flex flex-col group">
                                                <div
                                                    onClick={() => toggleStep(globalId)}
                                                    className={`p-6 md:p-8 rounded-t-2xl md:rounded-2xl border cursor-pointer transition-all duration-300 flex items-start gap-4 md:gap-5 select-none ${completedSteps.includes(globalId) ? 'border-green-400/50 bg-green-50/30 dark:bg-green-900/10 opacity-70' : 'border-line bg-panel shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600'} ${expandedStep === globalId ? 'rounded-b-none border-b-0' : ''}`}
                                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                                >
                                                    <button className={`mt-0.5 rounded-full flex-shrink-0 transition-colors ${completedSteps.includes(globalId) ? 'text-green-500' : 'text-gray-300 dark:text-slate-600 group-hover:text-amber-400'}`}>
                                                        <CheckCircle2 size={32} className={completedSteps.includes(globalId) ? 'fill-green-100 dark:fill-green-900' : ''} />
                                                    </button>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h3 className={`font-black text-xl md:text-2xl ${completedSteps.includes(globalId) ? 'text-green-800 dark:text-green-400 line-through decoration-green-400 decoration-2' : 'text-content'}`}>
                                                                {step.title || 'Paso'}
                                                            </h3>
                                                            {step.duration && <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold px-2 py-1 rounded-lg border border-line whitespace-nowrap"><Clock size={12} className="inline mr-1" />{step.duration}</span>}
                                                        </div>
                                                        <p className={`text-base md:text-lg leading-relaxed font-medium ${completedSteps.includes(globalId) ? 'text-green-700 dark:text-green-500' : 'text-slate-600 dark:text-slate-400'}`}>
                                                            {step.desc || ''}
                                                        </p>
                                                    </div>
                                                    {step.details && typeof step.details === 'string' && (
                                                        <button
                                                            onClick={(e) => toggleStepDetails(e, globalId)}
                                                            className="ml-auto text-gray-400 hover:text-amber-600 p-2 flex flex-col items-center justify-center transition-colors bg-surface rounded-xl hover:bg-amber-50 dark:hover:bg-slate-700"
                                                            title="Ver detalle del paso"
                                                        >
                                                            {expandedStep === globalId ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                                        </button>
                                                    )}
                                                </div>

                                                {expandedStep === globalId && step.details && typeof step.details === 'string' && (
                                                    <div className="p-6 md:p-8 bg-surface/80 border border-t-0 border-line rounded-b-2xl text-slate-800 dark:text-slate-200 animate-fadeIn text-sm md:text-base shadow-inner">
                                                        <h4 className="font-black flex items-center gap-2 mb-3 text-amber-700 dark:text-amber-500 uppercase tracking-wider text-xs"><Info size={18} /> Técnica:</h4>
                                                        <div className="pl-4 border-l-2 border-amber-300 dark:border-amber-700 font-medium whitespace-pre-line text-slate-600 dark:text-slate-300">
                                                            {step.details}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {(!scaledRecipe.steps || scaledRecipe.steps.length === 0) && (
                            <div className="p-10 text-center text-muted bg-panel rounded-3xl shadow-sm border border-line">
                                <p className="font-bold text-lg italic">No hay pasos detallados para esta receta.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: AGUA */}
                {activeTab === 'water' && (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-8 md:p-10 rounded-3xl border border-blue-100 dark:border-blue-800 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 text-blue-500 pointer-events-none">
                                <Droplets size={200} />
                            </div>
                            <h3 className="text-3xl font-black text-blue-900 dark:text-blue-400 mb-2 flex items-center gap-3 relative z-10">
                                <Droplets size={32} className="text-blue-500" /> Perfil Mineral Objetivo
                            </h3>
                            <p className="text-blue-800 dark:text-blue-300 text-lg mb-8 font-medium relative z-10 max-w-2xl">
                                Ajustar el agua es el secreto para transformar una buena cerveza en una cerveza de campeonato mundial.
                            </p>

                            {scaledRecipe.waterProfile ? (
                                <div className="grid grid-cols-5 gap-3 md:gap-5 text-center relative z-10">
                                    {['Ca', 'Mg', 'SO4', 'Cl', 'HCO3'].map(ion => (
                                        <div key={ion} className="bg-panel p-5 rounded-2xl shadow-sm border border-blue-100 dark:border-slate-700 flex flex-col transition-transform hover:-translate-y-1">
                                            <span className="block font-black text-slate-400 text-xs md:text-sm uppercase tracking-widest mb-2">{ion}</span>
                                            <span className="text-blue-600 dark:text-blue-400 font-black text-3xl md:text-4xl">{scaledRecipe.waterProfile[ion] ?? '-'}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-panel p-8 rounded-2xl text-center text-muted font-bold border border-blue-100 dark:border-slate-700 relative z-10 text-lg">
                                    No hay un perfil estricto para esta receta.
                                </div>
                            )}
                        </div>

                        <div className="bg-panel p-8 md:p-10 rounded-3xl border border-line shadow-sm">
                            <h4 className="font-black text-content mb-8 text-2xl flex items-center gap-3">Tu Agua de la Llave (Base)</h4>
                            <div className="grid grid-cols-5 gap-3 md:gap-6">
                                {['Ca', 'Mg', 'SO4', 'Cl', 'HCO3'].map(ion => (
                                    <div key={ion}>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">{ion}</label>
                                        <input
                                            type="number"
                                            value={baseWater[ion] || 0}
                                            readOnly // Simplificación en esta versión final, se puede hacer que sea de config de app.
                                            className="w-full p-4 md:p-5 border border-line rounded-2xl text-center font-black text-xl md:text-2xl outline-none bg-surface text-content transition-all shadow-inner"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {saltAdditions && scaledRecipe.waterProfile && (
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 p-8 md:p-12 rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-xl relative overflow-hidden">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                                    <h4 className="font-black text-amber-900 dark:text-amber-500 text-3xl md:text-4xl flex items-center gap-3">
                                        <Scale size={40} className="text-amber-600" /> Adición de Sales
                                    </h4>
                                    <span className="bg-amber-600 text-white px-6 py-3 rounded-2xl text-lg font-black shadow-md">
                                        Para {saltAdditions.totalWater} L (Total)
                                    </span>
                                </div>

                                <p className="text-xl text-amber-800 dark:text-slate-300 font-medium mb-10">
                                    Mezcla estas cantidades exactas en el agua <span className="font-black underline">antes</span> de agregar la malta.
                                </p>

                                <div className="grid md:grid-cols-4 gap-5 mb-10">
                                    <div className="bg-panel p-6 md:p-8 rounded-3xl border border-amber-100 dark:border-slate-700 text-center shadow-md relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-2 bg-blue-400"></div>
                                        <span className="block font-black text-content text-5xl mb-3">{saltAdditions.cacl2}g</span>
                                        <span className="text-xs md:text-sm font-bold text-muted uppercase tracking-wider block">Cloruro de Calcio</span>
                                    </div>
                                    <div className="bg-panel p-6 md:p-8 rounded-3xl border border-amber-100 dark:border-slate-700 text-center shadow-md relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-2 bg-amber-400"></div>
                                        <span className="block font-black text-content text-5xl mb-3">{saltAdditions.gypsum}g</span>
                                        <span className="text-xs md:text-sm font-bold text-muted uppercase tracking-wider block">Gypsum (CaSO4)</span>
                                    </div>
                                    <div className="bg-panel p-6 md:p-8 rounded-3xl border border-amber-100 dark:border-slate-700 text-center shadow-md relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-2 bg-green-400"></div>
                                        <span className="block font-black text-content text-5xl mb-3">{saltAdditions.epsom}g</span>
                                        <span className="text-xs md:text-sm font-bold text-muted uppercase tracking-wider block">Sal de Epsom</span>
                                    </div>
                                    {Number(saltAdditions.bakingSoda) > 0 && (
                                        <div className="bg-panel p-6 md:p-8 rounded-3xl border border-amber-100 dark:border-slate-700 text-center shadow-md relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-2 bg-purple-400"></div>
                                            <span className="block font-black text-content text-5xl mb-3">{saltAdditions.bakingSoda}g</span>
                                            <span className="text-xs md:text-sm font-bold text-muted uppercase tracking-wider block">Bicarbonato Sodio</span>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white dark:bg-slate-950 p-8 rounded-3xl border border-amber-200 dark:border-slate-700 shadow-inner">
                                    <h5 className="font-black text-sm text-slate-400 uppercase tracking-widest mb-6 text-center">Perfil Final Estimado</h5>
                                    <div className="flex justify-around text-2xl font-black flex-wrap gap-6">
                                        <span className="text-muted text-sm flex flex-col items-center">Ca <span className={(saltAdditions.finalEstimates.Ca >= (Number(scaledRecipe.waterProfile.Ca) || 0)) ? 'text-green-500 text-3xl' : 'text-amber-500 text-3xl'}>{saltAdditions.finalEstimates.Ca}</span></span>
                                        <span className="text-muted text-sm flex flex-col items-center">Mg <span className="text-green-500 text-3xl">{saltAdditions.finalEstimates.Mg}</span></span>
                                        <span className="text-muted text-sm flex flex-col items-center">SO4 <span className="text-green-500 text-3xl">{saltAdditions.finalEstimates.SO4}</span></span>
                                        <span className="text-muted text-sm flex flex-col items-center">Cl <span className="text-green-500 text-3xl">{saltAdditions.finalEstimates.Cl}</span></span>
                                        <span className="text-muted text-sm flex flex-col items-center" title="Ajustado con Bicarbonato de Sodio">HCO3 <span className={(saltAdditions.finalEstimates.HCO3 >= (Number(scaledRecipe.waterProfile.HCO3) || 0)) ? 'text-green-500 text-3xl' : 'text-amber-500 text-3xl'}>{saltAdditions.finalEstimates.HCO3}</span></span>
                                    </div>
                                </div>
                                <p className="text-sm text-muted mt-6 text-center italic font-medium">
                                    * El perfil estimado puede diferir levemente del objetivo porque las sales aportan iones en pares (ej. el Cloruro de Calcio suma Cl y Ca simultáneamente).
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: TIPS */}
                {activeTab === 'tips' && (
                    <div className="space-y-6 animate-fadeIn">
                        {Array.isArray(scaledRecipe.tips) && scaledRecipe.tips.map((tip, idx) => (
                            <div key={idx} className="bg-surface border-l-8 border-amber-500 shadow-md p-8 rounded-r-3xl transition-transform hover:-translate-y-1">
                                <h3 className="text-2xl font-black text-content mb-4 flex items-center gap-3">
                                    <Star className="text-amber-500 fill-amber-500" /> {tip.title || 'Tip Cervecero'}
                                </h3>
                                <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed font-medium">
                                    {tip.desc || ''}
                                </p>
                            </div>
                        ))}
                        {(!scaledRecipe.tips || scaledRecipe.tips.length === 0) && (
                            <p className="text-muted font-bold text-lg italic text-center py-12 bg-surface rounded-3xl">No hay tips específicos para esta receta, ¡aplica las buenas prácticas de siempre!</p>
                        )}
                    </div>
                )}

                {/* TAB: HISTORIAL CAMBIOS */}
                {activeTab === 'history' && (
                    <div className="space-y-6 animate-fadeIn">
                        <h3 className="text-3xl font-black text-content mb-8 border-b border-line pb-4">Historial de Modificaciones</h3>
                        <div className="border-l-4 border-slate-300 dark:border-slate-600 ml-6 pl-8 space-y-10">
                            {Array.isArray(scaledRecipe.modifications) && [...scaledRecipe.modifications].reverse().map((mod, idx) => (
                                <div key={idx} className="relative">
                                    <div className="absolute -left-[45px] top-1 bg-panel border-4 border-slate-300 dark:border-slate-600 w-6 h-6 rounded-full shadow-sm"></div>
                                    <span className="text-sm font-black text-slate-400 tracking-widest uppercase block mb-2">{mod.date}</span>
                                    <p className="text-content font-medium text-lg bg-surface p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">"{mod.note}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* MODAL DE COCINAR LOTE */}
            {showBrewModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-panel w-full max-w-md rounded-3xl shadow-2xl border border-line overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-line flex justify-between items-center bg-black/5 dark:bg-white/5">
                            <h3 className="font-black text-content text-xl flex items-center gap-2">
                                <Play size={24} className="text-amber-500 fill-amber-500" /> Nuevo Lote
                            </h3>
                            <button onClick={() => setShowBrewModal(false)} className="p-2 text-muted hover:text-content hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Nombre de la Receta</label>
                                <div className="w-full p-3 border border-line rounded-xl bg-surface text-content font-bold">{selectedRecipe.name}</div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Volumen a Cocinar (L)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={targetVol}
                                    onChange={(e) => setTargetVol(Number(e.target.value))}
                                    className="w-full p-3 border border-line rounded-xl outline-none bg-surface focus:bg-panel text-content focus:border-amber-500 transition-colors text-center font-bold text-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Nombre del Lote / ID (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Lote #42 / IPA Especial"
                                    value={batchIdentity}
                                    onChange={(e) => setBatchIdentity(e.target.value)}
                                    className="w-full p-3 border border-line rounded-xl outline-none bg-surface focus:bg-panel text-content focus:border-amber-500 transition-colors font-medium"
                                />
                            </div>

                            <button
                                onClick={handleStartBrew}
                                disabled={targetVol <= 0 || isStartingBrew}
                                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl shadow-lg transition-transform hover:-translate-y-1 flex items-center justify-center gap-2 mt-2"
                            >
                                {isStartingBrew ? <Loader2 className="animate-spin" size={20} /> : <Thermometer size={20} />}
                                {isStartingBrew ? 'Preparando equipo...' : 'Iniciar Producción'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
