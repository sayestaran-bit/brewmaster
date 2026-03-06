// /src/components/ui/PageHeader.jsx
import React from 'react';

export default function PageHeader({
    icon: Icon,
    iconColor = 'text-amber-500',
    title,
    subtitle,
    action,
    className = '',
}) {
    return (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 ${className}`}>
            <div className="flex items-center gap-3">
                {Icon && (
                    <div className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-800 ${iconColor}`}>
                        <Icon size={22} />
                    </div>
                )}
                <div>
                    <h2 className="text-xl font-black text-content leading-tight">{title}</h2>
                    {subtitle && (
                        <p className="text-sm text-muted font-medium mt-0.5">{subtitle}</p>
                    )}
                </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}
