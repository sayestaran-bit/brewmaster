// /src/components/recipe/RecipeForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles, Loader2, Wand2, Wheat, Leaf, Droplets, ListOrdered, Trash2, Plus, Info, Save, BookOpen, Thermometer, Activity, CheckCircle2, Beaker } from 'lucide-react';

import AutocompleteInput from '../common/AutocompleteInput';
import { useRecipes } from '../../hooks/useRecipes';
import { useInventory } from '../../hooks/useInventory';
import { getFormattedDate } from '../../utils/formatters';
import { getRecipeAdvice, callGemini } from '../../services/gemini';
import { getEffectivePhase } from '../../utils/recipeUtils';
import { useAuth } from '../../context/AuthContext';

export default function RecipeForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const isGuest = currentUser?.isAnonymous;
    const guestTooltip = "Regístrate para crear recetas ilimitadas y más!";
    const { recipes, addRecipe, updateRecipe } = useRecipes();
    const { inventory, addItem } = useInventory();

    const isEditing = !!id;
    const [initialData, setInitialData] = useState(null);

    const [isGeneratingIA, setIsGeneratingIA] = useState(false);
    const [iaPrompt, setIaPrompt] = useState("");
    const [modNote, setModNote] = useState('');

    // defaultEmptyState
    const defaultEmptyState = {
        name: '', category: 'Hazy IPA', description: '', targetVolume: 20, og: 1.050, fg: 1.010, abv: 5.0, ibu: 30, colorSRM: 5,
        malts: [{ name: '', amount: 0 }],
        hops: [{ name: '', amount: 0, time: '', use: 'Hervor', phase: 'cooking' }],
        others: [],
        yeast: '', strike: 15, sparge: 15,
        fermentationDays: '14D',
        waterProfile: { Ca: 100, Mg: 10, SO4: 100, Cl: 100, HCO3: 50 },
        modifications: [], steps: [], tips: []
    };

    const [formData, setFormData] = useState(defaultEmptyState);
    const [isInitialized, setIsInitialized] = useState(false);
    const [activeStep, setActiveStep] = useState(1);

    useEffect(() => {
        setIsInitialized(false);
        setActiveStep(1);
    }, [id]);

    useEffect(() => {
        if (isEditing && recipes.length > 0 && !isInitialized) {
            const found = recipes.find(r => r.id === id);
            if (found) {
                setInitialData(found);

                setFormData({
                    id: found.id,
                    name: found.name || '',
                    category: found.category || 'Otros',
                    description: found.description || '',
                    abv: found.abv || 5.0,
                    og: found.og || 1.050,
                    fg: found.fg || 1.010,
                    ibu: found.ibu || 0,
                    colorSRM: found.colorSRM || 0,
                    targetVolume: found.targetVolume || 20,
                    malts: (found.ingredients?.malts || []).length > 0 ? found.ingredients.malts : [{ name: '', amount: '', unit: 'kg' }],
                    hops: (found.ingredients?.hops || []).length > 0 ? found.ingredients.hops : [{ name: '', amount: '', unit: 'g', time: '60 min', phase: 'cooking' }],
                    others: (found.ingredients?.others || []).length > 0 ? found.ingredients.others : [],
                    yeast: found.ingredients?.yeast?.name || found.ingredients?.yeast || '',
                    strike: found.ingredients?.water?.strike || 15,
                    sparge: found.ingredients?.water?.sparge || 15,
                    waterProfile: found.waterProfile || { Ca: 100, Mg: 10, SO4: 100, Cl: 100, HCO3: 50 },
                    modifications: found.modifications || [],
                    steps: (found.steps || []).length > 0 ? found.steps : [{ title: '', desc: '', phase: 'cooking' }],
                    tips: (found.tips || []).length > 0 ? found.tips : []
                });
                setIsInitialized(true);
            }
        }
    }, [id, recipes, isEditing, isInitialized]);

    // Auto-calculo de ABV basado en la fórmula estándar: (OG - FG) * 131.25
    useEffect(() => {
        const og = parseFloat(formData.og);
        const fg = parseFloat(formData.fg);
        if (!isNaN(og) && !isNaN(fg) && og > fg) {
            const calculatedABV = parseFloat(((og - fg) * 131.25).toFixed(1));
            // Solo actualizamos si el cambio es significativo para evitar loops
            if (Math.abs(calculatedABV - parseFloat(formData.abv)) > 0.05) {
                setFormData(prev => ({ ...prev, abv: calculatedABV }));
            }
        }
    }, [formData.og, formData.fg]);

    const onAddInventoryItem = async (name, category) => {
        const unit = category === 'Levadura' ? 'sobre' : category === 'Lúpulo' ? 'g' : 'kg';
        await addItem({ category, name, stock: 0, unit, price: 0 });
    };

    const handleClone = (e) => {
        const recipeId = e.target.value;
        if (!recipeId) return;

        const recipeToClone = (recipes || []).find(r => r.id === recipeId);
        if (recipeToClone) {
            const safeMalts = Array.isArray(recipeToClone.ingredients?.malts) ? [...recipeToClone.ingredients.malts] : [{ name: '', amount: 0 }];
            const safeHops = Array.isArray(recipeToClone.ingredients?.hops) ? [...recipeToClone.ingredients.hops] : [{ name: '', amount: 0, time: '', use: 'Hervor', phase: 'cooking' }];
            const safeOthers = Array.isArray(recipeToClone.ingredients?.others) ? [...recipeToClone.ingredients.others] : [];

            let safeYeast = '';
            if (recipeToClone.ingredients?.yeast) {
                if (typeof recipeToClone.ingredients.yeast === 'string') safeYeast = recipeToClone.ingredients.yeast;
                else safeYeast = recipeToClone.ingredients.yeast.name || '';
            }

            setFormData(prev => ({
                ...prev,
                name: recipeToClone.name + ' (Copia)',
                category: recipeToClone.category || 'Hazy IPA',
                description: recipeToClone.description || '',
                targetVolume: recipeToClone.targetVolume || 20,
                og: recipeToClone.og || 1.050,
                fg: recipeToClone.fg || 1.010,
                abv: recipeToClone.abv || 5.0,
                ibu: recipeToClone.ibu || 0,
                colorSRM: recipeToClone.colorSRM || 0,
                malts: safeMalts,
                hops: safeHops,
                others: safeOthers,
                yeast: safeYeast,
                strike: recipeToClone.ingredients?.water?.strike || 15,
                sparge: recipeToClone.ingredients?.water?.sparge || 15,
                waterProfile: recipeToClone.waterProfile || { Ca: 100, Mg: 10, SO4: 100, Cl: 100, HCO3: 50 },
                steps: Array.isArray(recipeToClone.steps) ? [...recipeToClone.steps].map((s, i) => ({ ...s, id: Date.now() + i })) : [],
                tips: Array.isArray(recipeToClone.tips) ? [...recipeToClone.tips] : [],
                modifications: []
            }));
        }
    };

    const handleAIGenerate = async () => {
        if (!iaPrompt.trim()) return alert("Por favor, describe la cerveza que deseas generar.");
        setIsGeneratingIA(true);
        try {
            const systemInstruction = "Eres un Maestro Cervecero experto. Genera una receta de cerveza altamente detallada. Incluye una descripción 'description' muy creativa, poética y entretenida de la cerveza. Responde ÚNICAMENTE con un JSON válido sin markdown code blocks.";
            const prompt = `Genera una receta profesional de cerveza basada en esta idea: "${iaPrompt}". 
      Estructura JSON esperada OBLIGATORIA:
      {
        "name": "Nombre creativo",
        "category": "Estilo oficial",
        "description": "Una breve historia o descripción.",
        "targetVolume": 20,
        "og": 1.050, "fg": 1.010, "abv": 5.0, "ibu": 30, "colorSRM": 5,
        "waterProfile": { "Ca": 100, "Mg": 10, "SO4": 100, "Cl": 100, "HCO3": 50 },
        "malts": [{ "name": "Nombre Malta", "amount": 5 }],
        "hops": [{ "name": "Nombre Lúpulo", "amount": 50, "time": "60 min", "use": "Hervor", "phase": "cooking" }],
        "others": [{ "name": "Irish Moss", "amount": 5, "unit": "g", "category": "Aditivos", "phase": "cooking" }],
        "yeast": "Nombre Levadura Recomendada",
        "strike": 15, "sparge": 15,
        "steps": [{ "title": "Maceración", "desc": "Corto", "details": "Largo técnico", "duration": 60, "phase": "cooking" }],
        "tips": [{ "title": "Tip", "desc": "Expl" }]
      }`;

            // VUL-007 FIX: callGemini(prompt, systemInstruction, isJson) — pasar args posicionalmente
            const responseJSON = await callGemini(prompt, systemInstruction, true);

            let parsed = responseJSON;
            if (typeof responseJSON === 'string') {
                // Gemini a veces devuelve texto con comillas raras o backticks si el backend no fozró Response.json().
                const cleanJson = responseJSON.replace(/^```json\s*/, '').replace(/```$/, '').trim();
                parsed = JSON.parse(cleanJson);
            }

            setFormData(prev => ({
                ...prev,
                ...parsed,
                malts: parsed.malts || [{ name: '', amount: 0 }],
                hops: parsed.hops || [{ name: '', amount: 0, time: '', use: 'Hervor', phase: 'cooking' }],
                others: parsed.others || [],
                steps: (parsed.steps || []).map((s, i) => ({ ...s, id: Date.now() + i, phase: s.phase || 'cooking' })),
                tips: parsed.tips || []
            }));

        } catch (err) {
            console.error("Error al conectar con IA:", err);
            alert(`Error con la IA: ${err.message}`);
        } finally {
            setIsGeneratingIA(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name) return alert("Ponle un nombre a tu receta");

        const newModifications = [...(formData.modifications || [])];
        if (isEditing && modNote.trim()) {
            newModifications.push({ date: getFormattedDate(), note: modNote });
        } else if (isEditing) {
            newModifications.push({ date: getFormattedDate(), note: "Edición general." });
        }

        const recipeData = {
            category: formData.category,
            name: formData.name,
            description: formData.description || '',
            targetVolume: Number(formData.targetVolume),
            og: Number(formData.og),
            fg: Number(formData.fg),
            abv: Number(formData.abv),
            ibu: Number(formData.ibu),
            colorSRM: Number(formData.colorSRM),
            waterProfile: {
                Ca: Number(formData.waterProfile?.Ca || 0), Mg: Number(formData.waterProfile?.Mg || 0),
                SO4: Number(formData.waterProfile?.SO4 || 0), Cl: Number(formData.waterProfile?.Cl || 0),
                HCO3: Number(formData.waterProfile?.HCO3 || 0)
            },
            ingredients: {
                malts: formData.malts.filter(m => m.name !== '').map(m => ({ ...m, unit: 'kg', amount: Number(m.amount) })),
                hops: formData.hops.filter(h => h.name !== '').map(h => ({ ...h, unit: 'g', amount: Number(h.amount), phase: h.phase || getEffectivePhase(h) })),
                others: (formData.others || []).filter(o => o.name !== '').map(o => ({ ...o, amount: Number(o.amount), phase: o.phase || getEffectivePhase(o) })),
                yeast: { name: formData.yeast || "Levadura Genérica", amount: 1, unit: "sobre" },
                water: { strike: Number(formData.strike), sparge: Number(formData.sparge) }
            },
            steps: formData.steps.filter(s => s.title !== '').map(s => ({ ...s, phase: s.phase || getEffectivePhase(s) })),
            tips: formData.tips.filter(t => t.title !== ''),
            fermentationDays: formData.fermentationDays || '14D',
            modifications: newModifications
        };

        try {
            if (isEditing) {
                await updateRecipe(formData.id, recipeData);
                navigate(`/recipes/${formData.id}`);
            } else {
                await addRecipe(recipeData);
                navigate('/recipes');
            }
        } catch (error) {
            console.error("Error guardando receta:", error);
            alert("No se pudo guardar la receta.");
        }
    };

    const handleCancel = () => {
        if (isEditing) navigate(`/recipes/${id}`);
        else navigate('/recipes');
    };

    const updateArray = (arrayName, idx, field, value) => {
        const newArr = [...formData[arrayName]];
        newArr[idx] = { ...newArr[idx], [field]: value };
        setFormData({ ...formData, [arrayName]: newArr });
    };

    const removeArrayItem = (arrayName, idx) => {
        const newArr = formData[arrayName].filter((_, i) => i !== idx);
        setFormData({ ...formData, [arrayName]: newArr });
    };

    const steps = [
        { id: 1, title: 'Perfil General', icon: <Info size={18} /> },
        { id: 2, title: 'Cocción', icon: <Thermometer size={18} /> },
        { id: 3, title: 'Fermentación', icon: <Activity size={18} /> },
        { id: 4, title: 'Envasado', icon: <Droplets size={18} /> },
        { id: 5, title: 'Resumen Final', icon: <Sparkles size={18} /> }
    ];

    return (
        <div className="bg-panel p-6 md:p-8 rounded-3xl shadow-2xl border border-line animate-fadeIn mb-8">
            <div className="flex justify-between items-center border-b border-line pb-4 mb-6">
                <div>
                    <h2 className="text-2xl font-black text-content">{isEditing ? 'Editar Receta' : 'Crear Nueva Receta'}</h2>
                    <p className="text-xs text-muted font-bold uppercase tracking-wider mt-1">Paso {activeStep} de 5: {steps[activeStep - 1].title}</p>
                </div>
                <button onClick={handleCancel} className="text-muted hover:text-red-500 font-bold transition-colors">Cancelar</button>
            </div>

            {/* Step Indicator */}
            <div className="hidden md:flex justify-between mb-8 gap-2">
                {steps.map((s) => (
                    <div
                        key={s.id}
                        className={`flex-1 flex items-center gap-2 p-3 rounded-xl border transition-all ${activeStep === s.id ? 'bg-amber-500/10 border-amber-500 text-amber-500' :
                            activeStep > s.id ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' :
                                'bg-surface border-line text-muted opacity-50'
                            }`}
                    >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${activeStep === s.id ? 'bg-amber-500 text-white' :
                            activeStep > s.id ? 'bg-emerald-500 text-white' : 'bg-line text-muted'
                            }`}>
                            {activeStep > s.id ? <CheckCircle2 size={14} /> : s.id}
                        </div>
                        <span className="text-xs font-black uppercase tracking-tighter">{s.title}</span>
                    </div>
                ))}
            </div>

            <div className="space-y-8">
                {activeStep === 1 && (
                    <div className="space-y-6 animate-fadeIn">
                        {!isEditing && recipes && recipes.length > 0 && (
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-200 dark:border-blue-800/30 mb-6 flex flex-col md:flex-row items-start md:items-center gap-4 shadow-sm">
                                <label className="text-sm font-black text-blue-800 dark:text-blue-400 whitespace-nowrap flex items-center gap-2">
                                    <BookOpen size={20} /> Clonar receta:
                                </label>
                                <select
                                    className="flex-1 w-full p-3 border border-blue-200 dark:border-slate-700 rounded-xl bg-surface transition-all text-content outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                                    onChange={handleClone}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Selecciona una receta para copiar...</option>
                                    {recipes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.category})</option>)}
                                </select>
                            </div>
                        )}

                        {!isEditing && (
                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 p-6 rounded-2xl border border-amber-200 dark:border-amber-800/30 mb-6 shadow-sm">
                                <label className="block text-sm font-black text-amber-800 dark:text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Sparkles size={20} /> Generador IA
                                </label>
                                <div className="flex flex-col md:flex-row gap-3">
                                    <input type="text" placeholder="Ej: Una IPA muy lupulada..." className="flex-1 p-4 border border-line rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-surface text-content" value={iaPrompt} onChange={e => setIaPrompt(e.target.value)} disabled={isGeneratingIA || isGuest} />
                                    <button onClick={handleAIGenerate} disabled={isGeneratingIA || isGuest} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition-all min-w-[200px]">
                                        {isGeneratingIA ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />} {isGeneratingIA ? 'Generando...' : 'IA Generate'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-muted uppercase mb-1">Nombre</label><input type="text" className="w-full p-4 border border-line rounded-xl bg-surface text-content outline-none focus:ring-2 focus:ring-amber-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-muted uppercase mb-1">Estilo</label><input type="text" className="w-full p-4 border border-line rounded-xl bg-surface text-content outline-none focus:ring-2 focus:ring-amber-500" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} /></div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted uppercase mb-1">Descripción / Historia (Opcional)</label>
                            <textarea rows="3" className="w-full p-4 border border-line rounded-xl bg-surface text-content outline-none focus:ring-2 focus:ring-amber-500 resize-none" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                            <div><label className="block text-[10px] font-bold text-muted uppercase">Vol (L)</label><input type="number" className="w-full p-3 border border-line rounded-xl bg-surface text-content" value={formData.targetVolume} onChange={e => setFormData({ ...formData, targetVolume: e.target.value })} /></div>
                            <div><label className="block text-[10px] font-bold text-muted uppercase">ABV (%)</label><input type="number" step="0.1" className="w-full p-3 border border-line rounded-xl bg-surface text-content" value={formData.abv} onChange={e => setFormData({ ...formData, abv: e.target.value })} /></div>
                            <div><label className="block text-[10px] font-bold text-muted uppercase">D. Orig.</label><input type="number" step="0.001" className="w-full p-3 border border-line rounded-xl bg-surface text-content" value={formData.og} onChange={e => setFormData({ ...formData, og: e.target.value })} /></div>
                            <div><label className="block text-[10px] font-bold text-muted uppercase">D. Final</label><input type="number" step="0.001" className="w-full p-3 border border-line rounded-xl bg-surface text-content" value={formData.fg} onChange={e => setFormData({ ...formData, fg: e.target.value })} /></div>
                            <div><label className="block text-[10px] font-bold text-orange-500 uppercase">IBU</label><input type="number" className="w-full p-3 border border-line rounded-xl bg-surface text-content" value={formData.ibu} onChange={e => setFormData({ ...formData, ibu: e.target.value })} /></div>
                            <div><label className="block text-[10px] font-bold text-amber-500 uppercase">SRM</label><input type="number" className="w-full p-3 border border-line rounded-xl bg-surface text-content" value={formData.colorSRM} onChange={e => setFormData({ ...formData, colorSRM: e.target.value })} /></div>
                        </div>

                        <div className="border border-blue-100 dark:border-blue-900/30 p-5 rounded-2xl bg-blue-50/20 dark:bg-blue-900/5">
                            <h4 className="font-black text-xs text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Droplets size={16} /> Perfil Agua (ppm)</h4>
                            <div className="grid grid-cols-5 gap-2 md:gap-4">
                                {['Ca', 'Mg', 'SO4', 'Cl', 'HCO3'].map(ion => (
                                    <div key={ion}>
                                        <label className="block text-[10px] font-bold text-muted uppercase mb-1 text-center">{ion}</label>
                                        <input type="number" className="w-full p-3 border border-line rounded-xl bg-surface text-content text-center" value={formData.waterProfile?.[ion] || 0} onChange={e => setFormData({ ...formData, waterProfile: { ...formData.waterProfile, [ion]: e.target.value } })} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeStep === 2 && (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="grid md:grid-cols-2 gap-4 bg-surface p-5 rounded-2xl border border-line shadow-inner">
                            <div><label className="block text-xs font-bold text-muted uppercase mb-1">Agua Maceración (L)</label><input type="number" className="w-full p-4 border border-line rounded-xl bg-panel text-content focus:ring-2 focus:ring-blue-500 outline-none" value={formData.strike} onChange={e => setFormData({ ...formData, strike: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-muted uppercase mb-1">Agua Lavado (L)</label><input type="number" className="w-full p-4 border border-line rounded-xl bg-panel text-content focus:ring-2 focus:ring-blue-500 outline-none" value={formData.sparge} onChange={e => setFormData({ ...formData, sparge: e.target.value })} /></div>
                        </div>

                        <div>
                            <h3 className="font-black text-lg mb-3 text-content flex items-center gap-2"><Wheat size={20} className="text-amber-500" /> Granos (kg)</h3>
                            <div className="flex px-3 mb-1 uppercase text-[10px] font-black text-muted tracking-widest">
                                <span className="flex-1">Nombre de la Malta</span>
                                <span className="w-24 text-center">Cantidad (kg)</span>
                                <span className="w-10"></span>
                            </div>
                            <div className="space-y-2">
                                {formData.malts.map((m, i) => (
                                    <div key={i} className="flex gap-2">
                                        <AutocompleteInput value={m.name} onChange={val => updateArray('malts', i, 'name', val)} placeholder="Nombre malta..." category="Malta" inventory={inventory} onAddNewItem={onAddInventoryItem} />
                                        <input type="number" step="0.1" placeholder="Kg" className="w-24 p-3 border border-line rounded-xl bg-surface text-content" value={m.amount} onChange={e => updateArray('malts', i, 'amount', e.target.value)} />
                                        <button onClick={() => removeArrayItem('malts', i)} className="text-muted hover:text-red-500 px-2"><Trash2 size={18} /></button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setFormData({ ...formData, malts: [...formData.malts, { name: '', amount: 0 }] })} className="text-sm text-amber-600 font-bold bg-amber-50 dark:bg-amber-900/30 px-4 py-2 rounded-xl mt-3">+ Añadir Malta</button>
                        </div>

                        <div>
                            <h3 className="font-black text-lg mb-3 text-content flex items-center gap-2"><Leaf size={20} className="text-green-500" /> Lúpulos y Aditivos de Cocción</h3>
                            <div className="hidden md:flex px-6 mb-1 uppercase text-[10px] font-black text-muted tracking-widest gap-2">
                                <span className="flex-1">Ingrediente</span>
                                <span className="w-20 text-center">Cantidad</span>
                                <span className="w-24 text-center">Tiempo</span>
                                <span className="w-24 text-center">Etapa/Uso</span>
                                <span className="w-10"></span>
                            </div>
                            <div className="space-y-2">
                                {formData.hops.filter(h => h.phase === 'cooking').map((h, i) => {
                                    const actualIdx = formData.hops.indexOf(h);
                                    return (
                                        <div key={i} className="flex gap-2 flex-wrap md:flex-nowrap bg-surface p-3 rounded-2xl border border-line">
                                            <AutocompleteInput className="flex-1" value={h.name} onChange={val => updateArray('hops', actualIdx, 'name', val)} placeholder="Nombre..." category="Lúpulo" inventory={inventory} onAddNewItem={onAddInventoryItem} />
                                            <input type="number" placeholder="Gramos" className="w-20 p-3 border border-line rounded-xl bg-panel text-content" value={h.amount} onChange={e => updateArray('hops', actualIdx, 'amount', e.target.value)} />
                                            <input type="text" placeholder="Min/60" className="w-24 p-3 border border-line rounded-xl bg-panel text-content" value={h.time} onChange={e => updateArray('hops', actualIdx, 'time', e.target.value)} />
                                            <input type="text" placeholder="Uso" className="w-24 p-3 border border-line rounded-xl bg-panel text-content" value={h.use || h.stage || ''} onChange={e => updateArray('hops', actualIdx, 'use', e.target.value)} />
                                            <button onClick={() => removeArrayItem('hops', actualIdx)} className="text-muted hover:text-red-500 px-2"><Trash2 size={18} /></button>
                                        </div>
                                    );
                                })}
                                {(formData.others || []).filter(o => o.phase === 'cooking').map((o, i) => {
                                    const actualIdx = formData.others.indexOf(o);
                                    return (
                                        <div key={`o-${i}`} className="flex gap-2 flex-wrap md:flex-nowrap bg-surface p-3 rounded-2xl border border-line">
                                            <AutocompleteInput className="flex-1" value={o.name} onChange={val => updateArray('others', actualIdx, 'name', val)} placeholder="Aditivo..." category="Aditivos" inventory={inventory} onAddNewItem={onAddInventoryItem} />
                                            <input type="number" placeholder="Cant" className="w-20 p-3 border border-line rounded-xl bg-panel text-content" value={o.amount} onChange={e => updateArray('others', actualIdx, 'amount', e.target.value)} />
                                            <select className="w-24 p-3 border border-line rounded-xl bg-panel text-content" value={o.unit || 'g'} onChange={e => updateArray('others', actualIdx, 'unit', e.target.value)}>
                                                <option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="u">u</option>
                                            </select>
                                            <button onClick={() => removeArrayItem('others', actualIdx)} className="text-muted hover:text-red-500 px-2"><Trash2 size={18} /></button>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex gap-2 mt-3">
                                <button onClick={() => setFormData({ ...formData, hops: [...formData.hops, { name: '', amount: 0, time: '', use: 'Hervor', phase: 'cooking' }] })} className="text-sm text-green-600 font-bold bg-green-50 dark:bg-green-900/30 px-4 py-2 rounded-xl">+ Lúpulo Cocción</button>
                                <button onClick={() => setFormData({ ...formData, others: [...(formData.others || []), { name: '', amount: 0, unit: 'g', phase: 'cooking', category: 'Aditivos' }] })} className="text-sm text-purple-600 font-bold bg-purple-50 dark:bg-purple-900/30 px-4 py-2 rounded-xl">+ Aditivo Cocción</button>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-black text-lg mb-3 text-content flex items-center gap-2"><ListOrdered size={20} className="text-amber-500" /> Pasos de Cocción</h3>
                            <div className="space-y-4">
                                {formData.steps.filter(s => s.phase === 'cooking').map((step, i) => {
                                    const actualIdx = formData.steps.indexOf(step);
                                    return (
                                        <div key={i} className="bg-surface p-5 rounded-2xl border border-line relative animate-fadeIn shadow-sm">
                                            <button onClick={() => removeArrayItem('steps', actualIdx)} className="absolute top-4 right-4 text-muted hover:text-red-500"><Trash2 size={18} /></button>
                                            <div className="grid md:grid-cols-2 gap-4 mb-3">
                                                <input type="text" placeholder="Título (Ej: Mash)" className="p-3 border border-line rounded-xl bg-panel text-content font-bold" value={step.title} onChange={e => updateArray('steps', actualIdx, 'title', e.target.value)} />
                                                <input type="text" placeholder="Duración (Ej: 60M)" className="p-3 border border-line rounded-xl bg-panel text-content font-bold" value={step.duration || ''} onChange={e => updateArray('steps', actualIdx, 'duration', e.target.value)} />
                                            </div>
                                            <textarea placeholder="Descripción técnica..." rows="2" className="w-full p-3 border border-line rounded-xl bg-panel text-content resize-none text-sm" value={step.details || ''} onChange={e => updateArray('steps', actualIdx, 'details', e.target.value)} />
                                        </div>
                                    );
                                })}
                            </div>
                            <button onClick={() => setFormData({ ...formData, steps: [...formData.steps, { id: Date.now(), title: '', desc: '', details: '', duration: 0, phase: 'cooking' }] })} className="text-sm text-amber-600 font-bold bg-amber-50 dark:bg-amber-900/30 px-4 py-2 rounded-xl mt-3">Añadir Paso Cocción</button>
                        </div>
                    </div>
                )}

                {activeStep === 3 && (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="bg-surface p-6 rounded-2xl border border-line shadow-sm relative">
                            <h3 className="font-black text-lg mb-4 text-content flex items-center gap-3"><Beaker size={24} className="text-amber-500" /> Levadura</h3>
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 w-full">
                                    <label className="block text-xs font-bold text-muted uppercase mb-1">Nombre Levadura</label>
                                    <AutocompleteInput value={formData.yeast} onChange={val => setFormData({ ...formData, yeast: val })} placeholder="Buscar levadura..." category="Levadura" inventory={inventory} onAddNewItem={onAddInventoryItem} />
                                </div>
                                <div className="w-full md:w-32">
                                    <label className="block text-xs font-bold text-muted uppercase mb-1">Días Ferment.</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: 14D"
                                        className="w-full p-3 border border-line rounded-xl bg-panel text-content font-bold"
                                        value={formData.fermentationDays || ''}
                                        onChange={e => setFormData({ ...formData, fermentationDays: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-black text-lg mb-3 text-content flex items-center gap-2"><Leaf size={20} className="text-purple-500" /> Lúpulos (Dry Hop) y Aditivos Fermentación</h3>
                            <div className="hidden md:flex px-6 mb-1 uppercase text-[10px] font-black text-muted tracking-widest gap-2">
                                <span className="flex-1">Ingrediente</span>
                                <span className="w-20 text-center">Gramos</span>
                                <span className="w-24 text-center">Momento (Ej: Día 3)</span>
                                <span className="w-10"></span>
                            </div>
                            <div className="space-y-2">
                                {formData.hops.filter(h => h.phase === 'fermenting').map((h, i) => {
                                    const actualIdx = formData.hops.indexOf(h);
                                    return (
                                        <div key={i} className="flex gap-2 flex-wrap md:flex-nowrap bg-surface p-3 rounded-2xl border border-line animate-fadeIn">
                                            <AutocompleteInput className="flex-1" value={h.name} onChange={val => updateArray('hops', actualIdx, 'name', val)} placeholder="Nombre Lúpulo..." category="Lúpulo" inventory={inventory} onAddNewItem={onAddInventoryItem} />
                                            <input type="number" placeholder="Gramos" className="w-20 p-3 border border-line rounded-xl bg-panel text-content" value={h.amount} onChange={e => updateArray('hops', actualIdx, 'amount', e.target.value)} />
                                            <input type="text" placeholder="Ej: Día 3" className="w-24 p-3 border border-line rounded-xl bg-panel text-content" value={h.time} onChange={e => updateArray('hops', actualIdx, 'time', e.target.value)} />
                                            <button onClick={() => removeArrayItem('hops', actualIdx)} className="text-muted hover:text-red-500 px-2"><Trash2 size={18} /></button>
                                        </div>
                                    );
                                })}
                                {(formData.others || []).filter(o => o.phase === 'fermenting').map((o, i) => {
                                    const actualIdx = formData.others.indexOf(o);
                                    return (
                                        <div key={`o-${i}`} className="flex gap-2 flex-wrap md:flex-nowrap bg-surface p-3 rounded-2xl border border-line animate-fadeIn">
                                            <AutocompleteInput className="flex-1" value={o.name} onChange={val => updateArray('others', actualIdx, 'name', val)} placeholder="Aditivo..." category="Aditivos" inventory={inventory} onAddNewItem={onAddInventoryItem} />
                                            <input type="number" placeholder="Cant" className="w-20 p-3 border border-line rounded-xl bg-panel text-content" value={o.amount} onChange={e => updateArray('others', actualIdx, 'amount', e.target.value)} />
                                            <select className="w-24 p-3 border border-line rounded-xl bg-panel text-content" value={o.unit || 'g'} onChange={e => updateArray('others', actualIdx, 'unit', e.target.value)}>
                                                <option value="g">g</option><option value="ml">ml</option><option value="u">u</option>
                                            </select>
                                            <button onClick={() => removeArrayItem('others', actualIdx)} className="text-muted hover:text-red-500 px-2"><Trash2 size={18} /></button>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex gap-2 mt-3">
                                <button onClick={() => setFormData({ ...formData, hops: [...formData.hops, { name: '', amount: 0, time: '', use: 'Dry Hop', phase: 'fermenting' }] })} className="text-sm text-purple-600 font-bold bg-purple-50 dark:bg-purple-900/30 px-4 py-2 rounded-xl">+ Dry Hop</button>
                                <button onClick={() => setFormData({ ...formData, others: [...(formData.others || []), { name: '', amount: 0, unit: 'g', phase: 'fermenting', category: 'Aditivos' }] })} className="text-sm text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-xl">+ Aditivo Fermentación</button>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-black text-lg mb-3 text-content flex items-center gap-2"><ListOrdered size={20} className="text-purple-500" /> Pasos de Fermentación</h3>
                            <div className="space-y-4">
                                {formData.steps.filter(s => s.phase === 'fermenting').map((step, i) => {
                                    const actualIdx = formData.steps.indexOf(step);
                                    return (
                                        <div key={i} className="bg-surface p-5 rounded-2xl border border-line relative shadow-sm">
                                            <button onClick={() => removeArrayItem('steps', actualIdx)} className="absolute top-4 right-4 text-muted hover:text-red-500"><Trash2 size={18} /></button>
                                            <div className="grid md:grid-cols-2 gap-4 mb-3">
                                                <input type="text" placeholder="Título (Ej: Maduración)" className="p-3 border border-line rounded-xl bg-panel text-content font-bold" value={step.title} onChange={e => updateArray('steps', actualIdx, 'title', e.target.value)} />
                                                <input type="text" placeholder="Duración (Ej: 14D)" className="p-3 border border-line rounded-xl bg-panel text-content font-bold" value={step.duration || ''} onChange={e => updateArray('steps', actualIdx, 'duration', e.target.value)} />
                                            </div>
                                            <textarea placeholder="Detalles técnicos..." rows="2" className="w-full p-3 border border-line rounded-xl bg-panel text-content resize-none text-sm" value={step.details || ''} onChange={e => updateArray('steps', actualIdx, 'details', e.target.value)} />
                                        </div>
                                    );
                                })}
                            </div>
                            <button onClick={() => setFormData({ ...formData, steps: [...formData.steps, { id: Date.now(), title: '', desc: '', details: '', duration: 0, phase: 'fermenting' }] })} className="text-sm text-purple-600 font-bold bg-purple-50 dark:bg-purple-900/30 px-4 py-2 rounded-xl mt-3">+ Añadir Paso Fermentación</button>
                        </div>
                    </div>
                )}

                {activeStep === 4 && (
                    <div className="space-y-8 animate-fadeIn">
                        <div>
                            <h3 className="font-black text-lg mb-3 text-content flex items-center gap-2"><Sparkles size={20} className="text-blue-500" /> Aditivos de Envasado (Priming / Clarificantes)</h3>
                            <div className="hidden md:flex px-6 mb-1 uppercase text-[10px] font-black text-muted tracking-widest gap-2">
                                <span className="flex-1">Aditivo / Azúcar</span>
                                <span className="w-24 text-center">Cantidad</span>
                                <span className="w-24 text-center">Unidad</span>
                                <span className="w-10"></span>
                            </div>
                            <div className="space-y-2">
                                {(formData.others || []).filter(o => o.phase === 'bottling').map((o, i) => {
                                    const actualIdx = formData.others.indexOf(o);
                                    return (
                                        <div key={i} className="flex gap-2 bg-surface p-3 rounded-2xl border border-line animate-fadeIn">
                                            <AutocompleteInput className="flex-1" value={o.name} onChange={val => updateArray('others', actualIdx, 'name', val)} placeholder="Ej: Azúcar de maíz..." category="Aditivos" inventory={inventory} onAddNewItem={onAddInventoryItem} />
                                            <input type="number" placeholder="Cant" className="w-24 p-3 border border-line rounded-xl bg-panel text-content" value={o.amount} onChange={e => updateArray('others', actualIdx, 'amount', e.target.value)} />
                                            <select className="w-24 p-3 border border-line rounded-xl bg-panel text-content" value={o.unit || 'g'} onChange={e => updateArray('others', actualIdx, 'unit', e.target.value)}>
                                                <option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option>
                                            </select>
                                            <button onClick={() => removeArrayItem('others', actualIdx)} className="text-muted hover:text-red-500 px-2"><Trash2 size={18} /></button>
                                        </div>
                                    );
                                })}
                            </div>
                            <button onClick={() => setFormData({ ...formData, others: [...(formData.others || []), { name: '', amount: 0, unit: 'g', phase: 'bottling', category: 'Aditivos' }] })} className="text-sm text-blue-600 font-bold bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl mt-3">+ Aditivo Envasado</button>
                        </div>

                        <div>
                            <h3 className="font-black text-lg mb-3 text-content flex items-center gap-2"><ListOrdered size={20} className="text-blue-500" /> Pasos de Envasado</h3>
                            <div className="space-y-4">
                                {formData.steps.filter(s => s.phase === 'bottling').map((step, i) => {
                                    const actualIdx = formData.steps.indexOf(step);
                                    return (
                                        <div key={i} className="bg-surface p-5 rounded-2xl border border-line relative animate-fadeIn shadow-sm">
                                            <button onClick={() => removeArrayItem('steps', actualIdx)} className="absolute top-4 right-4 text-muted hover:text-red-500"><Trash2 size={18} /></button>
                                            <div className="grid md:grid-cols-2 gap-4 mb-3">
                                                <input type="text" placeholder="Título" className="p-3 border border-line rounded-xl bg-panel text-content font-bold" value={step.title} onChange={e => updateArray('steps', actualIdx, 'title', e.target.value)} />
                                                <input type="text" placeholder="Duración (Ej: 21D)" className="p-3 border border-line rounded-xl bg-panel text-content font-bold" value={step.duration || ''} onChange={e => updateArray('steps', actualIdx, 'duration', e.target.value)} />
                                            </div>
                                            <textarea placeholder="Observaciones..." rows="2" className="w-full p-3 border border-line rounded-xl bg-panel text-content resize-none text-sm" value={step.details || ''} onChange={e => updateArray('steps', actualIdx, 'details', e.target.value)} />
                                        </div>
                                    );
                                })}
                            </div>
                            <button onClick={() => setFormData({ ...formData, steps: [...formData.steps, { id: Date.now(), title: '', desc: '', details: '', duration: 0, phase: 'bottling' }] })} className="text-sm text-blue-600 font-bold bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl mt-3">+ Añadir Paso Envasado</button>
                        </div>
                    </div>
                )}

                {activeStep === 5 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-8 rounded-3xl shadow-xl border-4 border-white/10 relative overflow-hidden">
                            <Sparkles className="absolute top-4 right-4 opacity-20" size={80} />
                            <h3 className="text-4xl font-black mb-2 leading-none uppercase tracking-tighter">Resumen Cervecero</h3>
                            <p className="text-white/80 font-bold text-lg mb-6">{formData.name} • {formData.category}</p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div className="bg-black/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm"><span className="block text-[10px] uppercase font-black opacity-60">Volumen</span><span className="text-2xl font-black">{formData.targetVolume}L</span></div>
                                <div className="bg-black/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm"><span className="block text-[10px] uppercase font-black opacity-60">Alcohol</span><span className="text-2xl font-black">{formData.abv}%</span></div>
                                <div className="bg-black/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm"><span className="block text-[10px] uppercase font-black opacity-60">Amargor</span><span className="text-2xl font-black">{formData.ibu} IBU</span></div>
                                <div className="bg-black/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm"><span className="block text-[10px] uppercase font-black opacity-60">Ferment.</span><span className="text-2xl font-black">{formData.fermentationDays}</span></div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-surface p-6 rounded-2xl border border-line">
                                <h4 className="font-black text-sm uppercase tracking-widest text-muted mb-4 border-b border-line pb-2">Insumos Totales</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm font-bold text-content border-b border-line/5 pb-1"><span>Granos Totales:</span><span>{formData.malts.reduce((acc, m) => acc + Number(m.amount || 0), 0).toFixed(2)} kg</span></div>
                                    <div className="flex justify-between text-sm font-bold text-content border-b border-line/5 pb-1"><span>Lúpulo Cocción:</span><span>{formData.hops.filter(h => h.phase === 'cooking').reduce((acc, h) => acc + Number(h.amount || 0), 0)} g</span></div>
                                    <div className="flex justify-between text-sm font-bold text-content border-b border-line/5 pb-1"><span>Lúpulo Dry Hop:</span><span>{formData.hops.filter(h => h.phase === 'fermenting').reduce((acc, h) => acc + Number(h.amount || 0), 0)} g</span></div>
                                    <div className="flex justify-between text-sm font-bold text-content border-b border-line/5 pb-1"><span>Levadura:</span><span>{formData.yeast}</span></div>
                                </div>
                            </div>
                            <div className="bg-surface p-6 rounded-2xl border border-line">
                                <h4 className="font-black text-sm uppercase tracking-widest text-muted mb-4 border-b border-line pb-2">Proceso Estructurado</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-black text-amber-500 uppercase"><Thermometer size={14} /> Cocción: {formData.steps.filter(s => s.phase === 'cooking').length} pasos</div>
                                    <div className="flex items-center gap-2 text-xs font-black text-purple-500 uppercase"><Activity size={14} /> Fermentación: {formData.steps.filter(s => s.phase === 'fermenting').length} pasos</div>
                                    <div className="flex items-center gap-2 text-xs font-black text-blue-500 uppercase"><Droplets size={14} /> Envasado: {formData.steps.filter(s => s.phase === 'bottling').length} pasos</div>
                                </div>
                            </div>
                        </div>

                        {isEditing && (
                            <div className="bg-panel p-5 rounded-2xl border border-line mt-4">
                                <label className="block text-xs font-bold text-muted uppercase mb-2">Nota de Edición</label>
                                <input type="text" placeholder="¿Qué cambiaste?" className="w-full p-4 border border-line rounded-xl bg-surface text-content font-bold outline-none focus:ring-2 focus:ring-amber-500" value={modNote} onChange={e => setModNote(e.target.value)} />
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center pt-8 border-t border-line mt-8 gap-4">
                    {activeStep > 1 ? (
                        <button
                            onClick={() => setActiveStep(activeStep - 1)}
                            className="bg-surface border border-line text-content px-8 py-4 rounded-2xl font-black text-lg hover:bg-panel transition-all shadow-md flex items-center gap-2"
                        >
                            Anterior
                        </button>
                    ) : (
                        <div />
                    )}

                    {activeStep < 5 ? (
                        <button
                            onClick={() => setActiveStep(activeStep + 1)}
                            disabled={activeStep === 1 && !formData.name}
                            className="bg-amber-500 text-white px-10 py-4 rounded-2xl font-black text-lg hover:bg-amber-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 flex items-center gap-2"
                        >
                            Siguiente Paso
                        </button>
                    ) : (
                        <button
                            onClick={() => { if (!isGuest) handleSave(); else alert(guestTooltip); }}
                            disabled={isGuest}
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-12 py-4 rounded-2xl font-black text-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 disabled:opacity-50 flex items-center gap-3 animate-pulse"
                        >
                            <Save size={24} /> {isEditing ? 'Guardar Cambios' : 'Registrar Receta'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
