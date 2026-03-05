// /src/components/ui/Button.jsx
import React from 'react';
import { Loader2 } from 'lucide-react';

const variants = {
    primary: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 shadow-lg hover:shadow-amber-500/25 hover:-translate-y-0.5',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-sm',
    ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400',
    outline: 'bg-transparent border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm',
};

const sizes = {
    xs: 'text-[11px] px-2.5 py-1.5 gap-1',
    sm: 'text-sm px-3 py-2 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3 gap-2',
};

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon,
    iconRight: IconRight,
    className = '',
    onClick,
    type = 'button',
    title,
}) {
    const isDisabled = disabled || loading;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isDisabled}
            title={title}
            className={`
        inline-flex items-center justify-center font-bold rounded-xl
        transition-all duration-200 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
        ${variants[variant]} ${sizes[size]} ${className}
      `}
        >
            {loading ? (
                <Loader2 size={14} className="animate-spin shrink-0" />
            ) : Icon ? (
                <Icon size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} className="shrink-0" />
            ) : null}
            {children}
            {IconRight && !loading && (
                <IconRight size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} className="shrink-0" />
            )}
        </button>
    );
}
