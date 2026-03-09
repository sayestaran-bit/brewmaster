// /src/components/recipe/RecipeForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles, Loader2, Wand2, Wheat, Leaf, Droplets, ListOrdered, Trash2, Plus, Info, Save, BookOpen } from 'lucide-react';

import AutocompleteInput from '../common/AutocompleteInput';
import { useRecipes } from '../../hooks/useRecipes';
import { useInventory } from '../../hooks/useInventory';
import { getFormattedDate } from '../../utils/formatters';
import { getRecipeAdvice, callGemini } from '../../services/gemini';
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
        waterProfile: { Ca: 100, Mg: 10, SO4: 100, Cl: 100, HCO3: 50 },
        modifications: [], steps: [], tips: []
    };

    const [formData, setFormData] = useState(defaultEmptyState);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        setIsInitialized(false);
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
                hops: formData.hops.filter(h => h.name !== '').map(h => ({ ...h, unit: 'g', amount: Number(h.amount), phase: h.phase || 'cooking' })),
                others: (formData.others || []).filter(o => o.name !== '').map(o => ({ ...o, amount: Number(o.amount), phase: o.phase || 'cooking' })),
                yeast: { name: formData.yeast || "Levadura Genérica", amount: 1, unit: "sobre" },
                water: { strike: Number(formData.strike), sparge: Number(formData.sparge) }
            },
            steps: formData.steps.filter(s => s.title !== '').map(s => ({ ...s, phase: s.phase || 'cooking' })),
            tips: formData.tips.filter(t => t.title !== ''),
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

    return (
        <div className="bg-panel p-6 md:p-8 rounded-3xl shadow-2xl border border-line animate-fadeIn mb-8">
            <div className="flex justify-between items-center border-b border-line pb-4 mb-6">
                <h2 className="text-2xl font-black text-content">{isEditing ? 'Editar Receta' : 'Crear Nueva Receta'}</h2>
                <button onClick={handleCancel} className="text-muted hover:text-red-500 font-bold transition-colors">Cancelar</button>
            </div>

            {!isEditing && recipes && recipes.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-200 dark:border-blue-800/30 mb-8 flex flex-col md:flex-row items-start md:items-center gap-4 shadow-sm">
                    <label className="text-sm font-black text-blue-800 dark:text-blue-400 whitespace-nowrap flex items-center gap-2">
                        <BookOpen size={20} /> Clonar receta existente:
                    </label>
                    <select
                        className="flex-1 w-full p-3 border border-blue-200 dark:border-slate-700 rounded-xl bg-surface focus:bg-panel transition-colors text-content outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold shadow-inner transition-all"
                        onChange={handleClone}
                        defaultValue=""
                    >
                        <option value="" disabled>Selecciona una receta para copiar su perfil e ingredientes...</option>
                        {recipes.map(r => (
                            <option key={r.id} value={r.id}>{r.name} ({r.category})</option>
                        ))}
                    </select>
                </div>
            )}

            {/* --- ASISTENTE IA --- */}
            {!isEditing && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 p-6 rounded-2xl border border-amber-200 dark:border-amber-800/30 mb-8 shadow-sm">
                    <label className="block text-sm font-black text-amber-800 dark:text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Sparkles size={20} /> 🍺 Generador Cervecero IA
                    </label>
                    <div className="flex flex-col md:flex-row gap-3">
                        <input type="text" placeholder="Ej: Una IPA muy lupulada con notas a mango y 7% ABV" className="flex-1 p-4 border border-amber-200 dark:border-amber-800/50 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-surface focus:bg-panel transition-colors text-content" value={iaPrompt} onChange={e => setIaPrompt(e.target.value)} disabled={isGeneratingIA || isGuest} />
                        <button onClick={handleAIGenerate} disabled={isGeneratingIA || isGuest} title={isGuest ? guestTooltip : undefined} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-w-[220px]">
                            {isGeneratingIA ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />} {isGeneratingIA ? 'Magia en proceso...' : 'Generar Receta'}
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-muted uppercase mb-1">Nombre</label><input type="text" className="w-full p-3 border border-line rounded-xl bg-surface outline-none focus:ring-2 focus:ring-amber-500 text-content" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                    <div><label className="block text-xs font-bold text-muted uppercase mb-1">Estilo</label><input type="text" className="w-full p-3 border border-line rounded-xl bg-surface outline-none focus:ring-2 focus:ring-amber-500 text-content" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} /></div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-muted uppercase mb-1">Descripción / Historia (Opcional)</label>
                    <textarea rows="3" className="w-full p-3 border border-line rounded-xl bg-surface outline-none focus:ring-2 focus:ring-amber-500 resize-none text-sm text-content" placeholder="Vende tu cerveza con una descripción atractiva..." value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    <div><label className="block text-[10px] font-bold text-muted uppercase">Vol (L)</label><input type="number" className="w-full p-3 border border-line rounded-xl bg-surface focus:bg-panel transition-colors text-content focus:ring-2 focus:ring-blue-500 outline-none" value={formData.targetVolume} onChange={e => setFormData({ ...formData, targetVolume: e.target.value })} /></div>
                    <div><label className="block text-[10px] font-bold text-muted uppercase">ABV (%)</label><input type="number" step="0.1" className="w-full p-3 border border-line rounded-xl bg-surface focus:bg-panel transition-colors text-content focus:ring-2 focus:ring-red-500 outline-none" value={formData.abv} onChange={e => setFormData({ ...formData, abv: e.target.value })} /></div>
                    <div><label className="block text-[10px] font-bold text-muted uppercase">D. Orig.</label><input type="number" step="0.001" className="w-full p-3 border border-line rounded-xl bg-surface focus:bg-panel transition-colors text-content focus:ring-2 focus:ring-amber-500 outline-none" value={formData.og} onChange={e => setFormData({ ...formData, og: e.target.value })} /></div>
                    <div><label className="block text-[10px] font-bold text-muted uppercase">D. Final</label><input type="number" step="0.001" className="w-full p-3 border border-line rounded-xl bg-surface focus:bg-panel transition-colors text-content focus:ring-2 focus:ring-emerald-500 outline-none" value={formData.fg} onChange={e => setFormData({ ...formData, fg: e.target.value })} /></div>
                    <div><label className="block text-[10px] font-bold text-orange-500 uppercase">IBU</label><input type="number" className="w-full p-3 border border-line rounded-xl bg-surface focus:bg-panel transition-colors text-content focus:ring-2 focus:ring-orange-500 outline-none" value={formData.ibu} onChange={e => setFormData({ ...formData, ibu: e.target.value })} /></div>
                    <div><label className="block text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase">Color (SRM)</label><input type="number" className="w-full p-3 border border-line rounded-xl bg-surface focus:bg-panel transition-colors text-content focus:ring-2 focus:ring-amber-600 outline-none" value={formData.colorSRM} onChange={e => setFormData({ ...formData, colorSRM: e.target.value })} /></div>
                </div>

                <div className="border-t border-line pt-4">
                    <h3 className="font-black text-lg mb-3 text-content flex items-center gap-2"><Wheat size={20} className="text-amber-500" /> Granos (kg)</h3>
                    {formData.malts.map((m, i) => (
                        <div key={i} className="flex gap-2 mb-2 relative">
                            <AutocompleteInput value={m.name} onChange={val => updateArray('malts', i, 'name', val)} placeholder="Buscar malta..." category="Malta" inventory={inventory} onAddNewItem={onAddInventoryItem} />
                            <input type="number" step="0.1" placeholder="Kg" className="w-24 p-3 border border-line rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-surface focus:bg-panel transition-colors text-content" value={m.amount} onChange={e => updateArray('malts', i, 'amount', e.target.value)} />
                        </div>
                    ))}
                    <button onClick={() => setFormData({ ...formData, malts: [...formData.malts, { name: '', amount: 0 }] })} className="text-sm text-amber-600 font-bold hover:text-amber-800 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 rounded-lg mt-1">+ Añadir fila</button>
                </div>

                <div className="border-t border-line pt-4">
                    <h3 className="font-black text-lg mb-3 text-content flex items-center gap-2"><Leaf size={20} className="text-green-500" /> Lúpulos (g)</h3>
                    {formData.hops.map((h, i) => (
                        <div key={i} className="flex gap-2 mb-2 relative flex-wrap md:flex-nowrap">
                            <AutocompleteInput value={h.name} onChange={val => updateArray('hops', i, 'name', val)} placeholder="Buscar lúpulo..." category="Lúpulo" inventory={inventory} onAddNewItem={onAddInventoryItem} />
                            <input type="number" placeholder="Gramos" className="w-20 p-3 border border-line rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 bg-surface focus:bg-panel transition-colors text-content" value={h.amount} onChange={e => updateArray('hops', i, 'amount', e.target.value)} />
                            <input type="text" placeholder="Minutos (Ej: 60)" className="w-32 p-3 border border-line rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 bg-surface focus:bg-panel transition-colors text-content" value={h.time} onChange={e => updateArray('hops', i, 'time', e.target.value)} />
                            <input type="text" placeholder="Uso (Ej: Hervor, DH)" className="w-32 p-3 border border-line rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-surface focus:bg-panel transition-colors text-content" value={h.use || h.stage || ''} onChange={e => updateArray('hops', i, 'use', e.target.value)} />
                            <select className="flex-1 p-3 border border-line rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 bg-surface focus:bg-panel transition-colors text-content" value={h.phase || 'cooking'} onChange={e => updateArray('hops', i, 'phase', e.target.value)}>
                                <option value="cooking">F. Cocción</option>
                                <option value="fermenting">F. Fermentación</option>
                            </select>
                        </div>
                    ))}
                    <button onClick={() => setFormData({ ...formData, hops: [...formData.hops, { name: '', amount: 0, time: '', use: 'Hervor', phase: 'cooking' }] })} className="text-sm text-green-600 font-bold hover:text-green-800 bg-green-50 dark:bg-green-900/30 px-3 py-2 rounded-lg mt-1">+ Añadir fila</button>
                </div>

                <div className="border-t border-line pt-4">
                    <h3 className="font-black text-lg mb-3 text-content flex items-center gap-2"><Sparkles size={20} className="text-purple-500" /> Sales y Aditivos</h3>
                    {(formData.others || []).map((o, i) => (
                        <div key={i} className="flex gap-2 mb-2 relative flex-wrap md:flex-nowrap">
                            <AutocompleteInput value={o.name} onChange={val => updateArray('others', i, 'name', val)} placeholder="Buscar sal o clarificante..." category={o.category || "Aditivos"} inventory={inventory} onAddNewItem={onAddInventoryItem} />
                            <input type="number" step="0.1" placeholder="Cant." className="w-20 p-3 border border-line rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-surface focus:bg-panel transition-colors text-content" value={o.amount || ''} onChange={e => updateArray('others', i, 'amount', e.target.value)} />
                            <select className="w-24 p-3 border border-line rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-surface focus:bg-panel transition-colors text-content" value={o.unit || 'g'} onChange={e => updateArray('others', i, 'unit', e.target.value)}>
                                <option value="g">g</option>
                                <option value="kg">kg</option>
                                <option value="ml">ml</option>
                                <option value="pastilla">u</option>
                            </select>
                            <select className="flex-1 min-w-[140px] p-3 border border-line rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-surface focus:bg-panel transition-colors text-content" value={o.phase || 'cooking'} onChange={e => updateArray('others', i, 'phase', e.target.value)}>
                                <option value="cooking">En Cocción</option>
                                <option value="fermenting">En Fermentación</option>
                                <option value="bottling">En Embotellado / Barril</option>
                            </select>
                            <button type="button" onClick={() => removeArrayItem('others', i)} className="text-gray-400 hover:text-red-500 px-2 flex-shrink-0"><Trash2 size={18} /></button>
                        </div>
                    ))}
                    <button onClick={() => setFormData({ ...formData, others: [...(formData.others || []), { name: '', amount: 0, unit: 'g', phase: 'cooking', category: 'Aditivos' }] })} className="text-sm text-purple-600 font-bold hover:text-purple-800 bg-purple-50 dark:bg-purple-900/30 px-3 py-2 rounded-lg mt-1">+ Añadir fila</button>
                </div>

                <div className="border-t border-line pt-4 grid md:grid-cols-3 gap-4">
                    <div className="col-span-1 relative">
                        <label className="block text-xs font-bold text-muted uppercase mb-1">Levadura</label>
                        <AutocompleteInput value={formData.yeast} onChange={val => setFormData({ ...formData, yeast: val })} placeholder="Buscar..." category="Levadura" inventory={inventory} onAddNewItem={onAddInventoryItem} />
                    </div>
                    <div><label className="block text-xs font-bold text-muted uppercase mb-1">Maceración (L)</label><input type="number" className="w-full p-3 border border-line rounded-xl bg-white text-content outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800" value={formData.strike} onChange={e => setFormData({ ...formData, strike: e.target.value })} /></div>
                    <div><label className="block text-xs font-bold text-muted uppercase mb-1">Lavado (L)</label><input type="number" className="w-full p-3 border border-line rounded-xl bg-white text-content outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800" value={formData.sparge} onChange={e => setFormData({ ...formData, sparge: e.target.value })} /></div>
                </div>

                <div className="border-t border-line pt-4 bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-2xl mt-4 border border-blue-100 dark:border-blue-800/30">
                    <h3 className="font-black text-lg mb-3 text-blue-900 dark:text-blue-400 flex items-center gap-2"><Droplets size={20} /> Perfil Agua Objetivo (ppm)</h3>
                    <div className="grid grid-cols-5 gap-2 md:gap-4">
                        {['Ca', 'Mg', 'SO4', 'Cl', 'HCO3'].map((ion) => (
                            <div key={ion}>
                                <label className="block text-[10px] font-bold text-muted uppercase mb-1 text-center">{ion}</label>
                                <input type="number" className="w-full p-3 border border-line rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500 text-center dark:bg-slate-800 text-content" value={formData.waterProfile?.[ion] || 0} onChange={e => setFormData({ ...formData, waterProfile: { ...formData.waterProfile, [ion]: e.target.value } })} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* NUEVO: CREADOR DE PROCESO (PASOS) */}
                <div className="border-t border-line pt-6">
                    <h3 className="font-black text-lg mb-4 text-content flex items-center gap-2"><ListOrdered size={20} className="text-purple-500" /> Pasos de Producción</h3>
                    {formData.steps.map((step, i) => (
                        <div key={i} className="bg-surface p-5 rounded-2xl border border-line mb-4 relative">
                            <button type="button" onClick={() => removeArrayItem('steps', i)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                            <div className="grid md:grid-cols-4 gap-3 mb-3">
                                <div className="md:col-span-2"><label className="block text-[10px] font-bold text-muted uppercase mb-1">Título</label><input type="text" className="w-full p-3 border border-line rounded-xl outline-none bg-white text-content dark:bg-slate-900 focus:ring-2 focus:ring-purple-500" value={step.title} onChange={e => updateArray('steps', i, 'title', e.target.value)} /></div>
                                <div><label className="block text-[10px] font-bold text-muted uppercase mb-1">Duración (M/D/H)</label><input type="text" placeholder="Ej: 60M, 7D" className="w-full p-3 border border-line rounded-xl outline-none bg-white text-content dark:bg-slate-900 focus:ring-2 focus:ring-purple-500" value={step.duration || ''} onChange={e => updateArray('steps', i, 'duration', e.target.value)} /></div>
                                <div>
                                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Etapa Gral.</label>
                                    <select className="w-full p-3 border border-line rounded-xl outline-none bg-white text-content dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 text-sm" value={step.phase || 'cooking'} onChange={e => updateArray('steps', i, 'phase', e.target.value)}>
                                        <option value="cooking">Cocción</option>
                                        <option value="fermenting">Fermentación</option>
                                        <option value="bottling">Embotellado</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mb-3"><label className="block text-[10px] font-bold text-muted uppercase mb-1">Descripción Breve</label><input type="text" className="w-full p-3 border border-line rounded-xl outline-none bg-white text-content dark:bg-slate-900 focus:ring-2 focus:ring-purple-500" value={step.desc} onChange={e => updateArray('steps', i, 'desc', e.target.value)} /></div>
                            <div><label className="block text-[10px] font-bold text-muted uppercase mb-1">Detalle Técnico</label><textarea rows="2" className="w-full p-3 border border-line rounded-xl outline-none bg-white text-content dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 resize-none" value={step.details || ''} onChange={e => updateArray('steps', i, 'details', e.target.value)} /></div>
                        </div>
                    ))}
                    <button onClick={() => setFormData({ ...formData, steps: [...formData.steps, { id: Date.now(), title: '', desc: '', details: '', duration: 0, phase: 'cooking' }] })} className="text-sm text-purple-600 font-bold hover:text-purple-800 bg-purple-50 dark:bg-purple-900/30 px-4 py-2 rounded-xl mt-1 flex items-center gap-2"><Plus size={16} /> Añadir Paso</button>
                </div>

                <div className="border-t border-line pt-6">
                    <h3 className="font-black text-lg mb-4 text-content flex items-center gap-2"><Info size={20} className="text-yellow-500" /> Tips de Elaboración</h3>
                    {formData.tips.map((tip, i) => (
                        <div key={i} className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-2xl border border-yellow-200 dark:border-yellow-900/30 mb-3 relative flex flex-col gap-3">
                            <button type="button" onClick={() => removeArrayItem('tips', i)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                            <input type="text" placeholder="Concepto (Ej: Control pH)" className="w-[90%] p-3 border border-line text-content rounded-xl text-sm outline-none bg-surface focus:bg-panel transition-colors focus:ring-2 focus:ring-yellow-500" value={tip.title} onChange={e => updateArray('tips', i, 'title', e.target.value)} />
                            <textarea rows="2" placeholder="Explicación..." className="w-full p-3 border border-line text-content rounded-xl text-sm outline-none bg-surface focus:bg-panel transition-colors focus:ring-2 focus:ring-yellow-500 resize-none" value={tip.desc} onChange={e => updateArray('tips', i, 'desc', e.target.value)} />
                        </div>
                    ))}
                    <button onClick={() => setFormData({ ...formData, tips: [...formData.tips, { title: '', desc: '' }] })} className="text-sm text-yellow-600 font-bold bg-yellow-50 dark:bg-yellow-900/30 px-4 py-2 rounded-xl mt-1 flex items-center gap-2"><Plus size={16} /> Añadir Tip</button>
                </div>

                {isEditing && (
                    <div className="border-t border-line pt-6">
                        <label className="block text-sm font-bold text-muted  uppercase tracking-wider mb-2">Nota de Modificación (Opcional)</label>
                        <input type="text" placeholder="Ej: Cambié el lúpulo Citra por Mosaic para probar." className="w-full p-4 border border-line rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-surface text-content" value={modNote} onChange={e => setModNote(e.target.value)} />
                    </div>
                )}

                <button
                    onClick={() => { if (!isGuest) handleSave(); else alert(guestTooltip); }}
                    disabled={isGuest}
                    title={isGuest ? guestTooltip : undefined}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white p-5 rounded-2xl font-black text-xl flex justify-center items-center gap-3 mt-8 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                    <Save size={28} /> {isEditing ? 'Guardar Obra Maestra' : 'Registrar Nueva Receta'}
                </button>
            </div>
        </div>
    );
}
