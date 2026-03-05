// /src/components/views/RecipeListView.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Beer, SlidersHorizontal, BookOpen, Loader2 } from 'lucide-react';
import { useRecipes } from '../../hooks/useRecipes';
import { useInventory } from '../../hooks/useInventory';
import { useHistory } from '../../hooks/useHistory';
import { getThemeForCategory, initialRecipes, initialInventory } from '../../utils/helpers';
import { useFeasibilityBatch } from '../../hooks/useFeasibility';
import RecipeCard from '../recipe/RecipeCard';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';

export default function RecipeListView() {
    const navigate = useNavigate();
    const { recipes, addRecipe, deleteRecipe } = useRecipes();
    const { inventory, addItem } = useInventory();
    const { history } = useHistory();
    const [isUpdatingBase, setIsUpdatingBase] = useState(false);

    const [showFeasibility, setShowFeasibility] = useState(false);
    const [feasibilityVolume, setFeasibilityVolume] = useState(20);

    const safeRecipes = Array.isArray(recipes) ? recipes : [];
    const grouped = safeRecipes.reduce((acc, recipe) => {
        const cat = recipe.category || 'Sin Categoría';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(recipe);
        return acc;
    }, {});

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
        if (window.confirm(`¿Seguro que deseas eliminar la receta: ${recipe.name}?`)) {
            await deleteRecipe(recipe.id);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">

            {/* ── Toolbar ──────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 gap-3">
                <div className="flex items-center flex-wrap gap-2">
                    <p className="text-slate-600 dark:text-slate-400 font-medium">
                        Tienes <span className="text-amber-600 font-bold">{safeRecipes.length} recetas</span> en tu biblioteca.
                    </p>
                    <Button
                        variant="ghost"
                        size="xs"
                        icon={isUpdatingBase ? Loader2 : RefreshCw}
                        disabled={isUpdatingBase}
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
                        className="w-20 p-2 border border-emerald-300 dark:border-emerald-700 rounded-xl text-center font-black text-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
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
                Object.keys(grouped).map(category => {
                    const theme = getThemeForCategory(category);
                    return (
                        <div key={category} className="space-y-4">
                            <h2 className={`text-2xl font-black ${theme.text} border-b-2 ${theme.border} pb-2 flex items-center gap-2`}>
                                <Beer className={theme.icon} /> {category}
                            </h2>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {grouped[category].map(recipe => (
                                    <RecipeCard
                                        key={recipe.id}
                                        recipe={recipe}
                                        history={history}
                                        feasibility={showFeasibility ? (feasibilityMap.get(recipe.id) ?? null) : null}
                                        onClick={() => navigate(`/recipes/${recipe.id}`)}
                                        onDelete={handleDeleteRecipe}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}
