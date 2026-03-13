// /src/components/inventory/ShoppingListModal.jsx
import React, { useState, useMemo } from 'react';
import { X, ShoppingCart, FileText, Download, Trash2, Plus, Info, Scale, Save } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Button from '../ui/Button';
import { useInventory } from '../../hooks/useInventory';
import { useToast } from '../../context/ToastContext';

export default function ShoppingListModal({ isOpen, onClose, recipes, inventory, loading = false }) {
    const { addShoppingList } = useInventory();
    const { addToast } = useToast();
    const [selectedRecipes, setSelectedRecipes] = useState([]);
    const [manualItems, setManualItems] = useState([]);

    // Pre-poblar con la primera receta si se abre y está vacío
    React.useEffect(() => {
        if (isOpen && selectedRecipes.length === 0 && recipes?.length > 0) {
            addRecipeSelection();
        }
    }, [isOpen, recipes]);

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

    const addManualItem = () => {
        setManualItems(prev => [...prev, { name: '', amount: 1, unit: 'kg', category: 'Malta' }]);
    };

    const updateManualItem = (idx, field, value) => {
        const newItems = [...manualItems];
        newItems[idx][field] = value;
        setManualItems(newItems);
    };

    const removeManualItem = (idx) => {
        setManualItems(prev => prev.filter((_, i) => i !== idx));
    };

    // Lógica de Consolidación
    const shoppingList = useMemo(() => {
        // Si no hay recetas seleccionadas, no calculamos nada
        if (selectedRecipes.length === 0) return [];

        const needed = {}; // { itemName: { amount, unit, category } }
        const safeRecipes = Array.isArray(recipes) ? recipes : [];

        // Función auxiliar para normalizar unidades y sumar
        const addIngredient = (name, amount, unit, category) => {
            const normalizedName = (name || '').trim().toLowerCase();
            if (!normalizedName) return;

            if (!needed[normalizedName]) {
                needed[normalizedName] = { name, amount: 0, unit, category };
            }

            let valueToAdd = Number(amount) || 0;
            const targetUnit = needed[normalizedName].unit;

            // Normalización básica kg <-> g
            if (unit === 'kg' && targetUnit === 'g') {
                valueToAdd *= 1000;
            } else if (unit === 'g' && targetUnit === 'kg') {
                valueToAdd /= 1000;
            }

            needed[normalizedName].amount += valueToAdd;
        };

        // 1. Inyectar ítems manuales
        manualItems.forEach(item => {
            addIngredient(item.name, item.amount, item.unit, item.category);
        });

        // 2. Procesar recetas
        selectedRecipes.forEach(sel => {
            const recipe = safeRecipes.find(r => r.id === sel.recipeId);
            if (!recipe) return;

            const scaleFactor = Number(sel.volume) / (recipe.targetVolume || 1);

            // Maltas (Base: kg)
            if (recipe.ingredients?.malts) {
                recipe.ingredients.malts.forEach(m => addIngredient(m.name, (Number(m.amount) || 0) * scaleFactor, 'kg', 'Malta'));
            }
            // Lúpulos (Base: g)
            if (recipe.ingredients?.hops) {
                recipe.ingredients.hops.forEach(h => addIngredient(h.name, (Number(h.amount) || 0) * scaleFactor, 'g', 'Lúpulo'));
            }
            // Levadura (Base: sobre)
            if (recipe.ingredients?.yeast) {
                const y = recipe.ingredients.yeast;
                const name = typeof y === 'string' ? y : y.name;
                const amount = typeof y === 'string' ? 1 : (Number(y.amount) || 1);
                addIngredient(name, amount * scaleFactor, 'sobre', 'Levadura');
            }
            // Otros (Aditivos / Sales)
            if (recipe.ingredients?.others) {
                recipe.ingredients.others.forEach(o => {
                    const category = o.category || 'Aditivos';
                    addIngredient(o.name, (Number(o.amount) || 0) * scaleFactor, o.unit || 'un', category);
                });
            }
        });

        // Comparar con inventario y redondear precision final
        const safeInventory = Array.isArray(inventory) ? inventory : [];
        return Object.values(needed).map(item => {
            const invItem = safeInventory.find(i => (i.name || '').trim().toLowerCase() === item.name.trim().toLowerCase());
            const currentStock = invItem ? (Number(invItem.stock) || 0) : 0;
            const absoluteNeeded = parseFloat(item.amount.toFixed(4)); // Rounding at the end of accumulation
            const toBuy = Math.max(0, absoluteNeeded - currentStock);

            return {
                ...item,
                needed: absoluteNeeded,
                current: currentStock,
                toBuy: parseFloat(toBuy.toFixed(4))
            };
        }).filter(item => item.toBuy > 0);
    }, [selectedRecipes, manualItems, recipes, inventory]);

    if (!isOpen) return null;

    const exportToPDF = () => {
        try {
            const doc = jsPDF();
            const pageHeight = doc.internal.pageSize.getHeight();
            
            doc.setFontSize(22);
            doc.setTextColor(59, 130, 246);
            doc.text("Plan de Compra BrewMaster", 14, 22);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 30);
            
            let currentY = 40;

            const checkPageBreak = (neededHeight) => {
                if (currentY + neededHeight > pageHeight - 20) {
                    doc.addPage();
                    currentY = 20;
                    return true;
                }
                return false;
            };

            // Sección 1: Recetas a Fabricar (Listadas por separado incluso si se repiten)
            if (selectedRecipes.length > 0) {
                checkPageBreak(30);
                doc.setFontSize(14);
                doc.setTextColor(30);
                doc.text("1. Detalle de Producción", 14, currentY);
                currentY += 8;

                const recipeData = selectedRecipes.map(sel => {
                    const r = recipes.find(rec => rec.id === sel.recipeId);
                    return [r?.name || 'Receta Desconocida', r?.category || '-', `${sel.volume} Litros`];
                });

                autoTable(doc, {
                    startY: currentY,
                    head: [['Receta', 'Estilo', 'Volumen']],
                    body: recipeData,
                    theme: 'grid',
                    headStyles: { fillColor: [71, 85, 105] },
                    margin: { left: 14 },
                    styles: { fontSize: 9 }
                });

                currentY = doc.lastAutoTable.finalY + 15;
            }

            // Sección 2: Lista de Compras Consolidada
            if (shoppingList.length > 0) {
                checkPageBreak(30);
                doc.setFontSize(14);
                doc.setTextColor(30);
                doc.text("2. Insumos a Comprar (Consolidado)", 14, currentY);
                currentY += 8;

                const tableData = shoppingList.map(item => [
                    item.name,
                    item.category,
                    `${item.needed.toFixed(2)} ${item.unit}`,
                    `${item.current.toFixed(2)} ${item.unit}`,
                    `${item.toBuy.toFixed(2)} ${item.unit}`
                ]);

                autoTable(doc, {
                    startY: currentY,
                    head: [['Ítem', 'Categoría', 'Necesario', 'En Stock', 'A Comprar']],
                    body: tableData,
                    theme: 'striped',
                    headStyles: { fillColor: [16, 185, 129] },
                    margin: { left: 14 },
                    styles: { fontSize: 9 }
                });
            }

            doc.save(`Plan_Compra_${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (err) {
            console.error("PDF Export Error:", err);
            addToast("No se pudo generar el PDF.", "error");
        }
    };

    const handleSaveDraft = async () => {
        if (shoppingList.length === 0) return;
        
        const totalEstCost = shoppingList.reduce((acc, item) => {
            const invItem = inventory.find(i => i.name.toLowerCase() === item.name.toLowerCase());
            return acc + (item.toBuy * (invItem?.price || 0));
        }, 0);

        try {
            await addShoppingList({
                items: shoppingList,
                totalEstCost,
                status: 'draft',
                recipes: selectedRecipes.map(s => {
                    const r = recipes.find(rec => rec.id === s.recipeId);
                    return { name: r?.name, volume: s.volume };
                })
            });
            addToast('¡Lista guardada como borrador!', 'success');
            onClose();
        } catch (error) {
            console.error("Error saving shopping list:", error);
            addToast('Error al guardar la lista.', 'error');
        }
    };

    const exportToExcel = () => {
        try {
            const wb = XLSX.utils.book_new();

            // Hoja 1: Resumen de Producción
            const productionData = selectedRecipes.map(sel => {
                const r = recipes.find(rec => rec.id === sel.recipeId);
                return {
                    "Receta": r?.name || 'Receta Desconocida',
                    "Estilo": r?.category || '-',
                    "Volumen (L)": sel.volume
                };
            });
            const wsProduction = XLSX.utils.json_to_sheet(productionData);
            XLSX.utils.book_append_sheet(wb, wsProduction, "Producción");

            // Hoja 2: Lista de Compras
            const shoppingData = shoppingList.map(item => ({
                "Ítem": item.name,
                "Categoría": item.category,
                "Necesario": item.needed.toFixed(2),
                "En Stock": item.current.toFixed(2),
                "A Comprar": item.toBuy.toFixed(2),
                "Unidad": item.unit
            }));
            const wsShopping = XLSX.utils.json_to_sheet(shoppingData);
            XLSX.utils.book_append_sheet(wb, wsShopping, "Lista de Compras");

            XLSX.writeFile(wb, `Plan_Compra_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (err) {
            console.error("Excel Export Error:", err);
            addToast("No se pudo generar el Excel.", "error");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-panel w-full max-w-4xl rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_0_50px_-12px_rgba(0,0,0,1)] flex flex-col max-h-[90vh] overflow-hidden border border-line dark:border-white/10 animate-in zoom-in duration-200">

                {/* Header */}
                <div className="p-6 border-b border-line flex justify-between items-center bg-black/5 dark:bg-white/5">
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

                        {loading ? (
                            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                                <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                                <p className="text-slate-500 font-bold animate-pulse text-sm uppercase tracking-widest">Cargando recetas...</p>
                            </div>
                        ) : selectedRecipes.length === 0 ? (
                            <div className="border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl p-8 text-center bg-gray-50/50 dark:bg-slate-800/50">
                                <p className="text-slate-400 font-bold italic">Selecciona las cervezas que quieres fabricar para calcular los insumos.</p>
                                {recipes?.length === 0 && (
                                    <p className="text-amber-500 text-xs mt-2 font-bold uppercase">No se encontraron recetas guardadas.</p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedRecipes.map((sel, idx) => (
                                    <div key={idx} className="flex flex-col md:flex-row gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm items-center">
                                        <select
                                            className="flex-1 w-full md:w-auto p-3 bg-surface border border-line rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-content"
                                            value={sel.recipeId}
                                            onChange={(e) => updateRecipeSelection(idx, 'recipeId', e.target.value)}
                                        >
                                            {recipes.map(r => <option key={r.id} value={r.id} className="bg-panel">{r.name} ({r.category})</option>)}
                                        </select>
                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                            <div className="relative flex-1 md:w-28">
                                                <input
                                                    type="number"
                                                    className="w-full p-3 pr-8 bg-surface border border-line rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-center font-black text-content"
                                                    value={sel.volume}
                                                    onChange={(e) => updateRecipeSelection(idx, 'volume', e.target.value)}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-muted italic">L</span>
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

                    {/* Sección: Ítems Manuales */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase text-sm tracking-widest">
                                <Plus size={18} className="text-amber-500" /> Extras / Manuales
                            </h3>
                            <button
                                onClick={addManualItem}
                                className="text-xs font-black bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all border border-amber-100 dark:border-amber-800"
                            >
                                + Agregar Ítem
                            </button>
                        </div>
                        
                        {manualItems.map((item, idx) => (
                            <div key={idx} className="flex flex-col md:flex-row gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm items-center">
                                <input 
                                    type="text"
                                    placeholder="Nombre del insumo"
                                    className="flex-1 w-full md:w-auto p-3 bg-surface border border-line rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-bold text-content"
                                    value={item.name}
                                    onChange={(e) => updateManualItem(idx, 'name', e.target.value)}
                                />
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <input 
                                        type="number"
                                        className="w-20 p-3 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-center font-bold"
                                        value={item.amount}
                                        onChange={(e) => updateManualItem(idx, 'amount', e.target.value)}
                                    />
                                    <select 
                                        className="w-24 p-3 bg-surface border border-line rounded-xl outline-none text-content"
                                        value={item.unit}
                                        onChange={(e) => updateManualItem(idx, 'unit', e.target.value)}
                                    >
                                        <option value="kg" className="bg-panel">kg</option>
                                        <option value="g" className="bg-panel">g</option>
                                        <option value="un" className="bg-panel">un</option>
                                        <option value="sobre" className="bg-panel">sobre</option>
                                    </select>
                                    <button onClick={() => removeManualItem(idx)} className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Sección: Resultados Consolidados */}
                    {shoppingList.length > 0 && (
                        <div className="space-y-4 animate-fadeIn">
                            <h3 className="font-black text-content flex items-center gap-2 uppercase text-sm tracking-widest">
                                <ShoppingCart size={18} className="text-emerald-500" /> Insumos Faltantes
                            </h3>

                            <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-black/5 dark:bg-white/5 text-[10px] font-black uppercase text-muted tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Ítem</th>
                                            <th className="px-6 py-4 text-center">Faltan</th>
                                            <th className="px-6 py-4 text-right">Necesario</th>
                                            <th className="px-6 py-4 text-right">Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line">
                                        {shoppingList.map((item, i) => (
                                            <tr key={i} className="hover:bg-black/5 transition-colors text-content">
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-content truncate block max-w-[200px]">{item.name}</span>
                                                    <span className="text-[10px] font-black uppercase text-muted">{item.category}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full font-black text-sm">
                                                        {item.toBuy.toFixed(2)} {item.unit}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-muted font-medium whitespace-nowrap">
                                                    {item.needed.toFixed(2)} {item.unit}
                                                </td>
                                                <td className="px-6 py-4 text-right text-muted font-medium whitespace-nowrap">
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
                <div className="p-6 border-t border-line bg-black/5 dark:bg-white/5 flex flex-wrap gap-3">
                    <button
                        onClick={handleSaveDraft}
                        disabled={shoppingList.length === 0}
                        className="flex-1 min-w-[200px] bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50"
                    >
                        <Save size={22} /> Guardar Borrador
                    </button>
                    <button
                        onClick={exportToPDF}
                        disabled={shoppingList.length === 0}
                        className="flex-1 min-w-[200px] bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50"
                    >
                        <FileText size={22} /> Exportar como PDF
                    </button>
                    <button
                        onClick={exportToExcel}
                        disabled={shoppingList.length === 0}
                        className="flex-1 min-w-[200px] bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50"
                    >
                        <Download size={22} /> Excel
                    </button>
                </div>
            </div>
        </div>
    );
}
