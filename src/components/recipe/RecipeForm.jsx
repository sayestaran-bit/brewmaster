// /src/components/recipe/RecipeForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles, Loader2, Wand2, Wheat, Leaf, Droplets, ListOrdered, Trash2, Plus, Info, Save, BookOpen, Thermometer, Activity, CheckCircle2, Beaker, Link, Check, Package, AlertTriangle } from 'lucide-react';

import AutocompleteInput from '../common/AutocompleteInput';
import { useRecipes } from '../../hooks/useRecipes';
import { useInventory } from '../../hooks/useInventory';
import { useEquipment } from '../../hooks/useEquipment';
import { getFormattedDate } from '../../utils/formatters';
import { getRecipeAdvice, callGemini } from '../../services/gemini';
import { getEffectivePhase, BREWING_STAGES, TIME_UNITS, getSafeAdditionTime, isCountdownStage, calculateRequiredSalts } from '../../utils/recipeUtils';
import { generateRecipeDiff } from '../../utils/recipeDiff';
import { sanitizeRecipeForSaving } from '../../utils/helpers';
import { calculateWater } from '../../utils/brewMath';
import { useAuth } from '../../context/AuthContext';
import { Lock, Settings, FileSearch } from 'lucide-react';
import { processRecipeFile } from '../../utils/importRecipe';
import { useToast } from '../../context/ToastContext';

