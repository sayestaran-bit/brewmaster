// /src/components/ui/Card.jsx
import React from 'react';

const variants = {
    default: 'bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm',
    glass: 'glass shadow-sm',
    dark: 'bg-slate-800 border border-slate-700 shadow-lg',
    flat: 'bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800',
};

const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6 md:p-8',
    lg: 'p-8 md:p-10',
};

export default function Card({
    children,
    className = '',
    variant = 'default',
    padding = 'md',
    onClick,
    animate = false,
    animateDelay = 0,
}) {
    const delayClass = animateDelay > 0 ? `animate-delay-${animateDelay}` : '';
    const animateClass = animate ? `opacity-0 animate-fadeIn ${delayClass}` : '';

    return (
        <div
            className={`rounded-3xl transition-colors duration-200 ${variants[variant]} ${paddings[padding]} ${animateClass} ${onClick ? 'cursor-pointer' : ''} ${className}`}
            onClick={onClick}
        >
            {children}
        </div>
    );
}
