// /src/components/ui/Badge.jsx
import React from 'react';

const variants = {
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    info: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
    purple: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
};

const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
};

export default function Badge({ children, variant = 'default', size = 'sm', className = '', icon: Icon }) {
    return (
        <span className={`inline-flex items-center gap-1 font-bold rounded-lg ${variants[variant]} ${sizes[size]} ${className}`}>
            {Icon && <Icon size={10} />}
            {children}
        </span>
    );
}
