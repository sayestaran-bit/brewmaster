// /src/components/views/RecipeListView.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Beer, Trash2, CalendarClock, Droplets, Thermometer, Activity, Star } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { getThemeForCategory, getSrmColor } from '../../utils/helpers';

// Podríamos mover `initialRecipes` a un archivo de constantes o recursos
import { initialRecipes } from '../../utils/helpers';

export default function RecipeListView() {
    const navigate = useNavigate();
    const { recipes, setRecipes, updateCloudData, history } = useAppContext();

    // Usamos el currentUser del AppContext directo, o del AuthContext
    const { isAnonymous } = useAppContext(); // No tenemos isAnonymous aquí, viene de Auth. Pasando por helper rápido
    // NOTA: Para no romper el scope, simplificaremos la validación:
    // Mostraremos el botón "Actualizar Recetas" siempre que no seamos "invitado" (por simplificación, dejamos el botón o lo removemos, lo dejamos por ahora)

    const safeRecipes = Array.isArray(recipes) ? recipes : [];
    const grouped = safeRecipes.reduce((acc, recipe) => {
        const cat = recipe.category || 'Sin Categoría';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(recipe);
        return acc;
    }, {});

    const handleUpdateBaseRecipes = () => {
        if (window.confirm("Esto actualizará las recetas base a su última versión detallada (sin borrar tus recetas propias). ¿Continuar?")) {
            const myCustomRecipes = safeRecipes.filter(r => !initialRecipes.some(base => base.id === r.id));
            const updated = [...initialRecipes, ...myCustomRecipes];
            setRecipes(updated);
            updateCloudData({ recipes: updated });
            alert("¡Recetas base actualizadas con éxito!");
        }
    };

    const handleDeleteRecipe = (e, recipe) => {
        e.stopPropagation();
        if (window.confirm(`¿Seguro que deseas eliminar la receta: ${recipe.name}?`)) {
            const newRecipes = recipes.filter(r => r.id !== recipe.id);
            setRecipes(newRecipes);
            updateCloudData({ recipes: newRecipes });
        }
    };

    const navigateToRecipe = (recipeId) => {
        navigate(`/recipes/${recipeId}`);
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 gap-4">
                <div className="flex items-center flex-wrap gap-2">
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Tienes <span className="text-amber-600 font-bold">{safeRecipes.length} recetas</span> en tu biblioteca.</p>
                    <button
                        onClick={handleUpdateBaseRecipes}
                        className="text-xs text-blue-500 hover:text-blue-600 underline ml-0 md:ml-3 font-bold bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                        <RefreshCw size={12} /> Actualizar Recetas Base
                    </button>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto justify-center">
                    <button onClick={() => navigate('/recipes/add')} className="flex-1 md:flex-none justify-center bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm">
                        <Plus size={18} /> Nueva / Clonar Receta
                    </button>
                </div>
            </div>

            {Object.keys(grouped).map(category => {
                const theme = getThemeForCategory(category);
                return (
                    <div key={category} className="space-y-4">
                        <h2 className={`text-2xl font-black ${theme.text} border-b-2 ${theme.border} pb-2 flex items-center gap-2`}><Beer className={theme.icon} /> {category}</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {grouped[category].map(recipe => {
                                const recipeHistory = Array.isArray(history) ? history.filter(h => h.recipeName === recipe.name) : [];
                                const brewCount = recipeHistory.length;
                                const ratedHistory = recipeHistory.filter(h => h.tasting && h.tasting.rating > 0);
                                const avgRating = ratedHistory.length > 0 ? (ratedHistory.reduce((sum, h) => sum + h.tasting.rating, 0) / ratedHistory.length).toFixed(1) : null;
                                const srmColorHex = getSrmColor(recipe.colorSRM);

                                return (
                                    <div
                                        key={recipe.id}
                                        className={`bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm hover:shadow-xl border-2 border-transparent hover:${theme.border} transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between relative overflow-hidden cursor-pointer`}
                                        onClick={() => navigateToRecipe(recipe.id)}
                                    >
                                        {/* BARRA SRM INFERIOR */}
                                        <div className="absolute bottom-0 left-0 w-full h-1.5 opacity-80" style={{ backgroundColor: srmColorHex }}></div>

                                        <button
                                            onClick={(e) => handleDeleteRecipe(e, recipe)}
                                            className="absolute top-4 right-4 text-gray-300 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10 p-1 bg-white dark:bg-slate-800 rounded-md shadow-sm" title="Eliminar receta"
                                        ><Trash2 size={18} /></button>

                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <span className={`inline-block px-3 py-1 rounded text-xs font-bold shadow-sm ${theme.badge}`}>{recipe.category || 'Sin Estilo'}</span>
                                                {brewCount > 0 && (
                                                    <div className="flex items-center gap-2 text-xs font-bold mr-6">
                                                        <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm"><CalendarClock size={12} /> {brewCount} {brewCount === 1 ? 'Lote' : 'Lotes'}</span>
                                                        {avgRating && <span className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm"><Star size={12} className="fill-amber-500 text-amber-500" /> {avgRating}</span>}
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight mb-2 group-hover:text-amber-600 transition-colors pr-6 tracking-tight">{recipe.name || 'Sin Nombre'}</h3>
                                            {recipe.description && (
                                                <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 mt-1">{recipe.description}</p>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-4 mt-5 text-sm text-slate-600 dark:text-slate-400 font-bold border-t border-gray-100 dark:border-slate-800 pt-4 pb-2">
                                            <span className="flex items-center gap-1" title="Volumen"><Droplets size={16} className="text-blue-500" /> {recipe.targetVolume || 0}L</span>
                                            <span className="flex items-center gap-1" title="Alcohol Est."><Thermometer size={16} className="text-red-500" /> {recipe.abv || 0}%</span>
                                            {(recipe.ibu > 0) && <span className="flex items-center gap-1" title="Amargor"><Activity size={16} className="text-orange-500" /> {recipe.ibu} IBU</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
