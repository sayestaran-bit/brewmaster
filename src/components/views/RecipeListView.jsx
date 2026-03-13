// /src/components/views/RecipeListView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    RefreshCw,
    Beer,
    SlidersHorizontal,
    BookOpen,
    Loader2,
    GripVertical
} from 'lucide-react';

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';

import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';

// Hooks
import { useRecipes } from '../../hooks/useRecipes';
import { useInventory } from '../../hooks/useInventory';
import { useToast } from '../../context/ToastContext';
import { useHistory } from '../../hooks/useHistory';
import { useFeasibilityBatch } from '../../hooks/useFeasibility';
import { useAuth } from '../../context/AuthContext';

// Utils
import { getThemeForCategory, initialRecipes, initialInventory } from '../../utils/helpers';

// UI
import RecipeCard from '../recipe/RecipeCard';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';

export default function RecipeListView() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const isGuest = false; // Deshabilitado temporalmente para pruebas locales: currentUser ? currentUser.isAnonymous : true;
    const guestTooltip = "Regístrate para crear recetas ilimitadas y más!";

    const { addToast } = useToast();
    const { recipes, addRecipe, updateRecipe, deleteRecipe } = useRecipes();
    const { inventory, addItem } = useInventory();
    const { history } = useHistory();
    
    const [isUpdatingBase, setIsUpdatingBase] = useState(false);
    const [showFeasibility, setShowFeasibility] = useState(false);
    const [feasibilityVolume, setFeasibilityVolume] = useState(20);
    const [selectedSubStyle, setSelectedSubStyle] = useState(null);

    const safeRecipes = useMemo(() => Array.isArray(recipes) ? recipes : [], [recipes]);

    // Local state for optimistic drag & drop
    const [localRecipes, setLocalRecipes] = useState([]);

    useEffect(() => {
        const sorted = [...safeRecipes].sort((a, b) => {
            const orderA = a.order ?? 999;
            const orderB = b.order ?? 999;
            if (orderA !== orderB) return orderA - orderB;
            return (a.name || '').localeCompare(b.name || '');
        });
        setLocalRecipes(sorted);
    }, [safeRecipes]);

    const grouped = useMemo(() => {
        const result = {};
        for (const recipe of localRecipes) {
            const cat = recipe.category || 'Otros';
            // Filter by subStyle if category is IPA and a subStyle is selected
            if (cat === 'IPA' && selectedSubStyle && recipe.subStyle !== selectedSubStyle) {
                continue;
            }
            if (!result[cat]) result[cat] = [];
            result[cat].push(recipe);
        }
        return result;
    }, [localRecipes, selectedSubStyle]);

    // Extract available subStyles for IPA category
    const ipaSubStyles = useMemo(() => {
        const ipas = localRecipes.filter(r => r.category === 'IPA');
        const styles = [...new Set(ipas.map(r => r.subStyle).filter(Boolean))];
        return styles.sort();
    }, [localRecipes]);

    // Category sorting logic
    const baseCategories = useMemo(() => Object.keys(grouped).sort(), [grouped]);

    const [categoryOrder, setCategoryOrder] = useState(() => {
        try {
            const saved = localStorage.getItem('brewmaster_category_order');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    const orderedCategories = useMemo(() => {
        return [...baseCategories].sort((a, b) => {
            const idxA = categoryOrder.indexOf(a);
            const idxB = categoryOrder.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return 0;
        });
    }, [baseCategories, categoryOrder]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id || isGuest) return;

        // 1. Category drag
        if (String(active.id).startsWith('cat-') && String(over.id).startsWith('cat-')) {
            const catA = String(active.id).replace('cat-', '');
            const catB = String(over.id).replace('cat-', '');

            const oldIndex = orderedCategories.indexOf(catA);
            const newIndex = orderedCategories.indexOf(catB);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(orderedCategories, oldIndex, newIndex);
                setCategoryOrder(newOrder);
                try {
                    localStorage.setItem('brewmaster_category_order', JSON.stringify(newOrder));
                } catch (e) {
                    console.error("Error saving to localStorage:", e);
                }
            }
            return;
        }

        // 2. Recipe drag
        const activeRecipe = localRecipes.find(r => r.id === active.id);
        const overRecipe = localRecipes.find(r => r.id === over.id);

        if (!activeRecipe || !overRecipe || activeRecipe.category !== overRecipe.category) return;

        const categoryRecipes = grouped[activeRecipe.category];
        const oldIndex = categoryRecipes.findIndex(r => r.id === active.id);
        const newIndex = categoryRecipes.findIndex(r => r.id === over.id);

        const reorderedCategory = arrayMove(categoryRecipes, oldIndex, newIndex);

        // Optimistic update local state
        const newLocalRecipes = localRecipes.map(r => {
            if (r.category === activeRecipe.category) {
                const updated = reorderedCategory.find(cr => cr.id === r.id);
                return updated ? { ...updated, order: reorderedCategory.indexOf(updated) } : r;
            }
            return r;
        });
        setLocalRecipes(newLocalRecipes);

        // Persist to Firebase
        try {
            const updatePromises = reorderedCategory.map((recipe, index) => {
                return updateRecipe(recipe.id, { order: index });
            });
            await Promise.all(updatePromises);
        } catch (error) {
            console.error("Error updating recipe order:", error);
            addToast('Error al guardar el nuevo orden.', 'error');
        }
    };

    const feasibilityMap = useFeasibilityBatch(
        showFeasibility ? safeRecipes : [],
        inventory,
        feasibilityVolume
    );

    const handleUpdateBaseRecipes = async () => {
        if (isGuest) return;
        if (isUpdatingBase) return;

        if (window.confirm('Esto agregará las recetas base y algunos insumos por defecto. Las que ya existan se actualizarán. ¿Continuar?')) {
            setIsUpdatingBase(true);
            try {
                // Helper for name matching
                const normalizeName = (name) => (name || '').toLowerCase().trim().replace(/\s+/g, ' ');

                // 1. Inyectar Recetas (Evitar duplicados por nombre)
                for (const recipe of initialRecipes) {
                    const normalizedNewName = normalizeName(recipe.name);
                    const exists = safeRecipes.some(r => normalizeName(r.name) === normalizedNewName);
                    
                    if (!exists) {
                        const { id, ...recipeData } = recipe;
                        await addRecipe(recipeData, id); 
                    }
                }

                // 2. Inyectar Inventario (Evitar duplicados y forzar stock 0 si no es anónimo)
                for (const item of initialInventory) {
                    const normalizedNewName = normalizeName(item.name);
                    const exists = inventory.some(i => normalizeName(i.name) === normalizedNewName);

                    if (!exists) {
                        const { id, ...itemData } = item;
                        const finalStock = (currentUser && !currentUser.isAnonymous) ? 0 : Number(itemData.stock);
                        
                        await addItem({ 
                            ...itemData, 
                            stock: finalStock, 
                            price: Number(itemData.price) 
                        }, id);
                    }
                }
                
                addToast('¡Catálogo base actualizado con éxito!', 'success');
            } catch (err) {
                console.error('Error actualizando base:', err);
                addToast('Error al actualizar la base.', 'error');
            } finally {
                setIsUpdatingBase(false);
            }
        }
    };

    const handleDeleteRecipe = async (recipe) => {
        if (isGuest) {
            addToast(guestTooltip, 'info');
            return;
        }
        if (window.confirm(`¿Seguro que deseas eliminar: ${recipe.name}?`)) {
            try {
                await deleteRecipe(recipe.id);
                addToast('Receta eliminada correctamente.', 'success');
            } catch (error) {
                console.error("Error deleting recipe:", error);
                addToast("No se pudo eliminar la receta.", "error");
            }
        }
    };

    if (safeRecipes.length === 0) {
        return (
            <div className="space-y-6 animate-fadeIn">
                <div className="bg-panel p-4 rounded-2xl border border-line flex justify-between items-center">
                    <p className="text-muted text-sm italic">Carga la base de recetas para empezar.</p>
                    <Button size="xs" onClick={handleUpdateBaseRecipes} disabled={isUpdatingBase || isGuest}>
                        {isUpdatingBase ? 'Cargando...' : 'Cargar Base'}
                    </Button>
                </div>
                <EmptyState
                    icon={BookOpen}
                    title="No tienes recetas aún"
                    description='Crea tu primera receta o carga el catálogo base.'
                    action="Crear Receta"
                    onAction={() => navigate('/recipes/add')}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-panel p-4 rounded-2xl shadow-sm border border-line gap-3">
                <div className="flex items-center flex-wrap gap-2 text-sm">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Biblioteca:</span>
                    <span className="text-amber-600 font-black">{safeRecipes.length} ítems</span>
                    <Button
                        variant="ghost"
                        size="xs"
                        icon={isUpdatingBase ? Loader2 : RefreshCw}
                        disabled={isUpdatingBase || isGuest}
                        onClick={handleUpdateBaseRecipes}
                        className="text-blue-500 ml-2"
                    >
                        Actualizar Base
                    </Button>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant={showFeasibility ? 'success' : 'outline'}
                        size="sm"
                        icon={SlidersHorizontal}
                        onClick={() => setShowFeasibility(!showFeasibility)}
                    >
                        Factibilidad
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        icon={Plus}
                        disabled={isGuest}
                        onClick={() => navigate('/recipes/add')}
                    >
                        Nueva
                    </Button>
                </div>
            </div>

            {/* Feasibility Tool */}
            {showFeasibility && (
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 p-4 rounded-2xl flex items-center gap-4 animate-slideDown">
                    <div className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">Volumen Objetivo:</div>
                    <input
                        type="number"
                        min="1"
                        value={feasibilityVolume}
                        onChange={e => setFeasibilityVolume(Number(e.target.value) || 1)}
                        className="w-16 p-2 border border-emerald-300 dark:border-emerald-700 rounded-xl text-center font-black bg-panel"
                    />
                    <span className="text-emerald-600 font-bold ml-auto text-xs">
                        ✓ Lista | ⚠ Parcial | ✕ Sin Stock
                    </span>
                </div>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={orderedCategories.map(c => `cat-${c}`)} strategy={verticalListSortingStrategy}>
                    {orderedCategories.map(category => {
                        const theme = getThemeForCategory(category);
                        const categoryItems = grouped[category] || [];

                        return (
                            <SortableCategoryBlock key={category} category={category} theme={theme}>
                                {category === 'IPA' && ipaSubStyles.length > 0 && (
                                    <div className="flex flex-wrap gap-3 mb-8 animate-fadeIn">
                                        <button
                                            onClick={() => setSelectedSubStyle(null)}
                                            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border shadow-sm ${!selectedSubStyle ? 'bg-amber-500 text-white border-amber-500 shadow-amber-500/20' : 'bg-surface text-muted border-line hover:border-amber-500/50 hover:bg-slate-50'}`}
                                        >
                                            Todas las IPA
                                        </button>
                                        {ipaSubStyles.map(sub => (
                                            <button
                                                key={sub}
                                                onClick={() => setSelectedSubStyle(selectedSubStyle === sub ? null : sub)}
                                                className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border shadow-sm ${selectedSubStyle === sub ? 'bg-orange-500 text-white border-orange-500 shadow-orange-500/20' : 'bg-surface text-muted border-line hover:border-orange-500/50 hover:bg-slate-50'}`}
                                            >
                                                {sub}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <SortableContext items={categoryItems.map(r => r.id)} strategy={rectSortingStrategy}>
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {categoryItems.map(recipe => (
                                            <SortableRecipeCard
                                                key={recipe.id}
                                                recipe={recipe}
                                                history={history}
                                                feasibility={showFeasibility ? (feasibilityMap.get(recipe.id) ?? null) : null}
                                                onClick={() => navigate(`/recipes/${recipe.id}`)}
                                                onDelete={handleDeleteRecipe}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </SortableCategoryBlock>
                        );
                    })}
                </SortableContext>
            </DndContext>
        </div>
    );
}

// ── Internal Helper Components ──────────────────────────────────────────────

const SortableRecipeCard = React.memo(function SortableRecipeCard(props) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.recipe.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 50 : 1,
        position: 'relative'
    };

    return (
        <div ref={setNodeRef} style={style} className="relative group/sortable">
            <div
                {...attributes}
                {...listeners}
                className="absolute top-4 right-4 z-20 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 p-2 rounded-lg cursor-grab active:cursor-grabbing opacity-0 group-hover/sortable:opacity-100 transition-opacity backdrop-blur-sm"
                title="Arrastrar para reordenar"
            >
                <GripVertical size={20} className="text-slate-500 dark:text-slate-400" />
            </div>
            <RecipeCard {...props} />
        </div>
    );
});

const SortableCategoryBlock = React.memo(function SortableCategoryBlock({ category, theme, children }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `cat-${category}` });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative',
        zIndex: isDragging ? 40 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="space-y-4 mb-8">
            <h2 className={`text-2xl font-black ${theme.text} border-b-2 ${theme.border} pb-2 flex items-center justify-between group/cat`}>
                <div className="flex items-center gap-2">
                    <Beer className={theme.icon} /> {category}
                </div>
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing opacity-0 group-hover/cat:opacity-100 transition-opacity p-2 bg-black/5 dark:bg-white/5 rounded-lg"
                    title="Arrastrar categoría"
                >
                    <GripVertical size={18} className={theme.text} />
                </div>
            </h2>
            {children}
        </div>
    );
});
