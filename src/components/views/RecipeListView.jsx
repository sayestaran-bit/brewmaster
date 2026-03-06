// /src/components/views/RecipeListView.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Beer, SlidersHorizontal, BookOpen, Loader2, GripVertical } from 'lucide-react';
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
import { useRecipes } from '../../hooks/useRecipes';
import { useInventory } from '../../hooks/useInventory';
import { useHistory } from '../../hooks/useHistory';
import { getThemeForCategory, initialRecipes, initialInventory } from '../../utils/helpers';
import { useFeasibilityBatch } from '../../hooks/useFeasibility';
import RecipeCard from '../recipe/RecipeCard';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { useAuth } from '../../context/AuthContext';

function SortableRecipeCard(props) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.recipe.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 50 : 1,
        // Añadimos position relative para posicionar el handle o simplemente aplicar atributos al div superior.
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
}

function SortableCategoryBlock({ category, theme, children }) {
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
                    title="Arrastrar para ordenar categoría"
                >
                    <GripVertical size={18} className={theme.text} />
                </div>
            </h2>
            {children}
        </div>
    );
}

export default function RecipeListView() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const isGuest = currentUser?.isAnonymous;
    const guestTooltip = "Regístrate para crear recetas ilimitadas y más!";
    const { recipes, addRecipe, deleteRecipe, updateRecipe } = useRecipes();
    const { inventory, addItem } = useInventory();
    const { history } = useHistory();
    const [isUpdatingBase, setIsUpdatingBase] = useState(false);

    const [showFeasibility, setShowFeasibility] = useState(false);
    const [feasibilityVolume, setFeasibilityVolume] = useState(20);

    const safeRecipes = Array.isArray(recipes) ? recipes : [];

    // Local state for optimistic drag & drop
    const [localRecipes, setLocalRecipes] = React.useState([]);

    React.useEffect(() => {
        // Ordenar primero por `order` y luego por nombre si el order es igual o undefined
        const sorted = [...safeRecipes].sort((a, b) => {
            const orderA = a.order || 0;
            const orderB = b.order || 0;
            if (orderA !== orderB) return orderA - orderB;
            return (a.name || '').localeCompare(b.name || '');
        });
        setLocalRecipes(sorted);
    }, [safeRecipes]);

    const grouped = localRecipes.reduce((acc, recipe) => {
        const cat = recipe.category || 'Sin Categoría';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(recipe);
        return acc;
    }, {});

    const baseCategories = Object.keys(grouped).sort();

    // Category sorting state
    const [categoryOrder, setCategoryOrder] = React.useState(() => {
        try {
            const saved = localStorage.getItem('brewmaster_category_order');
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });

    const orderedCategories = [...baseCategories].sort((a, b) => {
        const idxA = categoryOrder.indexOf(a);
        const idxB = categoryOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0; // fallback to alphabetical which is already done by baseCategories
    });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id || isGuest) return;

        // Check if dragging a category
        if (String(active.id).startsWith('cat-') && String(over.id).startsWith('cat-')) {
            const catA = String(active.id).replace('cat-', '');
            const catB = String(over.id).replace('cat-', '');

            // Ensure all current categories are in the order array
            const currentOrder = orderedCategories;
            const oldIndex = currentOrder.indexOf(catA);
            const newIndex = currentOrder.indexOf(catB);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
                setCategoryOrder(newOrder);
                localStorage.setItem('brewmaster_category_order', JSON.stringify(newOrder));
            }
            return;
        }

        // Regular recipe drag
        const activeRecipe = localRecipes.find(r => r.id === active.id);
        const overRecipe = localRecipes.find(r => r.id === over.id);

        if (!activeRecipe || !overRecipe || activeRecipe.category !== overRecipe.category) return;

        const categoryRecipes = grouped[activeRecipe.category];
        const oldIndex = categoryRecipes.findIndex(r => r.id === active.id);
        const newIndex = categoryRecipes.findIndex(r => r.id === over.id);

        const reorderedCategory = arrayMove(categoryRecipes, oldIndex, newIndex);

        // Optimistic update
        const newLocalRecipes = localRecipes.map(r => {
            if (r.category === activeRecipe.category) {
                return reorderedCategory.find(cr => cr.id === r.id) || r;
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
            // Revert on error by triggering the useEffect again (handled automatically by snapshot if failed)
            alert('Error al guardar el nuevo orden.');
        }
    };

    // Batch feasibility — only computed when panel is shown
    const feasibilityMap = useFeasibilityBatch(
        showFeasibility ? safeRecipes : [],
        inventory,
        feasibilityVolume
    );

    const handleUpdateBaseRecipes = async () => {
        if (window.confirm('Esto agregará las recetas base y algunos insumos por defecto a tu cuenta. Las recetas que ya existan con el mismo nombre se mantendrán. ¿Continuar?')) {
            setIsUpdatingBase(true);
            try {
                // 1. Filter missing base recipes and add them
                const missingRecipes = initialRecipes.filter(base =>
                    !safeRecipes.some(r => r.name.toLowerCase() === base.name.toLowerCase())
                );
                for (const recipe of missingRecipes) {
                    await addRecipe(recipe);
                }

                // 2. Filter missing base inventory items and add them
                const safeInventory = Array.isArray(inventory) ? inventory : [];
                const missingInventory = initialInventory.filter(base =>
                    !safeInventory.some(i => i.name.toLowerCase() === base.name.toLowerCase())
                );
                for (const item of missingInventory) {
                    await addItem({ ...item, stock: Number(item.stock), price: Number(item.price) });
                }

                alert('¡Catálogo base actualizado con éxito!');
            } catch (err) {
                console.error('Error actualizando base:', err);
                alert('Hubo un error al actualizar la base de datos.');
            } finally {
                setIsUpdatingBase(false);
            }
        }
    };

    const handleDeleteRecipe = async (recipe) => {
        if (isGuest) {
            alert(guestTooltip);
            return;
        }
        if (window.confirm(`¿Seguro que deseas eliminar la receta: ${recipe.name}?`)) {
            await deleteRecipe(recipe.id);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">

            {/* ── Toolbar ──────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-panel p-4 rounded-2xl shadow-sm border border-line gap-3">
                <div className="flex items-center flex-wrap gap-2">
                    <p className="text-slate-600 dark:text-slate-400 font-medium">
                        Tienes <span className="text-amber-600 font-bold">{safeRecipes.length} recetas</span> en tu biblioteca.
                    </p>
                    <Button
                        variant="ghost"
                        size="xs"
                        icon={isUpdatingBase ? Loader2 : RefreshCw}
                        disabled={isUpdatingBase || isGuest}
                        title={isGuest ? guestTooltip : undefined}
                        onClick={handleUpdateBaseRecipes}
                        className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                        {isUpdatingBase ? 'Actualizando...' : 'Actualizar Base'}
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto justify-center">
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
                        title={isGuest ? guestTooltip : undefined}
                        onClick={() => navigate('/recipes/add')}
                    >
                        Nueva / Clonar
                    </Button>
                </div>
            </div>

            {/* ── Feasibility Panel ────────────────────────── */}
            {showFeasibility && (
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4 animate-slideDown">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                        <SlidersHorizontal size={18} /> ¿Cuántos litros quieres hacer?
                    </div>
                    <input
                        type="number"
                        min="1"
                        value={feasibilityVolume}
                        onChange={e => setFeasibilityVolume(Number(e.target.value) || 1)}
                        className="w-20 p-2 border border-emerald-300 dark:border-emerald-700 rounded-xl text-center font-black text-lg bg-panel text-content outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-emerald-600 font-bold text-sm">L</span>
                    <div className="flex gap-3 text-xs font-bold ml-auto">
                        <span className="text-emerald-600">✓ Lista</span>
                        <span className="text-amber-600">⚠ Parcial</span>
                        <span className="text-red-500">✕ Sin Stock</span>
                    </div>
                </div>
            )}

            {/* ── Recipe Grid by Category ──────────────────── */}
            {safeRecipes.length === 0 ? (
                <EmptyState
                    icon={BookOpen}
                    title="No tienes recetas aún"
                    description='Crea tu primera receta o carga las recetas base con "Actualizar Base".'
                    action="Crear Receta"
                    onAction={() => navigate('/recipes/add')}
                />
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={orderedCategories.map(c => `cat-${c}`)} strategy={verticalListSortingStrategy}>
                        {orderedCategories.map(category => {
                            const theme = getThemeForCategory(category);
                            const categoryItems = grouped[category];
                            if (!categoryItems) return null;

                            return (
                                <SortableCategoryBlock key={category} category={category} theme={theme}>
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
            )}
        </div>
    );
}