export default function RecipeForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const isGuest = false; // Deshabilitado temporalmente para pruebas locales: currentUser?.isAnonymous;
    const guestTooltip = "Regístrate para crear recetas ilimitadas y más!";
    const { recipes, addRecipe, updateRecipe } = useRecipes();
    const { addToast } = useToast();
    const { inventory, addItem } = useInventory();
    const { equipment } = useEquipment();

    const isEditing = !!id;
    const [initialData, setInitialData] = useState(null);

    const [isGeneratingIA, setIsGeneratingIA] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [iaPrompt, setIaPrompt] = useState("");
    const [modNote, setModNote] = useState('');

    const defaultEmptyState = {
        name: '', description: '', targetVolume: 20, 
        family: 'Ale', style: 'IPA', subStyle: 'Hazy IPA',
        og: 1.050, fg: 1.010, abv: 5.0, ibu: 30, colorSRM: 5,
        malts: [{ name: '', amount: 0 }],
        hops: [{ name: '', amount: 0, time: '', unit: 'm', use: 'Hervor', phase: 'cooking' }],
        others: [],
        yeast: '', strike: 15, sparge: 15,
        fermentationDays: '14D',
        equipmentId: '',
        waterProfile: { Ca: 100, Mg: 10, SO4: 100, Cl: 100, HCO3: 50 },
        tapWaterProfile: { Ca: 20, Mg: 5, SO4: 20, Cl: 20, HCO3: 20 },
        isPublic: false,
        skippedStages: [], // IDs of stages to skip
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
                    family: found.family || (found.category?.toLowerCase().includes('lager') ? 'Lager' : 'Ale'),
                    style: found.style || found.category || 'IPA',
                    subStyle: found.subStyle || found.category || 'Hazy IPA',
                    description: found.description || '',
                    abv: found.abv || 5.0,
                    og: found.og || 1.050,
                    fg: found.fg || 1.010,
                    ibu: found.ibu || 0,
                    colorSRM: found.colorSRM || 0,
                    targetVolume: found.targetVolume || 20,
                    malts: (found.ingredients?.malts || []).length > 0 
                        ? found.ingredients.malts.map(m => ({ ...m, name: m.name?.name || m.name || '', unit: m.unit || 'kg' })) 
                        : [{ name: '', amount: '', unit: 'kg' }],
                    hops: (found.ingredients?.hops || []).length > 0 
                        ? found.ingredients.hops.map(h => ({ ...h, name: h.name?.name || h.name || '', unit: h.unit || 'g', time: h.time || '', timeUnit: h.timeUnit || 'm' })) 
                        : [{ name: '', amount: '', unit: 'g', time: '', timeUnit: 'm', phase: 'cooking' }],
                    others: (found.ingredients?.others || []).length > 0 
                        ? found.ingredients.others.map(o => ({ ...o, name: o.name?.name || o.name || '' })) 
                        : [],
                    yeast: found.ingredients?.yeast?.name || found.ingredients?.yeast || '',
                    equipmentId: found.equipmentId || '',
                    strike: found.ingredients?.water?.strike || 15,
                    sparge: found.ingredients?.water?.sparge || 15,
                    waterProfile: found.waterProfile || { Ca: 100, Mg: 10, SO4: 100, Cl: 100, HCO3: 50 },
                    tapWaterProfile: found.tapWaterProfile || { Ca: 20, Mg: 5, SO4: 20, Cl: 20, HCO3: 20 },
                    isPublic: found.isPublic || false,
                    skippedStages: Array.isArray(found.skippedStages) ? Array.from(new Set(found.skippedStages)) : [],
                    modifications: found.modifications || [],
                    steps: (found.steps || []).length > 0
                        ? found.steps.map(s => ({ 
                            ...s, 
                            id: s.id || (Date.now() + Math.random()), 
                            stageId: s.stageId || s.id || (s.phase === 'fermenting' ? 'fermenting' : 'mashing'),
                            timeUnit: s.timeUnit || 'm' 
                        }))
                        : [{ id: Date.now(), title: '', desc: '', phase: 'cooking', stageId: 'mashing' }],
                    tips: (found.tips || []).length > 0 ? found.tips : []
                });
                setIsInitialized(true);
            }
        }
    }, [id, recipes, isEditing, isInitialized]);

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

    // Cálculos de agua y Alerta de Desbordamiento basados en Perfil de Equipo
    const [overflowDanger, setOverflowDanger] = useState(false);
    
    useEffect(() => {
        if (!formData.equipmentId || !equipment) {
            setOverflowDanger(false);
            return;
        }

        const profile = equipment.find(e => e.id === formData.equipmentId);
        if (!profile) return;

        // 1. Calcular peso total de granos
        const totalGrain = (formData.malts || []).reduce((acc, m) => acc + (parseFloat(m.amount) || 0), 0);
        if (totalGrain <= 0) return;

        // 2. Buscar tiempo de hervor
        const boilStep = (formData.steps || []).find(s => s.stageId === 'boiling');
        const boilTime = boilStep ? (parseFloat(boilStep.duration) || 60) : 60;

        // 3. Ejecutar Cálculos Técnicos Centralizados
        const waterMath = calculateWater({
            targetVolume: parseFloat(formData.targetVolume) || 20,
            boilTime,
            totalGrains: totalGrain,
            equipment: profile
        });

        // 4. Alerta de Desbordamiento: Strike + Volumen del Grano (0.67 L/kg)
        const totalMashVolume = waterMath.strikeWater + (totalGrain * 0.67);
        const isOverflowing = totalMashVolume > (profile.totalVolume || 999);
        
        setOverflowDanger(isOverflowing);

        // Actualizar formData si los cálculos cambian significativamente
        if (Math.abs(waterMath.strikeWater - formData.strike) > 0.1 || Math.abs(waterMath.spargeWater - formData.sparge) > 0.1) {
            setFormData(prev => ({ 
                ...prev, 
                strike: waterMath.strikeWater, 
                sparge: waterMath.spargeWater 
            }));
        }

    }, [formData.equipmentId, formData.malts, formData.targetVolume, formData.steps, equipment]);

    // Autoselección de equipo predeterminado en recetas nuevas
    useEffect(() => {
        if (!isEditing && equipment && equipment.length > 0 && !formData.equipmentId) {
            const defaultProfile = equipment.find(e => e.isDefault);
            if (defaultProfile) {
                setFormData(prev => ({ ...prev, equipmentId: defaultProfile.id }));
            }
        }
    }, [equipment, isEditing, formData.equipmentId]);

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
                family: recipeToClone.family || 'Ale',
                style: recipeToClone.style || recipeToClone.category || 'IPA',
                subStyle: recipeToClone.subStyle || recipeToClone.category || 'Hazy IPA',
                category: recipeToClone.category || recipeToClone.style || 'IPA',
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
                skippedStages: recipeToClone.skippedStages || [],
                steps: Array.isArray(recipeToClone.steps) ? [...recipeToClone.steps].map((s, i) => ({ ...s, id: Date.now() + i })) : [],
                tips: Array.isArray(recipeToClone.tips) ? [...recipeToClone.tips] : [],
                modifications: []
            }));
        }
    };

    const handleImportFile = async (file) => {
        try {
            const imported = await processRecipeFile(file);
            
            // Normalize imported data to ensure it fits the form state
            const normalized = {
                ...defaultEmptyState,
                ...imported,
                malts: (imported.malts || []).length > 0 ? imported.malts : [{ name: '', amount: 0 }],
                hops: (imported.hops || []).length > 0 ? imported.hops : [{ name: '', amount: 0, time: '', unit: 'g', use: 'Hervor', phase: 'cooking' }],
                steps: imported.steps || defaultEmptyState.steps
            };

            setFormData(prev => ({ ...prev, ...normalized }));
            addToast("Archivo importado correctamente. Revisa los pasos técnicos.", "success");
        } catch (err) {
            console.error("Error al importar archivo:", err);
            addToast("Error al importar: " + err.message, "error");
        }
    };

    const handleAIGenerate = async () => {
        if (!iaPrompt.trim()) return addToast("Por favor, describe la cerveza que deseas generar.", "info");
        setIsGeneratingIA(true);
        try {
            const systemInstruction = `Eres un Maestro Cervecero experto. Genera una receta de cerveza funcional y profesional.
            IMPORTANTE: La receta DEBE seguir estrictamente un roadmap de 9 etapas con los IDs exactos: 'milling', 'mashing', 'sparging', 'boiling', 'whirlpool', 'cooling', 'fermenting', 'maturing', 'bottling'.
            Cada ingrediente (malts, hops, others) DEBE tener un campo 'stepId' que coincida con uno de estos 9 IDs para que el sistema sepa cuándo mostrarlo.
            Responde ÚNICAMENTE con un JSON válido.`;
            
            const prompt = `Genera una receta profesional para: "${iaPrompt}".
            Estructura JSON requerida:
            {
              "name": "Nombre",
              "family": "Ale/Lager",
              "style": "Estilo",
              "subStyle": "Sub-estilo",
              "category": "Estilo (para agrupación)",
              "description": "Historia creativa",
              "targetVolume": 20,
              "og": 1.050, "fg": 1.010, "abv": 5.0, "ibu": 30, "colorSRM": 5,
              "malts": [{"name": "Pilsen", "amount": 5, "stepId": "mashing"}],
              "hops": [{"name": "Citra", "amount": 30, "time": 15, "unit": "g", "stepId": "boiling"}],
              "others": [{"name": "Irish Moss", "amount": 5, "unit": "g", "stepId": "boiling"}],
              "yeast": {"name": "US-05", "amount": 1, "unit": "sobre", "stepId": "fermenting"},
              "steps": [
                {"id": "milling", "stageId": "milling", "title": "Molienda", "duration": 15, "timeUnit": "m", "phase": "cooking"},
                {"id": "mashing", "stageId": "mashing", "title": "Maceración", "duration": 60, "timeUnit": "m", "phase": "cooking"},
                {"id": "sparging", "stageId": "sparging", "title": "Lavado", "duration": 30, "timeUnit": "m", "phase": "cooking"},
                {"id": "boiling", "stageId": "boiling", "title": "Cocción", "duration": 60, "timeUnit": "m", "phase": "cooking"},
                {"id": "whirlpool", "stageId": "whirlpool", "title": "Whirlpool", "duration": 20, "timeUnit": "m", "phase": "cooking"},
                {"id": "cooling", "stageId": "cooling", "title": "Enfriado", "duration": 30, "timeUnit": "m", "phase": "cooking"},
                {"id": "fermenting", "stageId": "fermenting", "title": "Fermentación", "duration": 7, "timeUnit": "d", "phase": "fermenting"},
                {"id": "maturing", "stageId": "maturing", "title": "Maduración", "duration": 7, "timeUnit": "d", "phase": "fermenting"},
                {"id": "bottling", "stageId": "bottling", "title": "Envasado", "duration": 60, "timeUnit": "m", "phase": "bottling"}
              ]
            }`;

            // VUL-007 FIX: callGemini(prompt, systemInstruction, isJson) — pasar args posicionalmente
            const responseJSON = await callGemini(prompt, systemInstruction, true);

            // Extracción robusta de JSON mediante Regex (Soporta ruido de Gemini)
            const jsonMatch = responseJSON.match(/\{[\s\S]*\}/);
            let parsed = null;
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else if (typeof responseJSON === 'object') {
                parsed = responseJSON;
            } else {
                throw new Error("No se pudo extraer una estructura de receta válida de la respuesta.");
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
            addToast("Error con la IA al generar la receta.", "error");
        } finally {
            setIsGeneratingIA(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name) return addToast("Ponle un nombre a tu receta.", "warning");
        if (isSaving) return;

        setIsSaving(true);
        try {

        const recipeData = {
            family: formData.family,
            style: formData.style,
            subStyle: formData.subStyle,
            category: formData.subStyle || formData.style, // Legacy support
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
            tapWaterProfile: {
                Ca: Number(formData.tapWaterProfile?.Ca || 0), Mg: Number(formData.tapWaterProfile?.Mg || 0),
                SO4: Number(formData.tapWaterProfile?.SO4 || 0), Cl: Number(formData.tapWaterProfile?.Cl || 0),
                HCO3: Number(formData.tapWaterProfile?.HCO3 || 0)
            },
            ingredients: {
                malts: formData.malts.filter(m => m.name !== '').map(m => ({
                    ...m,
                    unit: 'kg',
                    amount: Number(m.amount),
                    phase: 'cooking',
                    additionTime: getSafeAdditionTime(m, formData.steps.find(s => s.id === m.stepId))
                })),
                hops: formData.hops.filter(h => h.name !== '').map(h => ({
                    ...h,
                    unit: 'g',
                    amount: Number(h.amount),
                    phase: h.phase || getEffectivePhase(h),
                    additionTime: getSafeAdditionTime(h, formData.steps.find(s => s.id === h.stepId))
                })),
                others: (formData.others || []).filter(o => o.name !== '').map(o => ({
                    ...o,
                    amount: Number(o.amount),
                    unit: o.unit || 'g',
                    phase: o.phase || getEffectivePhase(o),
                    additionTime: getSafeAdditionTime(o, formData.steps.find(s => s.id === o.stepId))
                })),
                yeast: { 
                    name: formData.yeast || "Levadura Genérica", 
                    amount: 1, 
                    unit: formData.yeastUnit || "sobre",
                    inventoryId: formData.yeastInventoryId || null,
                    category: formData.yeastCategory || "Levadura"
                },
                water: { strike: Number(formData.strike), sparge: Number(formData.sparge) }
            },
            steps: formData.steps.filter(s => {
                const hasTitle = s.title && s.title.trim() !== '';
                const hasIngredients = 
                    formData.malts.some(m => m.stepId === s.id && m.name !== '') ||
                    formData.hops.some(h => h.stepId === s.id && h.name !== '') ||
                    (formData.others || []).some(o => o.stepId === s.id && o.name !== '');
                return hasTitle || hasIngredients;
            }).map(s => ({
                ...s,
                id: s.id || Date.now() + Math.random(),
                title: s.title || "Paso Técnico", // Fallback title
                phase: s.phase || getEffectivePhase(s)
            })),
            tips: formData.tips.filter(t => t.title !== ''),
            fermentationDays: formData.fermentationDays || '14D',
            equipmentId: formData.equipmentId || '',
            isPublic: !!formData.isPublic,
            skippedStages: Array.from(new Set(formData.skippedStages || [])),
            modifications: [...(formData.modifications || [])]
        };

        // 1. Sanitización Pre-Diff para asegurar comparación limpia
        const cleanForDiff = sanitizeRecipeForSaving(recipeData);

        // 2. Detección de Cambios Técnicos
        const { hasChanges, changes, diffStrings } = isEditing 
            ? generateRecipeDiff(initialData, cleanForDiff) 
            : { hasChanges: true, changes: {}, diffStrings: [] };

        // 2. UX: Evitar entradas vacías en el historial si no hay cambios reales
        if (isEditing && !hasChanges) {
            addToast("No se detectaron cambios técnicos relevantes para guardar.", "info");
            setIsSaving(false);
            return;
        }

        // 4. Inyectar Modificación si es edición
        if (isEditing) {
            const newMod = {
                timestamp: Date.now(),
                author: currentUser?.displayName || currentUser?.email || 'Productor',
                authorId: currentUser?.uid || 'anonymous',
                note: modNote.trim() || diffStrings.join(', ').substring(0, 100) || "Edición técnica.",
                changes: changes
            };
            recipeData.modifications = [newMod, ...recipeData.modifications];
        }

        if (isEditing) {
            await updateRecipe(formData.id, recipeData);
            setModNote('');
            navigate(`/recipes/${formData.id}`);
        } else {
            await addRecipe(recipeData);
            setModNote('');
            navigate('/recipes');
        }
    } catch (error) {
        console.error("Error guardando receta:", error);
        addToast("No se pudo guardar la receta.", "error");
    } finally {
        setIsSaving(false);
    }
};

    const handleCancel = () => {
        if (isEditing) navigate(`/recipes/${id}`);
        else navigate('/recipes');
    };

    const updateArray = (arrayName, idx, field, value) => {
        setFormData(prev => {
            const newArr = [...prev[arrayName]];
            
            // Si el valor es un objeto (viene del AutocompleteInput) y estamos actualizando el nombre
            if (field === 'name' && typeof value === 'object' && value !== null) {
                newArr[idx] = { 
                    ...newArr[idx], 
                    name: value.name, 
                    inventoryId: value.id,
                    category: value.category,
                    unit: value.unit || (arrayName === 'malts' ? 'kg' : 'g')
                };
            } else {
                newArr[idx] = { ...newArr[idx], [field]: value };
            }
            
            return { ...prev, [arrayName]: newArr };
        });
    };

    const removeArrayItem = (arrayName, idx) => {
        setFormData(prev => {
            const newArr = prev[arrayName].filter((_, i) => i !== idx);
            return { ...prev, [arrayName]: newArr };
        });
    };

    const steps = [
        { id: 1, title: 'Perfil General', icon: <Info size={18} /> },
        { id: 2, title: 'Producción (Cocción)', icon: <Thermometer size={18} /> },
        { id: 3, title: 'Bodega (Ferm/Mad)', icon: <Activity size={18} /> },
        { id: 4, title: 'Envasado', icon: <Package size={18} /> },
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

            {/* Step Indicator - Premium Refinement */}
            <div className="hidden md:flex justify-between mb-10 gap-4">
                {steps.map((s) => (
                    <div
                        key={s.id}
                        className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300 ${activeStep === s.id ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/5 text-amber-500 translate-y-[-2px]' :
                            activeStep > s.id ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' :
                                'bg-surface border-line text-muted opacity-60'
                            }`}
                    >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${activeStep === s.id ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' :
                            activeStep > s.id ? 'bg-emerald-500 text-white' : 'bg-line text-muted'
                            }`}>
                            {activeStep > s.id ? <CheckCircle2 size={16} /> : s.id}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{s.title}</span>
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
                                    <Sparkles size={20} /> Generador IA & Importar
                                </label>
                                <div className="flex flex-col md:flex-row gap-3">
                                    <input type="text" placeholder="Ej: Una IPA muy lupulada..." className="flex-1 p-4 border border-line rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-surface text-content" value={iaPrompt} onChange={e => setIaPrompt(e.target.value)} disabled={isGeneratingIA || isGuest} />
                                    <button onClick={handleAIGenerate} disabled={isGeneratingIA || isGuest} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition-all min-w-[200px]">
                                        {isGeneratingIA ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />} {isGeneratingIA ? 'Generando...' : 'IA Generate'}
                                    </button>
                                    <label className="flex items-center justify-center gap-2 px-6 py-4 bg-surface border-2 border-dashed border-line rounded-xl cursor-pointer hover:border-amber-500 hover:text-amber-500 transition-all text-sm font-black uppercase">
                                        <Plus size={20} /> Importar XML/JSON
                                        <input type="file" accept=".xml,.json,.beerxml" className="hidden" onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) handleImportFile(file);
                                        }} />
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="grid md:grid-cols-1 gap-6">
                            <div className="flex flex-col gap-3">
                                <label className="block text-[10px] font-black text-muted uppercase tracking-[0.2em]">Nombre de la Receta</label>
                                <input type="text" placeholder="Ej: Mi Hazy IPA Galáctica" className="w-full p-5 border border-line rounded-2xl bg-surface text-content outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 font-black text-xl transition-all shadow-inner" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="flex flex-col gap-3">
                                <label className="block text-[10px] font-black text-muted uppercase tracking-[0.2em]">Familia</label>
                                <select 
                                    className="w-full p-5 border border-line rounded-2xl bg-surface text-content outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 font-bold transition-all shadow-inner appearance-none cursor-pointer"
                                    value={formData.family} 
                                    onChange={e => setFormData({ ...formData, family: e.target.value })}
                                >
                                    <option value="Ale">Ale (Alta Fermentación)</option>
                                    <option value="Lager">Lager (Baja Fermentación)</option>
                                    <option value="Mixta">Mixta / Espontánea</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-3">
                                <label className="block text-[10px] font-black text-muted uppercase tracking-[0.2em]">Estilo Base</label>
                                <input type="text" placeholder="Ej: IPA" className="w-full p-5 border border-line rounded-2xl bg-surface text-content outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 font-bold transition-all shadow-inner" value={formData.style} onChange={e => setFormData({ ...formData, style: e.target.value })} />
                            </div>
                            <div className="flex flex-col gap-3">
                                <label className="block text-[10px] font-black text-muted uppercase tracking-[0.2em]">Sub-Estilo</label>
                                <input type="text" placeholder="Ej: Hazy IPA" className="w-full p-5 border border-line rounded-2xl bg-surface text-content outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 font-bold transition-all shadow-inner" value={formData.subStyle} onChange={e => setFormData({ ...formData, subStyle: e.target.value })} />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <label className="block text-[10px] font-black text-muted uppercase tracking-[0.2em]">Descripción o Reseña Histórica</label>
                            <textarea rows="3" placeholder="Describe la inspiración detrás de esta creación..." className="w-full p-5 border border-line rounded-2xl bg-surface text-content outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 resize-none transition-all leading-relaxed font-medium shadow-inner" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 bg-surface/50 p-6 rounded-[2.5rem] border border-line shadow-inner">
                            <div className="flex flex-col gap-2.5"><label className="block text-[10px] font-black text-muted uppercase text-center tracking-widest">Vol (L)</label><input type="number" className="w-full p-4 border border-line rounded-xl bg-panel text-content text-center font-black text-lg focus:ring-2 focus:ring-blue-500/30 outline-none" value={formData.targetVolume} onChange={e => setFormData({ ...formData, targetVolume: e.target.value })} /></div>
                            <div className="flex flex-col gap-2.5"><label className="block text-[10px] font-black text-muted uppercase text-center tracking-widest">ABV (%)</label><input type="number" step="0.1" className="w-full p-4 border border-line rounded-xl bg-panel text-content text-center font-black text-lg focus:ring-2 focus:ring-emerald-500/30 outline-none" value={formData.abv} onChange={e => setFormData({ ...formData, abv: e.target.value })} /></div>
                            <div className="flex flex-col gap-2.5"><label className="block text-[10px] font-black text-muted uppercase text-center tracking-widest">D. Orig.</label><input type="number" step="0.001" className="w-full p-4 border border-line rounded-xl bg-panel text-content text-center font-black text-lg focus:ring-2 focus:ring-blue-500/30 outline-none" value={formData.og} onChange={e => setFormData({ ...formData, og: e.target.value })} /></div>
                            <div className="flex flex-col gap-2.5"><label className="block text-[10px] font-black text-muted uppercase text-center tracking-widest">D. Final</label><input type="number" step="0.001" className="w-full p-4 border border-line rounded-xl bg-panel text-content text-center font-black text-lg focus:ring-2 focus:ring-blue-500/30 outline-none" value={formData.fg} onChange={e => setFormData({ ...formData, fg: e.target.value })} /></div>
                            <div className="flex flex-col gap-2.5"><label className="block text-[10px] font-black text-orange-500 uppercase text-center tracking-widest">IBU</label><input type="number" className="w-full p-4 border border-line rounded-xl bg-panel text-content text-center font-black text-lg focus:ring-2 focus:ring-orange-500/30 outline-none" value={formData.ibu} onChange={e => setFormData({ ...formData, ibu: e.target.value })} /></div>
                            <div className="flex flex-col gap-2.5"><label className="block text-[10px] font-black text-amber-500 uppercase text-center tracking-widest">SRM</label><input type="number" className="w-full p-4 border border-line rounded-xl bg-panel text-content text-center font-black text-lg focus:ring-2 focus:ring-amber-500/30 outline-none" value={formData.colorSRM} onChange={e => setFormData({ ...formData, colorSRM: e.target.value })} /></div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="border border-line p-6 rounded-2xl bg-surface/30">
                                <h4 className="font-black text-xs text-blue-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Droplets size={16} /> Agua Base (Red / Destilada)</h4>
                                <div className="grid grid-cols-5 gap-3">
                                    {['Ca', 'Mg', 'SO4', 'Cl', 'HCO3'].map(ion => (
                                        <div key={ion} className="flex flex-col gap-2">
                                            <label className="block text-[10px] font-bold text-muted uppercase text-center">{ion}</label>
                                            <input type="number" className="w-full p-2 border border-line rounded-xl bg-surface text-content text-center text-xs font-bold" value={formData.tapWaterProfile?.[ion] || 0} onChange={e => setFormData({ ...formData, tapWaterProfile: { ...formData.tapWaterProfile, [ion]: e.target.value } })} />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border border-line p-6 rounded-2xl bg-surface/30">
                                <h4 className="font-black text-xs text-amber-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Sparkles size={16} /> Perfil Objetivo (Deseado)</h4>
                                <div className="grid grid-cols-5 gap-3">
                                    {['Ca', 'Mg', 'SO4', 'Cl', 'HCO3'].map(ion => (
                                        <div key={ion} className="flex flex-col gap-2">
                                            <label className="block text-[10px] font-bold text-muted uppercase text-center">{ion}</label>
                                            <input type="number" className="w-full p-2 border border-line rounded-xl bg-surface text-content text-center text-xs font-bold" value={formData.waterProfile?.[ion] || 0} onChange={e => setFormData({ ...formData, waterProfile: { ...formData.waterProfile, [ion]: e.target.value } })} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Alerta de Desviación > 20% */}
                        {(() => {
                            const result = calculateRequiredSalts(formData.waterProfile, formData.tapWaterProfile, formData.targetVolume || 20);
                            if (!result) return null;
                            
                            const deviations = [];
                            ['Ca', 'Mg', 'SO4', 'Cl'].forEach(ion => {
                                const target = Number(formData.waterProfile[ion]) || 0;
                                const actual = result.finalProfile[ion];
                                if (target > 0) {
                                    const diffPct = Math.abs(actual - target) / target;
                                    if (diffPct > 0.20) {
                                        deviations.push(`${ion}: ${Math.round(actual)} vs ${target} ppm (${Math.round(diffPct * 100)}% dif)`);
                                    }
                                } else if (actual > 5) { // Si el objetivo es 0 pero el base ya tiene mucho
                                    deviations.push(`${ion}: El agua base ya supera el objetivo (0 ppm).`);
                                }
                            });

                            if (deviations.length === 0) return (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] font-bold text-emerald-500 flex items-center gap-2 animate-fadeIn">
                                    <CheckCircle2 size={16} /> El perfil objetivo es alcanzable con las sales sugeridas.
                                </div>
                            );

                            return (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-shake">
                                    <div className="flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-widest mb-2">
                                        <AlertTriangle size={18} /> Alerta de Desviación iónica (+20%)
                                    </div>
                                    <p className="text-[10px] text-muted font-bold mb-3">Tu agua base ya contiene más iones de los que requiere el estilo, o la combinación de sales necesaria no permite un ajuste exacto:</p>
                                    <ul className="space-y-1">
                                        {deviations.map((d, i) => <li key={i} className="text-[10px] font-black text-amber-600 dark:text-amber-400 flex items-center gap-2">• {d}</li>)}
                                    </ul>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {activeStep === 2 && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Alerta de Desbordamiento */}
                        {overflowDanger && (
                            <div className="bg-red-500 p-4 rounded-2xl border-4 border-red-600 animate-bounce flex items-center gap-4 text-white shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                                <AlertTriangle size={32} strokeWidth={3} className="shrink-0" />
                                <div>
                                    <h4 className="font-black text-lg uppercase tracking-tighter leading-none">⚠️ PELIGRO DE DESBORDAMIENTO</h4>
                                    <p className="font-bold text-xs opacity-90">El volumen de Strike + Grano supera la capacidad física de tu equipo. Reduce el empaste o el volumen de la receta.</p>
                                </div>
                            </div>
                        )}

                        <div className="bg-panel p-6 rounded-2xl border border-line space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-500/10 p-3 rounded-xl text-blue-500 shadow-sm"><Droplets size={24} /></div>
                                    <div>
                                        <h4 className="text-sm font-black text-content uppercase tracking-widest leading-none mb-1">Configuración de Agua y Equipo</h4>
                                        <p className="text-[10px] text-muted font-bold">Ajusta tu perfil técnico para cálculos precisos.</p>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-2 min-w-[240px]">
                                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Perfil de Equipo</label>
                                    <select 
                                        className="w-full p-3 border border-line rounded-xl bg-surface text-content font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                        value={formData.equipmentId}
                                        onChange={e => setFormData({...formData, equipmentId: e.target.value})}
                                    >
                                        <option value="">Seleccionar Perfil de Equipo...</option>
                                        {(equipment || []).map(e => <option key={e.id} value={e.id}>{e.name} ({e.totalVolume}L)</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-2 border-t border-line/30">
                                <div className="relative">
                                    <label className="block text-[10px] font-black text-muted uppercase mb-1">Maceración (L)</label>
                                    <input 
                                        type="number" 
                                        readOnly={!!formData.equipmentId}
                                        className={`w-24 p-2 border border-line rounded-lg bg-panel text-content text-center font-bold ${formData.equipmentId ? 'opacity-70 cursor-not-allowed' : ''}`} 
                                        value={formData.strike} 
                                        onChange={e => setFormData({ ...formData, strike: e.target.value })} 
                                    />
                                    {formData.equipmentId && (
                                        <div className="absolute -top-1 -right-1 bg-amber-500 text-slate-900 rounded-full p-0.5 shadow-lg border border-panel" title="Calculado automáticamente">
                                            <Lock size={8} />
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <label className="block text-[10px] font-black text-muted uppercase mb-1">Lavado (L)</label>
                                    <input 
                                        type="number" 
                                        readOnly={!!formData.equipmentId}
                                        className={`w-24 p-2 border border-line rounded-lg bg-panel text-content text-center font-bold ${formData.equipmentId ? 'opacity-70 cursor-not-allowed' : ''}`} 
                                        value={formData.sparge} 
                                        onChange={e => setFormData({ ...formData, sparge: e.target.value })} 
                                    />
                                    {formData.equipmentId && (
                                        <div className="absolute -top-1 -right-1 bg-amber-500 text-slate-900 rounded-full p-0.5 shadow-lg border border-panel" title="Calculado automáticamente">
                                            <Lock size={8} />
                                        </div>
                                    )}
                                </div>
                                {formData.equipmentId && (
                                    <div className="flex-1 flex items-end justify-end">
                                        <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest flex items-center gap-1.5 p-2 bg-amber-500/5 rounded-lg border border-amber-500/10 transition-all animate-in fade-in slide-in-from-right duration-300">
                                            <Settings size={12} className="animate-spin-slow" /> Perfil Activo
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {BREWING_STAGES.filter(stage => stage.phase === 'cooking').map((stage) => {
                                const isSkipped = formData.skippedStages.includes(stage.id);
                                const stageSteps = formData.steps.filter(s => s.stageId === stage.id);
                                
                                return (
                                    <div key={stage.id} className={`p-5 rounded-2xl border transition-all ${isSkipped ? 'bg-surface/30 border-dashed opacity-50' : 'bg-surface border-line shadow-sm'}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${isSkipped ? 'bg-slate-700/50 text-slate-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                                    <Thermometer size={20} />
                                                </div>
                                                <div>
                                                    <h3 className={`font-black uppercase tracking-widest ${isSkipped ? 'text-muted line-through' : 'text-content'}`}>{stage.label}</h3>
                                                    <p className="text-[10px] text-muted font-bold italic">{isSkipped ? 'Etapa omitida en esta receta' : `${stageSteps.length} Sub-pasos técnicos`}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        skippedStages: isSkipped 
                                                            ? prev.skippedStages.filter(s => s !== stage.id)
                                                            : [...prev.skippedStages, stage.id]
                                                    }));
                                                }}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${isSkipped ? 'bg-amber-500 text-white' : 'bg-slate-700 text-muted hover:bg-red-500/20 hover:text-red-500'}`}
                                            >
                                                {isSkipped ? 'Habilitar Etapa' : 'Omitir Etapa'}
                                            </button>
                                        </div>

                                        {!isSkipped && (
                                            <div className="space-y-4 pt-2 border-t border-line/50">
                                                {stageSteps.map((step, sIdx) => {
                                                    const globalIdx = formData.steps.indexOf(step);
                                                    return (
                                                        <div key={step.id} className="bg-panel/50 p-4 rounded-xl border border-line/30 relative">
                                                            <button onClick={() => removeArrayItem('steps', globalIdx)} className="absolute top-3 right-3 text-muted hover:text-red-500"><Trash2 size={16} /></button>
                                                            <div className="grid md:grid-cols-[1fr_200px] gap-4 mb-3">
                                                                <input type="text" placeholder="¿Qué se hace en este paso?" className="w-full p-3 border border-line rounded-lg bg-surface text-content font-bold placeholder:text-muted/50" value={step.title} onChange={e => updateArray('steps', globalIdx, 'title', e.target.value)} />
                                                                <div className="flex items-center gap-1 group">
                                                                    <input type="number" placeholder="Tiempo" className="flex-1 min-w-0 p-3 border border-line rounded-l-lg bg-surface text-content font-bold text-center" value={step.duration || ''} onChange={e => updateArray('steps', globalIdx, 'duration', e.target.value)} />
                                                                    <select 
                                                                        className="w-24 p-3 border border-line rounded-r-lg bg-surface text-content text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-amber-500"
                                                                        value={step.timeUnit || 'm'} 
                                                                        onChange={e => updateArray('steps', globalIdx, 'timeUnit', e.target.value)}
                                                                    >
                                                                        {TIME_UNITS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <textarea placeholder="Detalles técnicos (Temperaturas, pH, procedimientos...)" rows="2" className="w-full p-3 border border-line rounded-lg bg-surface text-content text-sm resize-none mb-3" value={step.details || ''} onChange={e => updateArray('steps', globalIdx, 'details', e.target.value)} />
                                                            
                                                            {/* Nested Ingredient Management for this step */}
                                                            <div className="bg-surface/50 p-3 rounded-lg border border-line/30">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="text-[9px] font-black uppercase text-muted tracking-widest flex items-center gap-2"><Package size={12} /> Insumos del paso</span>
                                                                    <div className="flex gap-1">
                                                                        <button onClick={() => setFormData({ ...formData, malts: [...formData.malts, { name: '', amount: 0, unit: 'kg', phase: 'cooking', stepId: step.id, additionTime: 0, additionTimeUnit: 'm', category: 'Malta' }] })} className="p-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded hover:bg-amber-500/20 transition-all" title="+ Malta"><Wheat size={14} /></button>
                                                                        <button onClick={() => setFormData({ ...formData, hops: [...formData.hops, { name: '', amount: 0, time: '', unit: 'g', phase: 'cooking', stepId: step.id, additionTime: 0, additionTimeUnit: 'm', category: 'Lúpulo' }] })} className="p-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded hover:bg-green-500/20 transition-all" title="+ Lúpulo"><Leaf size={14} /></button>
                                                                        <button onClick={() => setFormData({ ...formData, others: [...formData.others, { name: '', amount: 0, unit: 'g', phase: 'cooking', category: 'Sales Minerales', stepId: step.id, additionTime: 0, additionTimeUnit: 'm' }] })} className="p-1 bg-purple-500/10 text-purple-500 rounded hover:bg-purple-500/20 transition-all"><Sparkles size={14} /></button>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    {[
                                                                        ...formData.malts.filter(m => m.stepId === step.id).map(m => ({ ...m, type: 'malta', initialCategory: 'Malta', icon: <Wheat size={14} />, color: 'text-amber-500', bg: 'bg-amber-500/10', globalIdx: formData.malts.indexOf(m), colName: 'malts' })),
                                                                        ...formData.hops.filter(h => h.stepId === step.id).map(h => ({ ...h, type: 'lúpulo', initialCategory: 'Lúpulo', icon: <Leaf size={14} />, color: 'text-green-500', bg: 'bg-green-500/10', globalIdx: formData.hops.indexOf(h), colName: 'hops' })),
                                                                        ...formData.others.filter(o => o.stepId === step.id).map(o => ({ ...o, type: 'aditivo', initialCategory: 'Sales Minerales', icon: <Sparkles size={14} />, color: 'text-purple-500', bg: 'bg-purple-500/10', globalIdx: formData.others.indexOf(o), colName: 'others' }))
                                                                    ].map((ing, i) => (
                                                                            <div key={i} className="flex items-center gap-3 bg-panel p-2 rounded-xl border border-line shadow-sm animate-fadeIn group/ing">
                                                                                <div className={`p-2 rounded-lg ${ing.bg} ${ing.color} shadow-inner`}>{ing.icon}</div>
                                                                                <AutocompleteInput className="flex-1 h-10 text-xs font-bold" value={ing.name} onChange={val => updateArray(ing.colName, ing.globalIdx, 'name', val)} onSelect={item => updateArray(ing.colName, ing.globalIdx, 'unit', item.unit || 'g')} placeholder={`${ing.type}...`} category={ing.category || ing.initialCategory} inventory={inventory} onAddNewItem={onAddInventoryItem} />
                                                                                <div className="flex items-center bg-surface rounded-xl px-2 h-10 border border-line shadow-inner focus-within:ring-2 focus-within:ring-amber-500/20">
                                                                                    <input type="number" className="w-12 bg-transparent text-xs text-center font-black" value={ing.amount} onChange={e => updateArray(ing.colName, ing.globalIdx, 'amount', e.target.value)} />
                                                                                    <span className="text-[9px] font-black text-muted uppercase ml-1 opacity-60">{ing.unit || (ing.type === 'malta' ? 'kg' : 'g')}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-1 bg-surface rounded-xl px-2 h-10 border border-line shadow-inner group relative overflow-visible" title={stage.id === 'boiling' ? "Hervor: 60=Inicio, 0=Flameout" : "Tiempo de adición en este paso"}>
                                                                                    <span className="text-[10px] font-black text-muted uppercase opacity-40">@</span>
                                                                                    <input type="number" placeholder="Ti" className="w-12 bg-transparent text-xs text-center font-black" value={ing.additionTime || ''} onChange={e => updateArray(ing.colName, ing.globalIdx, 'additionTime', e.target.value)} onBlur={e => { if (!e.target.value) updateArray(ing.colName, ing.globalIdx, 'additionTime', isCountdownStage(stage.id) ? (step.duration || 0) : 0) }} />
                                                                                    <select className="bg-transparent text-[10px] font-black text-amber-500 uppercase outline-none cursor-pointer" value={ing.additionTimeUnit || 'm'} onChange={e => updateArray(ing.colName, ing.globalIdx, 'additionTimeUnit', e.target.value)}>
                                                                                        <option value="m">m</option>
                                                                                        <option value="h">h</option>
                                                                                        <option value="d">d</option>
                                                                                    </select>
                                                                                </div>
                                                                                <button 
                                                                                    onClick={() => removeArrayItem(ing.colName, ing.globalIdx)}
                                                                                    className="p-2 text-muted hover:text-red-500 transition-colors opacity-0 group-hover/ing:opacity-100"
                                                                                >
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                            </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <button onClick={() => setFormData({ ...formData, steps: [...formData.steps, { id: Date.now() + Math.random(), title: '', details: '', duration: 0, timeUnit: 'm', phase: 'cooking', stageId: stage.id }] })} className="w-full py-3 border-2 border-dashed border-line/50 rounded-xl text-xs font-black text-muted hover:text-amber-500 hover:border-amber-500/50 transition-all flex items-center justify-center gap-2">
                                                    <Plus size={16} /> Añadir Sub-paso en {stage.label}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeStep === 3 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-panel p-6 rounded-2xl border border-line">
                            <h4 className="font-black text-sm text-purple-500 uppercase tracking-widest flex items-center gap-2 mb-6"><Activity size={18} /> Perfil de Fermentación</h4>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="block text-xs font-bold text-muted uppercase tracking-wider">Levadura Seleccionada</label>
                                    <AutocompleteInput className="w-full h-12" value={formData.yeast} onChange={val => {
                                        if (typeof val === 'object' && val !== null) {
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                yeast: val.name, 
                                                yeastInventoryId: val.id,
                                                yeastCategory: val.category,
                                                yeastUnit: val.unit || 'sobre'
                                            }));
                                        } else {
                                            setFormData(prev => ({ ...prev, yeast: val }));
                                        }
                                    }} category="Levadura" inventory={inventory} onAddNewItem={onAddInventoryItem} placeholder="Ej: SafAle US-05" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="block text-xs font-bold text-muted uppercase tracking-wider">Tiempo Estimado Bodega</label>
                                    <input type="text" className="w-full p-3 border border-line rounded-xl bg-surface text-content font-bold h-12" value={formData.fermentationDays} onChange={e => setFormData({ ...formData, fermentationDays: e.target.value })} placeholder="Ej: 14 Días" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {BREWING_STAGES.filter(stage => stage.phase === 'fermenting').map((stage) => {
                                const isSkipped = formData.skippedStages.includes(stage.id);
                                const stageSteps = formData.steps.filter(s => s.stageId === stage.id);
                                
                                return (
                                    <div key={stage.id} className={`p-5 rounded-2xl border transition-all ${isSkipped ? 'bg-surface/30 border-dashed opacity-50' : 'bg-surface border-line shadow-sm'}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${isSkipped ? 'bg-slate-700/50 text-slate-500' : 'bg-purple-500/20 text-purple-500'}`}>
                                                    <Activity size={20} />
                                                </div>
                                                <div>
                                                    <h3 className={`font-black uppercase tracking-widest ${isSkipped ? 'text-muted line-through' : 'text-content'}`}>{stage.label}</h3>
                                                    <p className="text-[10px] text-muted font-bold italic">{isSkipped ? 'Etapa omitida' : `${stageSteps.length} Sub-pasos en bodega`}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        skippedStages: isSkipped 
                                                            ? prev.skippedStages.filter(s => s !== stage.id)
                                                            : [...prev.skippedStages, stage.id]
                                                    }));
                                                }}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${isSkipped ? 'bg-amber-500 text-white' : 'bg-slate-700 text-muted hover:bg-red-500/20 hover:text-red-500'}`}
                                            >
                                                {isSkipped ? 'Habilitar Etapa' : 'Omitir Etapa'}
                                            </button>
                                        </div>

                                        {!isSkipped && (
                                            <div className="space-y-4 pt-2 border-t border-line/50">
                                                {stageSteps.map((step) => {
                                                    const globalIdx = formData.steps.indexOf(step);
                                                    return (
                                                        <div key={step.id} className="bg-panel/50 p-4 rounded-xl border border-line/30 relative">
                                                            <button onClick={() => removeArrayItem('steps', globalIdx)} className="absolute top-3 right-3 text-muted hover:text-red-500"><Trash2 size={16} /></button>
                                                            <div className="grid md:grid-cols-[1fr_200px] gap-4 mb-3">
                                                                <input type="text" placeholder="Ej: Dry Hop inicial" className="w-full p-3 border border-line rounded-lg bg-surface text-content font-bold placeholder:text-muted/50" value={step.title} onChange={e => updateArray('steps', globalIdx, 'title', e.target.value)} />
                                                                <div className="flex items-center gap-1 group">
                                                                    <input type="number" placeholder="Tiempo" className="flex-1 min-w-0 p-3 border border-line rounded-l-lg bg-surface text-content font-bold text-center" value={step.duration || ''} onChange={e => updateArray('steps', globalIdx, 'duration', e.target.value)} />
                                                                    <select 
                                                                        className="w-24 p-3 border border-line rounded-r-lg bg-surface text-content text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-amber-500"
                                                                        value={step.timeUnit || 'd'} 
                                                                        onChange={e => updateArray('steps', globalIdx, 'timeUnit', e.target.value)}
                                                                    >
                                                                        {TIME_UNITS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <textarea placeholder="Detalles de fermentación o maduración..." rows="2" className="w-full p-3 border border-line rounded-lg bg-surface text-content text-sm resize-none mb-3" value={step.details || ''} onChange={e => updateArray('steps', globalIdx, 'details', e.target.value)} />
                                                            
                                                            {/* Nested Ingredients (Hops/Others in Fermentation) */}
                                                            <div className="bg-surface/50 p-3 rounded-lg border border-line/30">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="text-[9px] font-black uppercase text-muted tracking-widest flex items-center gap-2"><Package size={12} /> Insumos en bodega</span>
                                                                    <div className="flex gap-1">
                                                                        <button onClick={() => setFormData({ ...formData, hops: [...formData.hops, { name: '', amount: 0, time: '', unit: 'g', phase: 'fermenting', stepId: step.id, additionTime: 0, additionTimeUnit: 'd' }] })} className="p-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded hover:bg-green-500/20 transition-all" title="+ Lúpulo (Dry-hop)"><Leaf size={14} /></button>
                                                                        <button onClick={() => setFormData({ ...formData, others: [...formData.others, { name: '', amount: 0, unit: 'g', phase: 'fermenting', category: 'Levadura', stepId: step.id, additionTime: 0, additionTimeUnit: 'd' }] })} className="p-1 bg-yellow-500/10 text-yellow-500 rounded hover:bg-yellow-500/20 transition-all" title="+ Levadura"><Activity size={14} /></button>
                                                                        <button onClick={() => setFormData({ ...formData, others: [...formData.others, { name: '', amount: 0, unit: 'g', phase: 'fermenting', category: 'Aditivos', stepId: step.id, additionTime: 0, additionTimeUnit: 'd' }] })} className="p-1 bg-purple-500/10 text-purple-500 rounded hover:bg-purple-500/20 transition-all" title="+ Aditivo"><Sparkles size={14} /></button>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    {[
                                                                        ...formData.hops.filter(h => h.stepId === step.id).map(h => ({ ...h, type: 'lúpulo', initialCategory: 'Lúpulo', icon: <Leaf size={12} />, color: 'text-green-500', bg: 'bg-green-500/10', globalIdx: formData.hops.indexOf(h), colName: 'hops' })),
                                                                        ...formData.others.filter(o => o.stepId === step.id).map(o => ({ ...o, type: 'aditivo', initialCategory: 'Otros', icon: <Sparkles size={12} />, color: 'text-purple-500', bg: 'bg-purple-500/10', globalIdx: formData.others.indexOf(o), colName: 'others' }))
                                                                    ].map((ing, i) => (
                                                                            <div key={i} className="flex items-center gap-2 bg-panel p-1.5 rounded-lg border border-line animate-fadeIn">
                                                                                <div className={`p-1.5 rounded ${ing.bg} ${ing.color}`}>{ing.icon}</div>
                                                                                <AutocompleteInput className="flex-1 h-8 text-[10px]" value={ing.name} onChange={val => updateArray(ing.colName, ing.globalIdx, 'name', val)} onSelect={item => updateArray(ing.colName, ing.globalIdx, 'unit', item.unit || 'g')} placeholder={`${ing.type}...`} category={ing.category || ing.initialCategory} inventory={inventory} onAddNewItem={onAddInventoryItem} />
                                                                                <div className="flex items-center bg-surface rounded px-1 h-8 border border-line">
                                                                                    <input type="number" className="w-10 bg-transparent text-[10px] text-center font-bold" value={ing.amount} onChange={e => updateArray(ing.colName, ing.globalIdx, 'amount', e.target.value)} />
                                                                                    <span className="text-[8px] font-black text-muted uppercase ml-0.5">{ing.unit || 'g'}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-0.5 bg-surface rounded px-1.5 h-8 border border-line" title="Tiempo de Adición">
                                                                                    <span className="text-[8px] font-black text-muted uppercase mr-1">@</span>
                                                                                    <input type="number" placeholder="Ti" className="w-14 bg-transparent text-[10px] text-center font-bold" value={ing.additionTime || ''} onChange={e => updateArray(ing.colName, ing.globalIdx, 'additionTime', e.target.value)} onBlur={e => { if (!e.target.value) updateArray(ing.colName, ing.globalIdx, 'additionTime', isCountdownStage(stage.id) ? (step.duration || 0) : 0) }} />
                                                                                    <select className="bg-transparent text-[8px] font-black text-amber-500 uppercase outline-none" value={ing.additionTimeUnit || 'd'} onChange={e => updateArray(ing.colName, ing.globalIdx, 'additionTimeUnit', e.target.value)}>
                                                                                        <option value="m">m</option>
                                                                                        <option value="h">h</option>
                                                                                        <option value="d">d</option>
                                                                                    </select>
                                                                                </div>
                                                                                <button onClick={() => removeArrayItem(ing.colName, ing.globalIdx)} className="text-muted hover:text-red-500 p-1"><Trash2 size={12} /></button>
                                                                            </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <button onClick={() => setFormData({ ...formData, steps: [...formData.steps, { id: Date.now() + Math.random(), title: '', details: '', duration: 0, timeUnit: 'd', phase: 'fermenting', stageId: stage.id }] })} className="w-full py-3 border-2 border-dashed border-line/50 rounded-xl text-xs font-black text-muted hover:text-purple-500 hover:border-purple-500/50 transition-all flex items-center justify-center gap-2">
                                                    <Plus size={16} /> Añadir Sub-paso en {stage.label}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeStep === 4 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-emerald-900/10 p-5 rounded-2xl border border-emerald-500/20">
                            <h4 className="font-black text-sm text-emerald-400 uppercase tracking-widest flex items-center gap-2 mb-4"><Package size={18} /> Plan de Envasado</h4>
                            <p className="text-[10px] text-muted font-bold">Detalles sobre el fraccionamiento y carbonatación.</p>
                        </div>

                        {BREWING_STAGES.filter(stage => stage.phase === 'bottling').map((stage) => {
                            const isSkipped = formData.skippedStages.includes(stage.id);
                            const stageSteps = formData.steps.filter(s => s.stageId === stage.id);
                            
                            return (
                                <div key={stage.id} className={`p-5 rounded-2xl border transition-all ${isSkipped ? 'bg-surface/30 border-dashed opacity-50' : 'bg-surface border-line shadow-sm'}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isSkipped ? 'bg-slate-700/50 text-slate-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                                <Package size={20} />
                                            </div>
                                            <div>
                                                <h3 className={`font-black uppercase tracking-widest ${isSkipped ? 'text-muted line-through' : 'text-content'}`}>{stage.label}</h3>
                                                <p className="text-[10px] text-muted font-bold italic">{isSkipped ? 'Omitido' : 'Detalles de fraccionamiento'}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const newSkipped = isSkipped 
                                                    ? formData.skippedStages.filter(s => s !== stage.id)
                                                    : [...formData.skippedStages, stage.id];
                                                setFormData({ ...formData, skippedStages: newSkipped });
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${isSkipped ? 'bg-amber-500 text-white' : 'bg-slate-700 text-muted hover:bg-red-500/20 hover:text-red-500'}`}
                                        >
                                            {isSkipped ? 'Habilitar' : 'Omitir'}
                                        </button>
                                    </div>

                                    {!isSkipped && (
                                        <div className="space-y-4 pt-2 border-t border-line/50">
                                            {stageSteps.map((step) => {
                                                const globalIdx = formData.steps.indexOf(step);
                                                return (
                                                    <div key={step.id} className="bg-panel/50 p-4 rounded-xl border border-line/30 relative">
                                                        <button onClick={() => removeArrayItem('steps', globalIdx)} className="absolute top-3 right-3 text-muted hover:text-red-500"><Trash2 size={16} /></button>
                                                        <div className="grid md:grid-cols-1 gap-4 mb-3">
                                                            <input type="text" placeholder="Ej: Carbonatación en botella con azúcar" className="w-full p-3 border border-line rounded-lg bg-surface text-content font-bold placeholder:text-muted/50" value={step.title} onChange={e => updateArray('steps', globalIdx, 'title', e.target.value)} />
                                                        </div>
                                                        <textarea placeholder="Procedimiento de envasado, volúmenes de CO2, temperaturas..." rows="3" className="w-full p-3 border border-line rounded-lg bg-surface text-content text-sm resize-none mb-3" value={step.details || ''} onChange={e => updateArray('steps', globalIdx, 'details', e.target.value)} />
                                                        
                                                        {/* Ingredients for Envasado (Priming sugar, etc) */}
                                                        <div className="bg-surface/50 p-3 rounded-lg border border-line/30">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-[9px] font-black uppercase text-muted tracking-widest flex items-center gap-2"><Package size={12} /> Insumos de envasado</span>
                                                                <button onClick={() => setFormData({ ...formData, others: [...formData.others, { name: '', amount: 0, unit: 'g', phase: 'bottling', category: 'Otros', stepId: step.id, additionTime: 0, additionTimeUnit: 'm' }] })} className="p-1 bg-emerald-500/10 text-emerald-500 rounded hover:bg-emerald-500/20 transition-all"><Plus size={14} /></button>
                                                            </div>
                                                            <div className="space-y-1">
                                                                {formData.others.filter(o => o.stepId === step.id).map((ing, i) => {
                                                                    const gIdx = formData.others.indexOf(ing);
                                                                    return (
                                                                        <div key={i} className="flex items-center gap-2 bg-panel p-1.5 rounded-lg border border-line">
                                                                            <AutocompleteInput className="flex-1 h-8 text-[10px]" value={ing.name} onChange={val => updateArray('others', gIdx, 'name', val)} placeholder="Insumo..." category="Otros" inventory={inventory} onAddNewItem={onAddInventoryItem} />
                                                                            <div className="flex items-center bg-surface rounded px-1 h-8 border border-line">
                                                                                <input type="number" className="w-10 bg-transparent text-[10px] text-center font-bold" value={ing.amount} onChange={e => updateArray('others', gIdx, 'amount', e.target.value)} />
                                                                                <span className="text-[8px] font-black text-muted uppercase ml-0.5">{ing.unit || 'g'}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-0.5 bg-surface rounded px-1.5 h-8 border border-line" title="Tiempo de Adición">
                                                                                <span className="text-[8px] font-black text-muted uppercase mr-1">@</span>
                                                                                <input type="number" placeholder="Ti" className="w-14 bg-transparent text-[10px] text-center font-bold" value={ing.additionTime || ''} onChange={e => updateArray('others', gIdx, 'additionTime', e.target.value)} onBlur={e => { if (!e.target.value) updateArray('others', gIdx, 'additionTime', isCountdownStage(stage.id) ? (step.duration || 0) : 0) }} />
                                                                                <select className="bg-transparent text-[8px] font-black text-amber-500 uppercase outline-none" value={ing.additionTimeUnit || 'm'} onChange={e => updateArray('others', gIdx, 'additionTimeUnit', e.target.value)}>
                                                                                    <option value="m">m</option>
                                                                                    <option value="h">h</option>
                                                                                    <option value="d">d</option>
                                                                                </select>
                                                                            </div>
                                                                            <button onClick={() => removeArrayItem('others', gIdx)} className="text-muted hover:text-red-500 p-1"><Trash2 size={12} /></button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <button onClick={() => setFormData({ ...formData, steps: [...formData.steps, { id: Date.now() + Math.random(), title: '', details: '', duration: 0, timeUnit: 'm', phase: 'bottling', stageId: stage.id }] })} className="w-full py-3 border-2 border-dashed border-line/50 rounded-xl text-xs font-black text-muted hover:text-emerald-500 hover:border-emerald-500/50 transition-all flex items-center justify-center gap-2">
                                                <Plus size={16} /> Añadir Detalle de Envasado
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {activeStep === 5 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-10 rounded-3xl shadow-xl border-4 border-white/10 relative overflow-hidden">
                            <Sparkles className="absolute -top-4 -right-4 opacity-10 rotate-12" size={160} />
                            <div className="relative z-10">
                                <h3 className="text-4xl font-black mb-2 leading-none uppercase tracking-tighter">Resumen Cervecero</h3>
                                <p className="text-white/90 font-bold text-lg mb-8 flex items-center gap-2">
                                    {formData.name} <span className="opacity-50">/</span> {formData.family} {formData.style}
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                                        <span className="block text-[10px] uppercase font-black text-white/60 mb-1 tracking-widest text-center">Volumen</span>
                                        <span className="text-2xl font-black block text-center">{formData.targetVolume}L</span>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                                        <span className="block text-[10px] uppercase font-black text-white/60 mb-1 tracking-widest text-center">Alcohol</span>
                                        <span className="text-2xl font-black block text-center">{formData.abv}%</span>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                                        <span className="block text-[10px] uppercase font-black text-white/60 mb-1 tracking-widest text-center">Amargor</span>
                                        <span className="text-2xl font-black block text-center">{formData.ibu} IBU</span>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                                        <span className="block text-[10px] uppercase font-black text-white/60 mb-1 tracking-widest text-center">Eficiencia</span>
                                        <span className="text-2xl font-black block text-center">75%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-surface p-6 rounded-2xl border border-line">
                                <h4 className="font-black text-sm uppercase tracking-widest text-muted mb-4 border-b border-line pb-2">Insumos Totales</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm font-bold text-content border-b border-line/5 pb-1"><span>Granos Totales:</span><span>{formData.malts.reduce((acc, m) => acc + Number(m.amount || 0), 0).toFixed(2)} kg</span></div>
                                    <div className="flex justify-between text-sm font-bold text-content border-b border-line/5 pb-1"><span>Lúpulo Cocción:</span><span>{formData.hops.filter(h => h.phase === 'cooking').reduce((acc, h) => acc + Number(h.amount || 0), 0)} g</span></div>
                                    <div className="flex justify-between text-sm font-bold text-content border-b border-line/5 pb-1"><span>Lúpulo Dry Hop:</span><span>{formData.hops.filter(h => h.phase === 'fermenting').reduce((acc, h) => acc + Number(h.amount || 0), 0)} g</span></div>
                                    <div className="flex justify-between text-sm font-bold text-content border-b border-line/5 pb-1"><span>Levadura:</span><span>{typeof formData.yeast === 'object' ? formData.yeast.name : formData.yeast}</span></div>
                                </div>
                            </div>
                            <div className="bg-surface p-6 rounded-2xl border border-line">
                                <h4 className="font-black text-sm uppercase tracking-widest text-muted mb-4 border-b border-line pb-2">Proceso Estructurado</h4>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-black text-amber-500 uppercase"><Thermometer size={14} /> Cocción: {formData.steps.filter(s => s.phase === 'cooking').length} pasos</div>
                                        <div className="flex items-center gap-2 text-xs font-black text-purple-500 uppercase"><Activity size={14} /> Fermentación: {formData.steps.filter(s => s.phase === 'fermenting').length} pasos</div>
                                        <div className="flex items-center gap-2 text-xs font-black text-blue-500 uppercase"><Droplets size={14} /> Envasado: {formData.steps.filter(s => s.phase === 'bottling').length} pasos</div>
                                    </div>
                                    
                                    <div className="pt-4 border-t border-line">
                                        <label className="flex items-center justify-between cursor-pointer group">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-content uppercase tracking-widest flex items-center gap-2">
                                                    <BookOpen size={14} /> ¿Hacer receta pública?
                                                </span>
                                                <span className="text-[10px] text-muted font-bold italic group-hover:text-amber-500 transition-colors">Visible para todos en la Galería</span>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                className="w-6 h-6 rounded-lg border-line text-amber-500 focus:ring-amber-500"
                                                checked={formData.isPublic}
                                                onChange={e => setFormData({ ...formData, isPublic: e.target.checked })}
                                            />
                                        </label>
                                    </div>
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
                            onClick={() => { if (!isGuest) handleSave(); else addToast(guestTooltip, "info"); }}
                            disabled={isGuest || isSaving}
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-12 py-4 rounded-2xl font-black text-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 disabled:opacity-50 flex items-center gap-3 active:scale-95"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />} 
                            {isSaving ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Registrar Receta')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
