// /src/components/common/AutocompleteInput.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';

export default function AutocompleteInput({ value, onChange, placeholder, category, inventory, onAddNewItem }) {
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
        i.category === category &&
        (i.name || '').toLowerCase().includes((value || '').toLowerCase()) &&
        (value || '').trim() !== ''
    );

    const exactMatch = safeInventory.some(i =>
        i.category === category &&
        (i.name || '').toLowerCase() === (value || '').toLowerCase().trim()
    );

    return (
        <div className="relative flex-1" ref={wrapperRef}>
            <input
                type="text"
                placeholder={placeholder}
                className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                value={value || ''}
                onChange={e => { onChange(e.target.value); setShowDrop(true); }}
                onFocus={() => setShowDrop(true)}
            />
            {showDrop && (value || '').trim() !== '' && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {filtered.map(item => (
                        <div
                            key={item.id}
                            className="p-3 hover:bg-amber-50 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-800 dark:text-slate-200 font-medium flex justify-between"
                            onClick={() => { onChange(item.name); setShowDrop(false); }}
                        >
                            <span>{item.name}</span>
                            <span className="text-gray-400 text-xs">
                                {Number(item.stock).toLocaleString('es-CL', { maximumFractionDigits: 2 })} {item.unit}
                            </span>
                        </div>
                    ))}
                    {!exactMatch && (
                        <div
                            className="p-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer text-sm text-blue-700 dark:text-blue-300 font-bold flex items-center gap-2 border-t border-blue-100 dark:border-slate-700"
                            onClick={() => { onAddNewItem(value, category); setShowDrop(false); }}
                        >
                            <Plus size={16} /> Añadir "{value}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
