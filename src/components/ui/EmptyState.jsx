// /src/components/ui/EmptyState.jsx
import React from 'react';

export default function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    onAction,
    className = '',
}) {
    return (
        <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
            {Icon && (
                <div className="bg-slate-100 dark:bg-slate-800 p-5 rounded-full mb-5">
                    <Icon size={36} className="text-slate-400 dark:text-slate-500" />
                </div>
            )}
            <h3 className="text-lg font-black text-slate-700 dark:text-slate-300 mb-2">{title}</h3>
            {description && (
                <p className="text-sm text-slate-400 dark:text-slate-500 font-medium max-w-xs leading-relaxed mb-6">
                    {description}
                </p>
            )}
            {action && onAction && (
                <button
                    onClick={onAction}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-amber-500/25"
                >
                    {action}
                </button>
            )}
        </div>
    );
}
