// /src/components/recipe/RecipeCard.jsx
import React from 'react';
import {
    CalendarClock,
    Droplets,
    Thermometer,
    Activity,
    Star,
    Trash2,
    CircleCheck,
    TriangleAlert,
    CircleX
} from 'lucide-react';
import { getSrmColor, getThemeForCategory } from '../../utils/helpers';
import Badge from '../ui/Badge';

const FEASIBILITY_CONFIG = {
    ready: { label: 'Lista', variant: 'success', Icon: CircleCheck },
    partial: { label: 'Parcial', variant: 'warning', Icon: TriangleAlert },
    blocked: { label: 'Sin Stock', variant: 'danger', Icon: CircleX },
};

export default function RecipeCard({
    recipe,
    history = [],
    feasibility = null,
    onClick,
    onDelete
}) {
    const category = recipe?.category || recipe?.style || 'IPA';
    const theme = getThemeForCategory(category);
    const srmColorHex = getSrmColor(recipe?.colorSRM);

    const safeHistory = Array.isArray(history) ? history : [];
    const recipeHistory = recipe?.name ? safeHistory.filter(h => h.recipeName === recipe.name) : [];
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

    const handleCardClick = (e) => {
        if (onClick) onClick(e);
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        if (onDelete) onDelete(recipe);
    };

    return (
        <div
            className={`relative bg-panel p-6 rounded-[2rem] shadow-sm hover:shadow-xl border-2 transition-all duration-300 hover:scale-[1.02] group flex flex-col justify-between overflow-hidden cursor-pointer ${borderClass}`}
            onClick={handleCardClick}
        >
            {/* SRM color strip at bottom - Refined with glassmorphism */}
            <div 
                className="absolute bottom-0 left-0 w-full h-2 opacity-90 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]" 
                style={{ 
                    backgroundColor: srmColorHex,
                    backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.1), transparent, rgba(0,0,0,0.1))'
                }} 
            />

            {/* Delete button (Top Right, hidden by default, elegant reveal) */}
            {onDelete && (
                <button
                    onClick={handleDeleteClick}
                    className="absolute top-4 right-4 text-slate-400 dark:text-slate-600 hover:text-red-500 transition-all z-20 p-2.5 bg-surface/80 backdrop-blur-md rounded-xl shadow-lg border border-line opacity-0 translate-y-[-10px] group-hover:opacity-100 group-hover:translate-y-0"
                    title="Eliminar receta"
                >
                    <Trash2 size={16} strokeWidth={2.5} />
                </button>
            )}

            {/* Card Body */}
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${theme.badge} px-3 py-1 text-[10px] uppercase tracking-widest`}>
                            {recipe?.category || 'Sin Estilo'}
                        </Badge>
                        {fConfig && (
                            <Badge variant={fConfig.variant} icon={fConfig.Icon} className="px-3 py-1 text-[10px] uppercase">
                                {fConfig.label}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                    {brewCount > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                            <CalendarClock size={12} className="text-emerald-500" />
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">{brewCount}</span>
                        </div>
                    )}
                    {avgRating && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">
                            <Star size={12} className="text-amber-500 fill-amber-500" />
                            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">{avgRating}</span>
                        </div>
                    )}
                </div>

                <h3 className="text-2xl font-black text-content leading-tight mb-2 group-hover:text-amber-600 transition-colors pr-8 tracking-tight">
                    {recipe?.name || 'Sin Nombre'}
                </h3>
                {recipe?.description && (
                    <p className="text-muted text-xs line-clamp-2 mt-2 leading-relaxed font-medium">
                        {recipe.description}
                    </p>
                )}
            </div>

            {/* Stats row - Mathematically Aligned & Mobile Responsive */}
            <div className="flex flex-wrap items-center justify-between gap-y-4 gap-x-2 mt-8 text-xs text-muted font-black border-t border-line/50 pt-5 pb-1 relative z-10">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2" title="Volumen">
                        <Droplets size={16} className="text-blue-500" /> 
                        <span className="text-content tabular-nums">{recipe?.targetVolume || 0}L</span>
                    </span>
                    <span className="flex items-center gap-2" title="Alcohol Est.">
                        <Thermometer size={16} className="text-red-500" /> 
                        <span className="text-content tabular-nums">{recipe?.abv || 0}%</span>
                    </span>
                </div>
                {(recipe?.ibu || 0) > 0 && (
                    <span className="flex items-center gap-2 bg-orange-500/5 px-3 py-1.5 rounded-xl border border-orange-500/10" title="Amargor">
                        <Activity size={16} className="text-orange-500" /> 
                        <span className="text-content tabular-nums">{recipe.ibu} <span className="opacity-50 text-[10px] ml-0.5">IBU</span></span>
                    </span>
                )}
            </div>
        </div>
    );
}
