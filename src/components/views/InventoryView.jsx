// /src/components/views/InventoryView.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Scale, Plus, Save, Wheat, Leaf, Beaker, Trash2, Droplets, TrendingUp, Info, ListChecks } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { formatCurrency } from '../../utils/formatters';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import ShoppingListModal from '../inventory/ShoppingListModal';

export default function InventoryView() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const isGuest = currentUser?.isAnonymous;
    const guestTooltip = "Regístrate para crear recetas ilimitadas y más!";
    const { recipes } = useAppContext();
    const { inventory, addItem, updateItem, deleteItem } = useInventory();
    const [newInvItem, setNewInvItem] = useState({ category: 'Malta', name: '', stock: 0, unit: 'kg', price: 0, description: '' });
    const [showInvForm, setShowInvForm] = useState(false);
    const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);

    const totalInventoryValue = inventory.reduce((acc, item) => acc + ((item.stock || 0) * (item.price || 0)), 0);

    const handleAddInvItem = async () => {
        if (!newInvItem.name.trim()) return;
        await addItem({ ...newInvItem, stock: Number(newInvItem.stock), price: Number(newInvItem.price) });
        setNewInvItem({ category: 'Malta', name: '', stock: 0, unit: 'kg', price: 0, description: '' });
    };

    const handleDeleteInvItem = async (id) => {
        if (window.confirm('¿Seguro que deseas eliminar este insumo?')) {
            await deleteItem(id);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <PageHeader
                icon={Package}
                iconColor="text-blue-500"
                title="Tu Inventario"
                subtitle={<span className="flex items-center gap-1.5"><Scale size={14} /> Capital Estimado: <span className="text-emerald-600 dark:text-emerald-400 font-black">{formatCurrency(totalInventoryValue)}</span></span>}
                action={
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" icon={ListChecks} onClick={() => setIsShoppingListOpen(true)} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                            Lista de Compras
                        </Button>
                        <Button variant="outline" size="sm" icon={TrendingUp} onClick={() => navigate('/costs')} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                            Costos
                        </Button>
                        <Button variant="secondary" size="sm" icon={Plus} disabled={isGuest} title={isGuest ? guestTooltip : undefined} onClick={() => setShowInvForm(!showInvForm)}>
                            Añadir Insumo
                        </Button>
                    </div>
                }
            />

            <ShoppingListModal
                isOpen={isShoppingListOpen}
                onClose={() => setIsShoppingListOpen(false)}
                recipes={recipes || []}
                inventory={inventory || []}
            />

            {showInvForm && (
                <div className="bg-panel p-6 rounded-2xl shadow-sm border border-line flex flex-wrap gap-4 items-end mb-8 animate-fadeIn">
                    <div className="w-full md:w-1/5">
                        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Categoría</label>
                        <select className="w-full p-3 border border-line rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-surface text-content" value={newInvItem.category} onChange={e => setNewInvItem({ ...newInvItem, category: e.target.value, unit: e.target.value === 'Levadura' ? 'sobre' : e.target.value === 'Lúpulo' || e.target.value === 'Sales Minerales' ? 'g' : e.target.value === 'Aditivos' ? 'un' : 'kg' })}>
                            <option value="Malta">Malta</option>
                            <option value="Lúpulo">Lúpulo</option>
                            <option value="Levadura">Levadura</option>
                            <option value="Sales Minerales">Sales Minerales</option>
                            <option value="Aditivos">Aditivos</option>
                        </select>
                    </div>
                    <div className="w-full md:w-2/5">
                        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Nombre del Insumo</label>
                        <input type="text" className="w-full p-3 border border-line rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-surface text-content" placeholder="Ej: Malta Caramelo" value={newInvItem.name} onChange={e => setNewInvItem({ ...newInvItem, name: e.target.value })} />
                    </div>
                    <div className="w-full md:w-1/5 flex gap-2">
                        <div className="w-1/2">
                            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Stock</label>
                            <input type="number" className="w-full p-3 border border-line rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-center bg-surface text-content" value={newInvItem.stock} onChange={e => setNewInvItem({ ...newInvItem, stock: e.target.value })} />
                        </div>
                        <div className="w-1/2">
                            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Unidad</label>
                            <input type="text" className="w-full p-3 border border-line rounded-xl outline-none bg-surface text-center text-muted/50 font-bold cursor-not-allowed disabled:bg-surface" value={newInvItem.unit} disabled />
                        </div>
                    </div>
                    <div className="w-full md:w-1/5">
                        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Precio Unit.</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-muted">$</span>
                            <input type="number" className="w-full p-3 pl-8 border border-line rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-surface text-content" value={newInvItem.price} onChange={e => setNewInvItem({ ...newInvItem, price: e.target.value })} />
                        </div>
                    </div>

                    <div className="w-full md:flex-1">
                        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Descripción (Opcional)</label>
                        <textarea
                            className="w-full p-3 border border-line rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-surface text-content resize-none flex-1"
                            rows="2"
                            placeholder="Añade notas sobre el perfil de sabor, origen o uso..."
                            value={newInvItem.description || ''}
                            onChange={e => setNewInvItem({ ...newInvItem, description: e.target.value })}
                        />
                    </div>

                    <div className="w-full md:w-auto flex justify-end mt-2 md:mt-0">
                        <button onClick={handleAddInvItem} className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex justify-center items-center h-[50px] px-8 transition-colors shadow-sm">
                            <Save size={20} className="mr-2" /> Guardar Insumo
                        </button>
                    </div>
                </div>
            )}

            {['Malta', 'Lúpulo', 'Levadura', 'Sales Minerales', 'Aditivos'].map(category => {
                const catIcon = category === 'Malta' ? <Wheat size={18} className="text-amber-500" /> : category === 'Lúpulo' ? <Leaf size={18} className="text-green-500" /> : category === 'Sales Minerales' ? <Droplets size={18} className="text-blue-500" /> : category === 'Aditivos' ? <Beaker size={18} className="text-purple-500" /> : <Beaker size={18} className="text-blue-500" />;
                const categoryItems = Array.isArray(inventory) ? inventory.filter(i => i.category === category) : [];

                return (
                    <div key={category} className="bg-panel rounded-2xl shadow-sm border border-line overflow-hidden mb-8">
                        <div className="bg-black/5 dark:bg-white/5 px-6 py-5 border-b border-line font-black text-content text-lg flex items-center gap-2">
                            {catIcon} {category}s
                        </div>
                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="text-xs text-muted uppercase bg-panel border-b border-line">
                                    <tr>
                                        <th className="px-6 py-5 font-bold tracking-wider text-left w-1/3">Ingrediente</th>
                                        <th className="px-6 py-5 font-bold tracking-wider text-left w-1/4">Stock Actual</th>
                                        <th className="px-6 py-5 font-bold tracking-wider text-left w-1/4">Costo Unidad</th>
                                        <th className="px-6 py-5 text-center w-16">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                    {categoryItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-black/5 dark:hover:bg-white/5 group transition-colors">
                                            <td className="px-6 py-5 font-bold text-content relative group/tooltip">
                                                <div className="flex items-center gap-2">
                                                    {item.name}
                                                    {item.description && (
                                                        <div className="relative flex items-center">
                                                            <Info size={16} className="text-blue-400 cursor-help" />
                                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-48 bg-slate-800 text-white text-xs p-3 rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all shadow-xl pointer-events-none whitespace-normal z-[60]">
                                                                {item.description}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        defaultValue={parseFloat(Number(item.stock).toFixed(4))}
                                                        disabled={isGuest}
                                                        title={isGuest ? guestTooltip : undefined}
                                                        onBlur={(e) => updateItem(item.id, { stock: parseFloat(Number(e.target.value).toFixed(4)) })}
                                                        className="w-full max-w-[100px] p-2 border border-line rounded-lg text-center focus:ring-2 focus:ring-blue-500 outline-none font-medium bg-surface focus:bg-panel text-content transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                                                    />
                                                    <span className="text-muted font-bold shrink-0">{item.unit}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2 text-muted">
                                                    <span className="shrink-0">$</span>
                                                    <input
                                                        type="number"
                                                        defaultValue={item.price}
                                                        disabled={isGuest}
                                                        title={isGuest ? guestTooltip : undefined}
                                                        onBlur={(e) => updateItem(item.id, { price: Number(e.target.value) || 0 })}
                                                        className="w-full max-w-[100px] p-2 border border-line rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-content bg-surface focus:bg-panel transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                                                    />
                                                    <span className="text-xs shrink-0">/ {item.unit}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <button
                                                    onClick={() => handleDeleteInvItem(item.id)}
                                                    disabled={isGuest}
                                                    title={isGuest ? guestTooltip : undefined}
                                                    className="text-muted hover:text-red-500 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 disabled:cursor-not-allowed"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div >
                )
            })}
        </div >
    );
}
