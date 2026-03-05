// /src/components/ui/StatCard.jsx
import React from 'react';

/**
 * KPI / metric stat card.
 * @param {object} props
 * @param {React.ComponentType} props.icon  - Lucide icon component
 * @param {string}  props.label             - Metric label (uppercase)
 * @param {string|number} props.value       - Primary metric value
 * @param {string}  [props.unit]            - Unit suffix (e.g., "L", "%")
 * @param {string}  [props.gradient]        - Tailwind gradient class (e.g., 'from-blue-500 to-blue-700')
 * @param {string}  [props.iconColor]       - Icon color class, defaults to white
 * @param {boolean} [props.dark]            - Force dark background instead of gradient
 * @param {string}  [props.className]
 * @param {number}  [props.animateDelay]    - 1-5 for stagger
 */
export default function StatCard({
    icon: Icon,
    label,
    value,
    unit,
    gradient,
    iconColor = 'text-white',
    dark = false,
    className = '',
    animateDelay = 0,
}) {
    const delayClass = animateDelay > 0 ? `animate-delay-${animateDelay}` : '';
    const base = `relative p-6 rounded-3xl shadow-lg overflow-hidden transition-transform duration-200 hover:scale-105 opacity-0 animate-fadeIn ${delayClass}`;

    const bg = dark
        ? 'bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm'
        : `bg-gradient-to-br ${gradient}`;

    const labelColor = dark ? 'text-slate-400' : 'text-white/70';
    const valueColor = dark ? 'text-slate-800 dark:text-white' : 'text-white';
    const unitColor = dark ? 'text-slate-500' : 'text-white/60';

    return (
        <div className={`${base} ${bg} ${className}`}>
            {/* Background watermark icon */}
            {Icon && (
                <div className={`absolute -right-4 -bottom-4 opacity-15 ${dark ? 'opacity-5 dark:opacity-10 text-slate-700 dark:text-slate-400' : 'text-white'}`}>
                    <Icon size={90} />
                </div>
            )}

            {/* Content */}
            <div className="relative z-10">
                <span className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${labelColor}`}>
                    {label}
                </span>
                <div className="flex items-end gap-1.5 leading-none">
                    <span className={`text-4xl md:text-5xl font-black ${valueColor}`}>
                        {value}
                    </span>
                    {unit && (
                        <span className={`text-xl font-bold mb-0.5 ${unitColor}`}>{unit}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
