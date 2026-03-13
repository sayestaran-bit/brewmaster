import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle, Loader2 } from 'lucide-react';

const Toast = ({ toast, onRemove }) => {
    const { id, message, type, duration } = toast;

    useEffect(() => {
        if (duration) {
            const timer = setTimeout(() => {
                onRemove(id);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [id, duration, onRemove]);

    const icons = {
        success: <CheckCircle2 className="text-emerald-500" size={20} />,
        error: <AlertCircle className="text-red-500" size={20} />,
        warning: <AlertTriangle className="text-amber-500" size={20} />,
        info: <Info className="text-blue-500" size={20} />,
        loading: <Loader2 className="text-blue-500 animate-spin" size={20} />
    };

    const bgColors = {
        success: 'bg-emerald-500/10 border-emerald-500/20',
        error: 'bg-red-500/10 border-red-500/20',
        warning: 'bg-amber-500/10 border-amber-500/20',
        info: 'bg-blue-500/10 border-blue-500/20',
        loading: 'bg-slate-500/10 border-slate-500/20'
    };

    return (
        <div className={`flex items-center gap-3 p-4 pr-12 rounded-2xl border backdrop-blur-md shadow-2xl animate-in slide-in-from-right-full duration-300 pointer-events-auto min-w-[300px] max-w-md ${bgColors[type] || bgColors.info}`}>
            <div className="flex-shrink-0">
                {icons[type] || icons.info}
            </div>
            <p className="text-sm font-bold text-content leading-tight">{message}</p>
            <button 
                onClick={() => onRemove(id)}
                className="absolute top-4 right-4 text-muted hover:text-content transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    );
};

const ToastContainer = ({ toasts, onRemove }) => {
    return (
        <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-3 pointer-events-none">
            {toasts.map(toast => (
                <Toast key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
};

export default ToastContainer;
