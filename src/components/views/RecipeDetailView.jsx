// /src/components/views/RecipeDetailView.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Thermometer, Clock, CheckCircle2, Activity, Play, Star, BookOpen, Droplets, Info, FileClock, Loader2, BrainCircuit, Wand2, Sparkles, Banknote, Scale, Wheat, Leaf, Beaker, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { getThemeForCategory, getSrmColor, baseWater } from '../../utils/helpers';
import { calculateRecipeCost } from '../../utils/costCalculator';
import { getRecipeAdvice } from '../../services/gemini';

export default function RecipeDetailView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { recipes, inventory } = useAppContext();

    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [targetVol, setTargetVol] = useState(20);
    const [activeTab, setActiveTab] = useState('recipe');
    const [completedSteps, setCompletedSteps] = useState([]);
    const [expandedStep, setExpandedStep] = useState(null);
    const [aiAdvice, setAiAdvice] = useState(null);
    const [isAdvising, setIsAdvising] = useState(false);

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

    if (!selectedRecipe) return null;

    const theme = getThemeForCategory(selectedRecipe.category);

    // ── Memoized: only recalculate when recipe or target volume changes ─────────
    const scaledRecipe = useMemo(() => {
        const scaleFactor = (targetVol || 1) / (selectedRecipe.targetVolume || 1);
        const safeMalts = Array.isArray(selectedRecipe.ingredients?.malts) ? selectedRecipe.ingredients.malts : [];
        const safeHops = Array.isArray(selectedRecipe.ingredients?.hops) ? selectedRecipe.ingredients.hops : [];
        const safeYeast = typeof selectedRecipe.ingredients?.yeast === 'string'
            ? { name: selectedRecipe.ingredients.yeast, amount: 1, unit: 'sobre' }
            : (selectedRecipe.ingredients?.yeast || { name: 'Levadura', amount: 1, unit: 'sobre' });
        return {
            ...selectedRecipe,
            ingredients: {
                malts: safeMalts.map(m => ({ ...m, amount: ((Number(m.amount) || 0) * scaleFactor).toFixed(2) })),
                hops: safeHops.map(h => ({ ...h, amount: Math.round((Number(h.amount) || 0) * scaleFactor) })),
                yeast: safeYeast,
                water: {
                    strike: ((Number(selectedRecipe.ingredients?.water?.strike) || 15) * scaleFactor).toFixed(1),
                    sparge: ((Number(selectedRecipe.ingredients?.water?.sparge) || 15) * scaleFactor).toFixed(1),
                },
            },
        };
    }, [selectedRecipe, targetVol]);

    const costInfo = useMemo(
        () => calculateRecipeCost(selectedRecipe, inventory, targetVol),
        [selectedRecipe, inventory, targetVol]
    );

    const saltAdditions = useMemo(() => {
        if (!scaledRecipe.waterProfile) return null;
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

    return (
        <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => navigate('/recipes')} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 font-bold bg-white dark:bg-slate-800 px-4 py-2 rounded-xl transition-all shadow-sm border border-gray-200 dark:border-slate-700 hover:-translate-x-1">
                    <ArrowLeft size={20} /> Mis Recetas
                </button>
                <button onClick={() => navigate(`/recipes/${id}/edit`)} className="flex items-center gap-2 text-white font-bold bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition-all shadow-sm hover:scale-105 border border-slate-700">
                    <Edit3 size={18} /> Editar Receta
                </button>
            </div>

            {/* HEADER DINÁMICO */}
            <div className={`${theme.header} text-white p-8 md:p-12 rounded-t-[2.5rem] shadow-xl flex flex-col md:flex-row justify-between items-start md:items-end relative overflow-hidden`}>
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

                <div className="mt-8 md:mt-0 flex flex-col items-start md:items-end bg-black/20 p-6 rounded-3xl backdrop-blur-md border border-white/20 relative z-10 shadow-lg">
                    <label className="font-bold text-white/90 text-xs mb-2 uppercase tracking-widest">Volumen Objetivo</label>
                    <div className="flex items-center gap-3">
                        <input
                            type="number"
                            value={targetVol}
                            onChange={(e) => setTargetVol(Number(e.target.value) || 0)}
                            className="w-28 p-2 bg-white text-slate-800 rounded-2xl text-center focus:ring-4 focus:ring-white/50 outline-none text-3xl font-black shadow-inner"
                            min="1"
                        />
                        <span className="text-white font-black text-3xl italic">L</span>
                    </div>
                </div>
            </div>

            {/* TABS NAVEGACIÓN */}
            <div className="flex flex-wrap border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto rounded-b-none">
                <button onClick={() => setActiveTab('recipe')} className={`flex-1 min-w-[100px] py-5 font-black text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'recipe' ? `${theme.bg} border-b-4 ${theme.border} ${theme.text}` : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <BookOpen size={18} /> Receta
                </button>
                <button onClick={() => setActiveTab('process')} className={`flex-1 min-w-[100px] py-5 font-black text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'process' ? `${theme.bg} border-b-4 ${theme.border} ${theme.text}` : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <CheckCircle2 size={18} /> Proceso
                </button>
                <button onClick={() => setActiveTab('water')} className={`flex-1 min-w-[100px] py-5 font-black text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'water' ? `${theme.bg} border-b-4 ${theme.border} ${theme.text}` : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Droplets size={18} /> Agua
                </button>
                <button onClick={() => setActiveTab('tips')} className={`flex-1 min-w-[100px] py-5 font-black text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'tips' ? `${theme.bg} border-b-4 ${theme.border} ${theme.text}` : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Info size={18} /> Tips
                </button>
                {(Array.isArray(scaledRecipe.modifications) && scaledRecipe.modifications.length > 0) && (
                    <button onClick={() => setActiveTab('history')} className={`flex-1 min-w-[100px] py-5 font-black text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'history' ? `${theme.bg} border-b-4 ${theme.border} ${theme.text}` : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <FileClock size={18} /> Cambios
                    </button>
                )}
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-b-[2.5rem] shadow-sm border border-t-0 border-gray-100 dark:border-slate-800 mt-0">

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
                                <div className="text-slate-700 dark:text-slate-300 font-medium text-base whitespace-pre-line leading-relaxed">
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

                            <div className="flex flex-col md:flex-row gap-8 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-emerald-100 dark:border-slate-700 w-full md:w-auto flex-1 md:flex-none justify-end">
                                <div className="flex flex-col text-sm border-b md:border-b-0 md:border-r border-gray-100 dark:border-slate-700 pb-4 md:pb-0 md:pr-8 justify-center">
                                    <div className="flex justify-between gap-10 text-slate-500 dark:text-slate-400 mb-2">
                                        <span>Neto:</span>
                                        <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(costInfo.neto)}</span>
                                    </div>
                                    <div className="flex justify-between gap-10 text-slate-500 dark:text-slate-400">
                                        <span>IVA (19%):</span>
                                        <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(costInfo.iva)}</span>
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
                                        return (
                                            <li key={idx} className="flex justify-between items-center text-lg border-b border-amber-100 dark:border-amber-900/30 pb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{malt.name || 'Malta'}</span>
                                                    {stockItem && (
                                                        stockItem.hasEnough
                                                            ? <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black" title={`Stock: ${stockItem.available} ${stockItem.unit}`}>✅ {stockItem.available} {stockItem.unit}</span>
                                                            : stockItem.inInventory
                                                                ? <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-black" title={`Faltan ${(stockItem.needed - stockItem.available).toFixed(2)} ${stockItem.unit}`}>⚠️ {stockItem.available} {stockItem.unit}</span>
                                                                : <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-black">❌ Sin stock</span>
                                                    )}
                                                </div>
                                                <span className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 text-amber-800 dark:text-amber-400 px-4 py-1.5 rounded-xl font-black shadow-sm">{malt.amount} {malt.unit || 'kg'}</span>
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

                            <div className="bg-green-50/50 dark:bg-green-900/10 p-8 rounded-3xl border border-green-200 dark:border-green-800/30 shadow-sm">
                                <h3 className="text-2xl font-black flex items-center gap-3 border-b border-green-200 dark:border-green-800/50 pb-4 mb-6 text-green-900 dark:text-green-500">
                                    <Leaf className="text-green-500" size={28} /> Lúpulos
                                </h3>
                                <ul className="space-y-5">
                                    {scaledRecipe.ingredients.hops.map((hop, idx) => {
                                        const stockItem = costInfo.ingredients.find(i => i.category === 'Lúpulo' && i.name === (hop.name || 'Lúpulo desconocido'));
                                        return (
                                            <li key={idx} className="flex flex-col border-b border-green-100 dark:border-green-900/30 pb-4 last:border-0">
                                                <div className="flex justify-between items-center mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xl">{hop.name || 'Lúpulo'}</span>
                                                        {stockItem && (
                                                            stockItem.hasEnough
                                                                ? <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black">✅ {stockItem.available} {stockItem.unit}</span>
                                                                : stockItem.inInventory
                                                                    ? <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-black">⚠️ {stockItem.available} {stockItem.unit}</span>
                                                                    : <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-black">❌ Sin stock</span>
                                                        )}
                                                    </div>
                                                    <span className="bg-white dark:bg-slate-800 border border-green-200 dark:border-slate-700 text-green-800 dark:text-green-400 px-4 py-1.5 rounded-xl font-black shadow-sm">{hop.amount} {hop.unit || 'g'}</span>
                                                </div>
                                                {hop.time && (
                                                    <span className="text-green-700 dark:text-green-300 font-bold text-sm flex items-center gap-2 bg-green-100/50 dark:bg-green-900/40 w-fit px-3 py-1.5 rounded-lg border border-green-200/50 dark:border-green-800">
                                                        <Clock size={16} /> {hop.time} <span className="mx-1 opacity-50">•</span> <span className="uppercase tracking-wider">{hop.stage || 'Hervor'}</span>
                                                    </span>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm">
                            <div className="bg-white dark:bg-slate-700 p-5 rounded-2xl text-slate-600 dark:text-white shadow-md border border-slate-200 dark:border-slate-600 flex-shrink-0">
                                <Beaker size={36} />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-xs mb-2">Levadura Recomendada</h4>
                                <p className="text-slate-800 dark:text-white font-black text-3xl">{scaledRecipe.ingredients.yeast.amount} <span className="text-xl font-bold text-slate-500">{scaledRecipe.ingredients.yeast.unit || 'sobre'}</span> de <span className="text-amber-600 dark:text-amber-500">{scaledRecipe.ingredients.yeast.name || 'Genérica'}</span></p>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: PROCESO */}
                {activeTab === 'process' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className={`${theme.header} text-white p-8 md:p-12 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 mb-10`}>
                            <div className="text-center md:text-left">
                                <h3 className="text-4xl font-black flex items-center justify-center md:justify-start gap-4 mb-3 tracking-tighter"><Play size={36} className="fill-white" /> Día de Cocción</h3>
                                <p className="text-white/90 font-bold text-base">Modo guiado paso a paso. Al finalizar descontaremos de tu inventario.</p>
                            </div>
                            <button
                                onClick={() => navigate(`/brew/${id}?vol=${targetVol}`)}
                                className="bg-white text-slate-900 px-10 py-5 rounded-2xl font-black text-lg transition-transform shadow-2xl w-full md:w-auto text-center hover:scale-105 active:scale-95"
                            >
                                ¡Empezar a Cocinar!
                            </button>
                        </div>

                        {(scaledRecipe.steps || []).map((step, idx) => (
                            <div key={step.id || idx} className="flex flex-col group">
                                <div
                                    onClick={() => toggleStep(step.id || idx)}
                                    className={`p-6 md:p-8 rounded-t-3xl md:rounded-3xl border-2 cursor-pointer transition-all duration-300 flex items-start gap-5 md:gap-6 ${completedSteps.includes(step.id || idx) ? 'border-green-400 bg-green-50/50 dark:bg-green-900/20 opacity-60' : 'border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600'} ${expandedStep === (step.id || idx) ? 'rounded-b-none border-b-0' : ''}`}
                                >
                                    <button className={`mt-1 rounded-full flex-shrink-0 transition-colors ${completedSteps.includes(step.id || idx) ? 'text-green-500' : 'text-gray-300 dark:text-slate-600 group-hover:text-amber-400'}`}>
                                        <CheckCircle2 size={36} className={completedSteps.includes(step.id || idx) ? 'fill-green-100 dark:fill-green-900' : ''} />
                                    </button>
                                    <div className="flex-1 pt-1">
                                        <h3 className={`font-black text-2xl ${completedSteps.includes(step.id || idx) ? 'text-green-800 dark:text-green-400 line-through decoration-green-400 decoration-2' : 'text-slate-800 dark:text-white'}`}>
                                            {idx + 1}. {step.title || 'Paso de Cocción'}
                                        </h3>
                                        <p className={`text-lg mt-2 leading-relaxed font-medium ${completedSteps.includes(step.id || idx) ? 'text-green-700 dark:text-green-500' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {step.desc || ''}
                                        </p>
                                    </div>
                                    {step.details && typeof step.details === 'string' && (
                                        <button
                                            onClick={(e) => toggleStepDetails(e, step.id || idx)}
                                            className="ml-auto text-gray-400 hover:text-amber-600 p-3 flex flex-col items-center justify-center transition-colors bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-amber-50 dark:hover:bg-slate-700"
                                            title="Ver detalle del paso"
                                        >
                                            {expandedStep === (step.id || idx) ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
                                            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Técnica</span>
                                        </button>
                                    )}
                                </div>

                                {expandedStep === (step.id || idx) && step.details && typeof step.details === 'string' && (
                                    <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-800/50 border-2 border-t-0 border-slate-200 dark:border-slate-700 rounded-b-3xl text-slate-800 dark:text-slate-200 animate-fadeIn text-base md:text-lg shadow-inner">
                                        <h4 className="font-black flex items-center gap-2 mb-4 text-amber-700 dark:text-amber-500 uppercase tracking-wider text-sm"><Info size={20} /> Guía del Maestro:</h4>
                                        <div className="pl-6 space-y-4 border-l-4 border-amber-300 dark:border-amber-700 font-medium">
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
                            </div>
                        ))}
                        {(!scaledRecipe.steps || scaledRecipe.steps.length === 0) && (
                            <div className="p-10 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
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
                                        <div key={ion} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-blue-100 dark:border-slate-700 flex flex-col transition-transform hover:-translate-y-1">
                                            <span className="block font-black text-slate-400 text-xs md:text-sm uppercase tracking-widest mb-2">{ion}</span>
                                            <span className="text-blue-600 dark:text-blue-400 font-black text-3xl md:text-4xl">{scaledRecipe.waterProfile[ion] ?? '-'}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl text-center text-slate-500 font-bold border border-blue-100 dark:border-slate-700 relative z-10 text-lg">
                                    No hay un perfil estricto para esta receta.
                                </div>
                            )}
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm">
                            <h4 className="font-black text-slate-800 dark:text-white mb-8 text-2xl flex items-center gap-3">Tu Agua de la Llave (Base)</h4>
                            <div className="grid grid-cols-5 gap-3 md:gap-6">
                                {['Ca', 'Mg', 'SO4', 'Cl', 'HCO3'].map(ion => (
                                    <div key={ion}>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">{ion}</label>
                                        <input
                                            type="number"
                                            value={baseWater[ion] || 0}
                                            readOnly // Simplificación en esta versión final, se puede hacer que sea de config de app.
                                            className="w-full p-4 md:p-5 border border-gray-200 dark:border-slate-700 rounded-2xl text-center font-black text-xl md:text-2xl outline-none bg-gray-50 dark:bg-slate-800 text-slate-800 dark:text-white transition-all shadow-inner"
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
                                    <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-amber-100 dark:border-slate-700 text-center shadow-md relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-2 bg-blue-400"></div>
                                        <span className="block font-black text-slate-800 dark:text-white text-5xl mb-3">{saltAdditions.cacl2}g</span>
                                        <span className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider block">Cloruro de Calcio</span>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-amber-100 dark:border-slate-700 text-center shadow-md relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-2 bg-amber-400"></div>
                                        <span className="block font-black text-slate-800 dark:text-white text-5xl mb-3">{saltAdditions.gypsum}g</span>
                                        <span className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider block">Gypsum (CaSO4)</span>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-amber-100 dark:border-slate-700 text-center shadow-md relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-2 bg-green-400"></div>
                                        <span className="block font-black text-slate-800 dark:text-white text-5xl mb-3">{saltAdditions.epsom}g</span>
                                        <span className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider block">Sal de Epsom</span>
                                    </div>
                                    {Number(saltAdditions.bakingSoda) > 0 && (
                                        <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-amber-100 dark:border-slate-700 text-center shadow-md relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-2 bg-purple-400"></div>
                                            <span className="block font-black text-slate-800 dark:text-white text-5xl mb-3">{saltAdditions.bakingSoda}g</span>
                                            <span className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider block">Bicarbonato Sodio</span>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white dark:bg-slate-950 p-8 rounded-3xl border border-amber-200 dark:border-slate-700 shadow-inner">
                                    <h5 className="font-black text-sm text-slate-400 uppercase tracking-widest mb-6 text-center">Perfil Final Estimado</h5>
                                    <div className="flex justify-around text-2xl font-black flex-wrap gap-6">
                                        <span className="text-slate-500 text-sm flex flex-col items-center">Ca <span className={(saltAdditions.finalEstimates.Ca >= (Number(scaledRecipe.waterProfile.Ca) || 0)) ? 'text-green-500 text-3xl' : 'text-amber-500 text-3xl'}>{saltAdditions.finalEstimates.Ca}</span></span>
                                        <span className="text-slate-500 text-sm flex flex-col items-center">Mg <span className="text-green-500 text-3xl">{saltAdditions.finalEstimates.Mg}</span></span>
                                        <span className="text-slate-500 text-sm flex flex-col items-center">SO4 <span className="text-green-500 text-3xl">{saltAdditions.finalEstimates.SO4}</span></span>
                                        <span className="text-slate-500 text-sm flex flex-col items-center">Cl <span className="text-green-500 text-3xl">{saltAdditions.finalEstimates.Cl}</span></span>
                                        <span className="text-slate-500 text-sm flex flex-col items-center" title="Ajustado con Bicarbonato de Sodio">HCO3 <span className={(saltAdditions.finalEstimates.HCO3 >= (Number(scaledRecipe.waterProfile.HCO3) || 0)) ? 'text-green-500 text-3xl' : 'text-amber-500 text-3xl'}>{saltAdditions.finalEstimates.HCO3}</span></span>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-6 text-center italic font-medium">
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
                            <div key={idx} className="bg-slate-50 dark:bg-slate-800 border-l-8 border-amber-500 shadow-md p-8 rounded-r-3xl transition-transform hover:-translate-y-1">
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-4 flex items-center gap-3">
                                    <Star className="text-amber-500 fill-amber-500" /> {tip.title || 'Tip Cervecero'}
                                </h3>
                                <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed font-medium">
                                    {tip.desc || ''}
                                </p>
                            </div>
                        ))}
                        {(!scaledRecipe.tips || scaledRecipe.tips.length === 0) && (
                            <p className="text-gray-500 font-bold text-lg italic text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-3xl">No hay tips específicos para esta receta, ¡aplica las buenas prácticas de siempre!</p>
                        )}
                    </div>
                )}

                {/* TAB: HISTORIAL CAMBIOS */}
                {activeTab === 'history' && (
                    <div className="space-y-6 animate-fadeIn">
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-8 border-b border-gray-200 dark:border-slate-700 pb-4">Historial de Modificaciones</h3>
                        <div className="border-l-4 border-slate-300 dark:border-slate-600 ml-6 pl-8 space-y-10">
                            {Array.isArray(scaledRecipe.modifications) && [...scaledRecipe.modifications].reverse().map((mod, idx) => (
                                <div key={idx} className="relative">
                                    <div className="absolute -left-[45px] top-1 bg-white dark:bg-slate-900 border-4 border-slate-300 dark:border-slate-600 w-6 h-6 rounded-full shadow-sm"></div>
                                    <span className="text-sm font-black text-slate-400 tracking-widest uppercase block mb-2">{mod.date}</span>
                                    <p className="text-slate-700 dark:text-slate-300 font-medium text-lg bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">"{mod.note}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
