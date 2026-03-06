// /src/components/ui/Skeleton.jsx
import React from 'react';

function SkeletonBase({ className = '' }) {
    return (
        <div
            className={`
        relative overflow-hidden bg-slate-200 dark:bg-slate-800 rounded-lg
        before:absolute before:inset-0
        before:bg-gradient-to-r before:from-transparent before:via-white/40 dark:before:via-white/10 before:to-transparent
        before:animate-shimmer before:bg-[length:200%_100%]
        ${className}
      `}
        />
    );
}

export function SkeletonText({ lines = 1, className = '' }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <SkeletonBase
                    key={i}
                    className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`}
                />
            ))}
        </div>
    );
}

export function SkeletonCard({ className = '' }) {
    return (
        <div className={`bg-panel border border-line rounded-3xl p-6 space-y-4 ${className}`}>
            <div className="flex items-center gap-3">
                <SkeletonBase className="w-10 h-10 rounded-2xl" />
                <div className="flex-1 space-y-2">
                    <SkeletonBase className="h-4 w-2/3" />
                    <SkeletonBase className="h-3 w-1/3" />
                </div>
            </div>
            <SkeletonText lines={3} />
        </div>
    );
}

export function SkeletonStatCard({ className = '' }) {
    return (
        <div className={`rounded-3xl p-6 space-y-3 bg-slate-200 dark:bg-slate-800 ${className}`}>
            <SkeletonBase className="h-3 w-24 bg-white/30 dark:bg-white/10" />
            <SkeletonBase className="h-10 w-32 bg-white/30 dark:bg-white/10" />
        </div>
    );
}

export function SkeletonTableRow({ cols = 5 }) {
    return (
        <tr>
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <SkeletonBase className="h-4 w-full" />
                </td>
            ))}
        </tr>
    );
}

export default SkeletonBase;
