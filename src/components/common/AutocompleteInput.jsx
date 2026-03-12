// /src/components/common/AutocompleteInput.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';

export default function AutocompleteInput({ value, onChange, onSelect, placeholder, category, inventory, onAddNewItem }) {
    const [showDrop, setShowDrop] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setShowDrop(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const safeInventory = Array.isArray(inventory) ? inventory : [];
    const filtered = safeInventory.filter(i =>
        (i.category || '').toLowerCase() === (category || '').toLowerCase() &&
        String(i.name || '').toLowerCase().includes(String(value || '').toLowerCase()) &&
        String(value || '').trim() !== ''
    );

    const exactMatch = safeInventory.some(i =>
        (i.category || '').toLowerCase() === (category || '').toLowerCase() &&
        String(i.name || '').toLowerCase() === String(value || '').toLowerCase().trim()
    );

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (filtered.length > 0) {
                const item = filtered[0];
                onChange(item);
                setShowDrop(false);
            } else if (!exactMatch && value?.trim()) {
                onAddNewItem(value, category);
                setShowDrop(false);
            }
        } else if (e.key === 'Escape') {
            setShowDrop(false);
        }
    };

    return (
        <div className="relative flex-1" ref={wrapperRef}>
            <input
                type="text"
                placeholder={placeholder}
                className="w-full p-3 border border-line rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-surface focus:bg-panel transition-colors text-content"
                value={value || ''}
                onChange={e => { onChange(e.target.value); setShowDrop(true); }}
                onFocus={() => setShowDrop(true)}
                onBlur={() => {
                    // Esperar un poco para permitir que onMouseDown de los items se dispare
                    setTimeout(() => {
                        setShowDrop(false);
                        onChange(value); // Asegurar persistencia del valor actual
                    }, 200);
                }}
                onKeyDown={handleKeyDown}
            />
            {showDrop && (value || '').trim() !== '' && (
                <div className="absolute z-50 w-full mt-1 bg-panel border border-line rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {filtered.map(item => (
                        <div
                            key={item.id}
                            className="p-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-sm text-content font-medium flex justify-between uppercase"
                            onMouseDown={(e) => { 
                                // Usamos onMouseDown para ganar a la pérdida de foco del input
                                onChange(item); 
                                setShowDrop(false); 
                            }}
                        >
                            <span>{item.name}</span>
                            <span className="text-gray-400 text-xs">
                                {Number(item.stock).toLocaleString('es-CL', { maximumFractionDigits: 2 })} {item.unit}
                            </span>
                        </div>
                    ))}
                    {!exactMatch && (
                        <div
                            className="p-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer text-sm text-blue-700 dark:text-blue-300 font-bold flex items-center gap-2 border-t border-line"
                            onMouseDown={() => { 
                                onAddNewItem(value, category); 
                                setShowDrop(false); 
                            }}
                        >
                            <Plus size={16} /> Añadir "{typeof value === 'object' ? value.name : value}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
