// /src/components/recipe/RecipeCard.jsx
import React from 'react';
import { CalendarClock, Droplets, Thermometer, Activity, Star, Trash2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { getSrmColor, getThemeForCategory } from '../../utils/helpers';
import Badge from '../ui/Badge';

const FEASIBILITY_CONFIG = {
    ready: { label: 'Lista', variant: 'success', Icon: CheckCircle },
    partial: { label: 'Parcial', variant: 'warning', Icon: AlertTriangle },
    blocked: { label: 'Sin Stock', variant: 'danger', Icon: XCircle },
};

export default function RecipeCard({ recipe, history = [], feasibility = null, onClick, onDelete }) {
    const theme = getThemeForCategory(recipe.category);
    const srmColorHex = getSrmColor(recipe.colorSRM);

    const recipeHistory = Array.isArray(history) ? history.filter(h => h.recipeName === recipe.name) : [];
    const brewCount = recipeHistory.length;
    const ratedHistory = recipeHistory.filter(h => h.tasting?.rating > 0);
    const avgRating = ratedHistory.length > 0
        ? (ratedHistory.reduce((sum, h) => sum + h.tasting.rating, 0) / ratedHistory.length).toFixed(1)
        : null;

    const fConfig = feasibility ? FEASIBILITY_CONFIG[feasibility] : null;

    const borderClass = fConfig
        ? (feasibility === 'ready' ? 'border-emerald-300 dark:border-emerald-700' :
            feasibility === 'partial' ? 'border-amber-300 dark:border-amber-700' :
                'border-red-300 dark:border-red-700')
        : `border-transparent hover:${theme.border}`;

    return (
        <div
            className={`relative bg-panel p-6 rounded-2xl shadow-sm hover:shadow-xl border-2 transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between overflow-hidden cursor-pointer ${borderClass}`}
            onClick={onClick}
        >
            {/* SRM color strip at bottom */}
            <div className="absolute bottom-0 left-0 w-full h-1.5 opacity-80" style={{ backgroundColor: srmColorHex }} />

            {/* Delete button */}
            {onDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(recipe); }}
                    className="absolute top-4 right-4 text-slate-300 dark:text-slate-700 hover:text-red-500 transition-colors z-10 p-2 bg-panel/50 backdrop-blur-sm rounded-xl shadow-sm border border-line"
                    title="Eliminar receta"
                >
                    <Trash2 size={18} />
                </button>
            )}

            {/* Card Body */}
            <div>
                {/* Badges row */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={theme.badge}>{recipe.category || 'Sin Estilo'}</Badge>
                        {fConfig && (
                            <Badge variant={fConfig.variant} icon={fConfig.Icon}>
                                {fConfig.label}
                            </Badge>
                        )}
                    </div>
                    {brewCount > 0 && (
                        <div className="flex items-center gap-1.5 text-xs font-bold mr-6">
                            <Badge variant="success" icon={CalendarClock}>
                                {brewCount} {brewCount === 1 ? 'Lote' : 'Lotes'}
                            </Badge>
                            {avgRating && (
                                <Badge variant="warning" icon={Star}>
                                    {avgRating}
                                </Badge>
                            )}
                        </div>
                    )}
                </div>

                <h3 className="text-xl font-black text-content leading-tight mb-2 group-hover:text-amber-600 transition-colors pr-6 tracking-tight">
                    {recipe.name || 'Sin Nombre'}
                </h3>
                {recipe.description && (
                    <p className="text-muted text-xs line-clamp-2 mt-1">{recipe.description}</p>
                )}
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-4 mt-5 text-sm text-slate-600 dark:text-slate-400 font-bold border-t border-line pt-4 pb-2">
                <span className="flex items-center gap-1" title="Volumen">
                    <Droplets size={16} className="text-blue-500" /> {recipe.targetVolume || 0}L
                </span>
                <span className="flex items-center gap-1" title="Alcohol Est.">
                    <Thermometer size={16} className="text-red-500" /> {recipe.abv || 0}%
                </span>
                {recipe.ibu > 0 && (
                    <span className="flex items-center gap-1" title="Amargor">
                        <Activity size={16} className="text-orange-500" /> {recipe.ibu} IBU
                    </span>
                )}
            </div>
        </div>
    );
}
