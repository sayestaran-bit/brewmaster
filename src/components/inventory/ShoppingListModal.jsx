// /src/components/inventory/ShoppingListModal.jsx
import React, { useState, useMemo } from 'react';
import { X, ShoppingCart, FileText, Download, Trash2, Plus, Info, Scale } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Button from '../ui/Button';

export default function ShoppingListModal({ isOpen, onClose, recipes, inventory }) {
    const [selectedRecipes, setSelectedRecipes] = useState([]);

    const addRecipeSelection = () => {
        const safeRecipes = Array.isArray(recipes) ? recipes : [];
        if (safeRecipes.length > 0) {
            setSelectedRecipes(prev => [...prev, {
                recipeId: safeRecipes[0].id,
                volume: Number(safeRecipes[0].targetVolume) || 20
            }]);
        } else {
            console.warn("ShoppingListModal: No hay recetas disponibles.");
        }
    };

    const clearAll = () => setSelectedRecipes([]);

    const updateRecipeSelection = (idx, field, value) => {
        const newSelected = [...selectedRecipes];
        newSelected[idx][field] = value;
        setSelectedRecipes(newSelected);
    };

    const removeRecipeSelection = (idx) => {
        setSelectedRecipes(prev => prev.filter((_, i) => i !== idx));
    };

    // Lógica de Consolidación
    const shoppingList = useMemo(() => {
        // Si no hay recetas seleccionadas, no calculamos nada
        if (selectedRecipes.length === 0) return [];

        const needed = {}; // { itemName: { amount, unit, category } }
        const safeRecipes = Array.isArray(recipes) ? recipes : [];

        selectedRecipes.forEach(sel => {
            const recipe = safeRecipes.find(r => r.id === sel.recipeId);
            if (!recipe) return;

            const scaleFactor = Number(sel.volume) / (recipe.targetVolume || 1);

            // Maltas
            if (recipe.ingredients?.malts) {
                recipe.ingredients.malts.forEach(m => {
                    const key = (m.name || '').trim().toLowerCase();
                    if (!key) return;
                    if (!needed[key]) needed[key] = { name: m.name, amount: 0, unit: 'kg', category: 'Malta' };
                    needed[key].amount += (Number(m.amount) || 0) * scaleFactor;
                });
            }
            // Lúpulos
            if (recipe.ingredients?.hops) {
                recipe.ingredients.hops.forEach(h => {
                    const key = (h.name || '').trim().toLowerCase();
                    if (!key) return;
                    if (!needed[key]) needed[key] = { name: h.name, amount: 0, unit: 'g', category: 'Lúpulo' };
                    needed[key].amount += (Number(h.amount) || 0) * scaleFactor;
                });
            }
            // Levadura
            if (recipe.ingredients?.yeast) {
                const y = recipe.ingredients.yeast;
                const name = typeof y === 'string' ? y : y.name;
                const key = (name || '').trim().toLowerCase();
                if (key) {
                    if (!needed[key]) needed[key] = { name: name, amount: 0, unit: 'sobre', category: 'Levadura' };
                    needed[key].amount += (Number(y.amount) || 1) * scaleFactor;
                }
            }
            // Otros (Aditivos / Sales)
            if (recipe.ingredients?.others) {
                recipe.ingredients.others.forEach(o => {
                    const key = (o.name || '').trim().toLowerCase();
                    if (!key) return;
                    // Use getEffectivePhase for consistency if needed, but here we just need category
                    const category = o.category || 'Aditivos';
                    if (!needed[key]) needed[key] = { name: o.name, amount: 0, unit: o.unit || 'un', category };
                    needed[key].amount += (Number(o.amount) || 0) * scaleFactor;
                });
            }
        });

        // Comparar con inventario
        const safeInventory = Array.isArray(inventory) ? inventory : [];
        return Object.values(needed).map(item => {
            const invItem = safeInventory.find(i => (i.name || '').trim().toLowerCase() === item.name.trim().toLowerCase());
            const currentStock = invItem ? (Number(invItem.stock) || 0) : 0;
            const toBuy = Math.max(0, item.amount - currentStock);

            return {
                ...item,
                needed: item.amount,
                current: currentStock,
                toBuy: toBuy
            };
        }).filter(item => item.toBuy > 0);
    }, [selectedRecipes, recipes, inventory]);

    if (!isOpen) return null;

    const exportToPDF = () => {
        try {
            const doc = jsPDF();
            doc.setFontSize(20);
            doc.text("Lista de Compras - BrewMaster", 14, 22);
            doc.setFontSize(11);
            doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);

            const tableData = shoppingList.map(item => [
                item.name,
                item.category,
                `${item.needed.toFixed(2)} ${item.unit}`,
                `${item.current.toFixed(2)} ${item.unit}`,
                `${item.toBuy.toFixed(2)} ${item.unit}`
            ]);

            autoTable(doc, {
                startY: 35,
                head: [['Ítem', 'Categoría', 'Necesario', 'En Stock', 'A Comprar']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] }
            });

            doc.save(`Lista_Compras_${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (err) {
            console.error("PDF Export Error:", err);
            alert("No se pudo generar el PDF. Revisa la consola.");
        }
    };

    const exportToExcel = () => {
        try {
            const data = shoppingList.map(item => ({
                "Ítem": item.name,
                "Categoría": item.category,
                "Total Necesario": item.needed.toFixed(2),
                "Stock Actual": item.current.toFixed(2),
                "Faltante": item.toBuy.toFixed(2),
                "Unidad": item.unit
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Lista de Compras");
            XLSX.writeFile(wb, `Lista_Compras_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (err) {
            console.error("Excel Export Error:", err);
            alert("No se pudo generar el Excel.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-200 dark:border-slate-800 animate-in zoom-in duration-200">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500 p-2.5 rounded-xl text-white shadow-lg shadow-blue-500/20">
                            <ShoppingCart size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-white">Lista de Compras</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Planifica tu próxima producción</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Sección: Qué vamos a cocinar */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase text-sm tracking-widest">
                                <Plus size={18} className="text-blue-500" /> Recetas a Programar
                            </h3>
                            <div className="flex gap-2">
                                {selectedRecipes.length > 0 && (
                                    <button
                                        onClick={clearAll}
                                        className="text-xs font-black bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all border border-red-100 dark:border-red-900/30"
                                    >
                                        Limpiar
                                    </button>
                                )}
                                <button
                                    onClick={addRecipeSelection}
                                    className="text-xs font-black bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all border border-blue-100 dark:border-blue-800"
                                >
                                    + Agregar Receta
                                </button>
                            </div>
                        </div>

                        {selectedRecipes.length === 0 ? (
                            <div className="border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl p-8 text-center bg-gray-50/50 dark:bg-slate-800/50">
                                <p className="text-slate-400 font-bold italic">Selecciona las cervezas que quieres fabricar para calcular los insumos.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedRecipes.map((sel, idx) => (
                                    <div key={idx} className="flex flex-col md:flex-row gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm items-center">
                                        <select
                                            className="flex-1 w-full md:w-auto p-3 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 dark:text-white"
                                            value={sel.recipeId}
                                            onChange={(e) => updateRecipeSelection(idx, 'recipeId', e.target.value)}
                                        >
                                            {recipes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.category})</option>)}
                                        </select>
                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                            <div className="relative flex-1 md:w-28">
                                                <input
                                                    type="number"
                                                    className="w-full p-3 pr-8 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-center font-black text-slate-800 dark:text-white"
                                                    value={sel.volume}
                                                    onChange={(e) => updateRecipeSelection(idx, 'volume', e.target.value)}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-slate-400 italic">L</span>
                                            </div>
                                            <button
                                                onClick={() => removeRecipeSelection(idx)}
                                                className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sección: Resultados Consolidados */}
                    {shoppingList.length > 0 && (
                        <div className="space-y-4 animate-fadeIn">
                            <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase text-sm tracking-widest">
                                <ShoppingCart size={18} className="text-emerald-500" /> Insumos Faltantes
                            </h3>

                            <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Ítem</th>
                                            <th className="px-6 py-4 text-center">Faltan</th>
                                            <th className="px-6 py-4 text-right">Necesario</th>
                                            <th className="px-6 py-4 text-right">Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                        {shoppingList.map((item, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-slate-800 dark:text-white truncate block max-w-[200px]">{item.name}</span>
                                                    <span className="text-[10px] font-black uppercase text-slate-400">{item.category}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full font-black text-sm">
                                                        {item.toBuy.toFixed(2)} {item.unit}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                                                    {item.needed.toFixed(2)} {item.unit}
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                                                    {item.current.toFixed(2)} {item.unit}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {selectedRecipes.length > 0 && shoppingList.length === 0 && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800 text-center">
                            <p className="text-emerald-700 dark:text-emerald-400 font-bold">¡Tienes stock suficiente para todas las recetas seleccionadas! No necesitas comprar nada adicional.</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col md:flex-row gap-3">
                    <button
                        onClick={exportToPDF}
                        disabled={shoppingList.length === 0}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50"
                    >
                        <FileText size={22} /> Exportar como PDF
                    </button>
                    <button
                        onClick={exportToExcel}
                        disabled={shoppingList.length === 0}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50"
                    >
                        <Download size={22} /> Exportar como Excel
                    </button>
                </div>
            </div>
        </div>
    );
}
