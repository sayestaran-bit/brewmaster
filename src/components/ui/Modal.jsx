// /src/components/ui/Modal.jsx
import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-5xl',
};

export default function Modal({ isOpen, onClose, title, children, size = 'md', className = '' }) {
    const handleKeyDown = useCallback(
        (e) => { if (e.key === 'Escape') onClose(); },
        [onClose]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className={`
          relative z-10 w-full ${sizes[size]}
          bg-white dark:bg-slate-900
          rounded-t-3xl sm:rounded-3xl
          border border-gray-100 dark:border-slate-800
          shadow-2xl overflow-hidden
          animate-slideUp
          ${className}
        `}
            >
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
                        <h3 className="text-lg font-black text-slate-800 dark:text-white">{title}</h3>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="overflow-y-auto max-h-[80vh]">
                    {children}
                </div>
            </div>
        </div>
    );
}
