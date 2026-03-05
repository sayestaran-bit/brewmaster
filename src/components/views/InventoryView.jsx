// /src/components/views/InventoryView.jsx
import React, { useState } from 'react';
import { Package, Scale, Plus, Save, Wheat, Leaf, Beaker, Trash2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';

export default function InventoryView() {
    const { inventory, setInventory, updateCloudData } = useAppContext();
    const [showInvForm, setShowInvForm] = useState(false);
    const [newInvItem, setNewInvItem] = useState({ category: 'Malta', name: '', stock: 0, unit: 'kg', price: 0 });

    const totalInventoryValue = inventory.reduce((acc, item) => acc + ((item.stock || 0) * (item.price || 0)), 0);

    const handleAddInvItem = () => {
        if (!newInvItem.name.trim()) return;
        const newInv = [...inventory, { ...newInvItem, id: 'inv-' + Date.now(), stock: Number(newInvItem.stock), price: Number(newInvItem.price) }];
        setInventory(newInv);
        updateCloudData({ inventory: newInv });
        setShowInvForm(false);
        setNewInvItem({ category: 'Malta', name: '', stock: 0, unit: 'kg', price: 0 });
    };

    const handleDeleteInvItem = (id) => {
        const newInv = inventory.filter(item => item.id !== id);
        setInventory(newInv);
        updateCloudData({ inventory: newInv });
    };

    const updateInvItem = (id, field, value) => {
        const newInv = [...inventory];
        const index = newInv.findIndex(inv => inv.id === id);
        newInv[index][field] = field === 'stock'
            ? parseFloat(Number(value).toFixed(4))
            : Number(value) || 0;
        setInventory(newInv);
        updateCloudData({ inventory: newInv });
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 dark:border-slate-700 pb-4 gap-4">
                <div className="flex flex-col">
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <Package className="text-blue-500" size={32} /> Tu Inventario
                    </h2>
                    <p className="text-sm font-bold text-slate-500 mt-2 flex items-center gap-2"><Scale size={16} /> Capital Estimado: <span className="text-emerald-600 dark:text-emerald-400 font-black">{formatCurrency(totalInventoryValue)}</span></p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => setShowInvForm(!showInvForm)} className="flex-1 md:flex-none justify-center flex items-center gap-2 text-white font-bold bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition-colors shadow-sm">
                        <Plus size={20} /> Añadir Insumo
                    </button>
                </div>
            </div>

            {showInvForm && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-end mb-8 animate-fadeIn">
                    <div className="w-full md:w-1/5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categoría</label>
                        <select className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white" value={newInvItem.category} onChange={e => setNewInvItem({ ...newInvItem, category: e.target.value, unit: e.target.value === 'Levadura' ? 'sobre' : e.target.value === 'Lúpulo' ? 'g' : 'kg' })}>
                            <option value="Malta">Malta</option>
                            <option value="Lúpulo">Lúpulo</option>
                            <option value="Levadura">Levadura</option>
                        </select>
                    </div>
                    <div className="w-full md:w-2/5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre del Insumo</label>
                        <input type="text" className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" placeholder="Ej: Malta Caramelo" value={newInvItem.name} onChange={e => setNewInvItem({ ...newInvItem, name: e.target.value })} />
                    </div>
                    <div className="w-full md:w-1/5 flex gap-2">
                        <div className="w-1/2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Stock</label>
                            <input type="number" className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-center bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={newInvItem.stock} onChange={e => setNewInvItem({ ...newInvItem, stock: e.target.value })} />
                        </div>
                        <div className="w-1/2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Unidad</label>
                            <input type="text" className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none bg-gray-100 dark:bg-slate-900 text-center text-gray-500 dark:text-gray-400 font-bold" value={newInvItem.unit} disabled />
                        </div>
                    </div>
                    <div className="w-full md:w-1/5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Precio Unit.</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-400">$</span>
                            <input type="number" className="w-full p-3 pl-8 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={newInvItem.price} onChange={e => setNewInvItem({ ...newInvItem, price: e.target.value })} />
                        </div>
                    </div>
                    <button onClick={handleAddInvItem} className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex justify-center items-center h-[50px] px-8 transition-colors shadow-sm">
                        <Save size={20} />
                    </button>
                </div>
            )}

            {['Malta', 'Lúpulo', 'Levadura'].map(category => {
                const catIcon = category === 'Malta' ? <Wheat size={18} className="text-amber-500" /> : category === 'Lúpulo' ? <Leaf size={18} className="text-green-500" /> : <Beaker size={18} className="text-blue-500" />;
                const categoryItems = Array.isArray(inventory) ? inventory.filter(i => i.category === category) : [];

                return (
                    <div key={category} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden mb-8">
                        <div className="bg-gray-50 dark:bg-slate-800/50 px-6 py-4 border-b dark:border-slate-800 font-black text-slate-800 dark:text-white text-lg flex items-center gap-2">
                            {catIcon} {category}s
                        </div>
                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="text-xs text-slate-400 uppercase bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 font-bold tracking-wider text-left w-1/3">Ingrediente</th>
                                        <th className="px-6 py-4 font-bold tracking-wider text-left w-1/4">Stock Actual</th>
                                        <th className="px-6 py-4 font-bold tracking-wider text-left w-1/4">Costo Unidad</th>
                                        <th className="px-6 py-4 text-center w-16">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                                    {categoryItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 group transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{item.name}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={parseFloat(Number(item.stock).toFixed(4))}
                                                        onChange={(e) => updateInvItem(item.id, 'stock', e.target.value)}
                                                        className="w-full max-w-[100px] p-2 border border-gray-200 dark:border-slate-700 rounded-lg text-center focus:ring-2 focus:ring-blue-500 outline-none font-medium bg-white dark:bg-slate-800 dark:text-white transition-all"
                                                    />
                                                    <span className="text-gray-400 font-bold shrink-0">{item.unit}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-gray-400">
                                                    <span className="shrink-0">$</span>
                                                    <input
                                                        type="number"
                                                        value={item.price}
                                                        onChange={(e) => updateInvItem(item.id, 'price', e.target.value)}
                                                        className="w-full max-w-[100px] p-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 transition-all"
                                                    />
                                                    <span className="text-xs shrink-0">/ {item.unit}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => handleDeleteInvItem(item.id)} className="text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            })}
        </div>
    );
}
