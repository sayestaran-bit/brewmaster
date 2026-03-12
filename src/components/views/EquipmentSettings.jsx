// /src/components/views/EquipmentSettings.jsx
import React, { useState } from 'react';
import { Settings, Plus, Trash2, Save, Info, Thermometer, Droplets, FlaskConical, Scale, Maximize2, Loader2, AlertTriangle, CheckCircle2, Star, HelpCircle } from 'lucide-react';
import { useEquipment } from '../../hooks/useEquipment';
import { EQUIPMENT_GLOSSARY } from '../../utils/helpers';

export default function EquipmentSettings() {
    const { equipment, loading, addProfile, updateProfile, deleteProfile, setAsDefault } = useEquipment();
    const [editingId, setEditingId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const defaultProfile = {
        name: '',
        evaporationRate: 3.0,
        trubLoss: 2.0,
        mashRatio: 3.0,
        grainAbsorption: 1.0,
        totalVolume: 35
    };

    const [formData, setFormData] = useState(defaultProfile);

    const handleEdit = (profile) => {
        setEditingId(profile.id);
        setFormData(profile);
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData(defaultProfile);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.name) return alert("Por favor, ingresa un nombre para el equipo.");
        
        setIsSaving(true);
        try {
            if (editingId === 'new') {
                await addProfile(formData);
            } else {
                await updateProfile(editingId, formData);
            }
            handleCancel();
        } catch (err) {
            console.error("Error saving profile:", err);
            alert("Error al guardar el perfil.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Estás seguro de que deseas eliminar este perfil?")) {
            try {
                await deleteProfile(id);
            } catch (err) {
                console.error("Error deleting profile:", err);
                alert("Error al eliminar el perfil.");
            }
        }
    };

    const handleSetDefault = async (id) => {
        try {
            setIsSaving(true);
            await setAsDefault(id);
        } catch (err) {
            console.error("Error setting default profile:", err);
            alert("Error al establecer el equipo predeterminado.");
        } finally {
            setIsSaving(false);
        }
    };

    const Tooltip = ({ label, field }) => (
        <div className="group relative inline-block ml-1">
            <HelpCircle size={12} className="text-muted/50 hover:text-amber-500 cursor-help transition-colors" />
            <div className="invisible group-hover:visible absolute z-[110] bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-900 text-white text-[10px] font-bold rounded-xl shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-200 pointer-events-none">
                <div className="uppercase mb-1 text-amber-500 tracking-widest">{label}</div>
                <p className="leading-relaxed opacity-90">{EQUIPMENT_GLOSSARY[field]}</p>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] animate-pulse">
                <Loader2 size={40} className="text-amber-500 animate-spin mb-4" />
                <p className="text-muted font-bold uppercase tracking-widest text-xs">Cargando perfiles...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-content flex items-center gap-3 tracking-tighter">
                        <Settings className="text-amber-500" size={32} />
                        Perfiles de Equipo
                    </h2>
                    <p className="text-muted font-bold text-sm mt-1 uppercase tracking-wider">Configuración técnica para cálculos de agua y seguridad</p>
                </div>
                {!editingId && (
                    <button 
                        onClick={() => setEditingId('new')}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-black px-6 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-amber-500/20 active:scale-95"
                    >
                        <Plus size={20} /> Nuevo Equipo
                    </button>
                )}
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
                {/* Form Section */}
                {(editingId) && (
                    <div className="lg:col-span-5 animate-in slide-in-from-left duration-500">
                        <form onSubmit={handleSave} className="bg-panel rounded-3xl border border-line shadow-2xl overflow-hidden sticky top-8">
                            <div className="p-6 border-b border-line bg-surface/50 backdrop-blur-sm">
                                <h3 className="font-black text-content uppercase tracking-widest flex items-center gap-2">
                                    {editingId === 'new' ? <Plus size={18} /> : <Settings size={18} />}
                                    {editingId === 'new' ? 'Crear Perfil' : 'Editar Perfil'}
                                </h3>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-muted uppercase mb-2 tracking-widest">Nombre del Equipo</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej: AIO 35L, Ollas 50L..."
                                        className="w-full p-4 border border-line rounded-2xl bg-surface text-content font-black text-lg outline-none focus:ring-2 focus:ring-amber-500/50 transition-all shadow-inner"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-muted uppercase mb-2 tracking-widest flex items-center gap-1.5">
                                            <Thermometer size={12} className="text-red-500" /> Eva. (L/hr)
                                            <Tooltip label="Tasa de Evaporación" field="evaporationRate" />
                                        </label>
                                        <input 
                                            type="number" step="0.1"
                                            className="w-full p-3 border border-line rounded-xl bg-surface text-content font-bold outline-none focus:ring-2 focus:ring-amber-500/50"
                                            value={formData.evaporationRate}
                                            onChange={e => setFormData({...formData, evaporationRate: parseFloat(e.target.value) || 0})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-muted uppercase mb-2 tracking-widest flex items-center gap-1.5">
                                            <Droplets size={12} className="text-blue-500" /> Pérdida Olla (L)
                                            <Tooltip label="Pérdida en fondo" field="trubLoss" />
                                        </label>
                                        <input 
                                            type="number" step="0.1"
                                            className="w-full p-3 border border-line rounded-xl bg-surface text-content font-bold outline-none focus:ring-2 focus:ring-amber-500/50"
                                            value={formData.trubLoss}
                                            onChange={e => setFormData({...formData, trubLoss: parseFloat(e.target.value) || 0})}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-muted uppercase mb-2 tracking-widest flex items-center gap-1.5">
                                            <FlaskConical size={12} className="text-purple-500" /> Rel. Agua/Grano
                                            <Tooltip label="Mash Ratio" field="mashRatio" />
                                        </label>
                                        <input 
                                            type="number" step="0.1"
                                            className="w-full p-3 border border-line rounded-xl bg-surface text-content font-bold outline-none focus:ring-2 focus:ring-amber-500/50"
                                            value={formData.mashRatio}
                                            onChange={e => setFormData({...formData, mashRatio: parseFloat(e.target.value) || 0})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-muted uppercase mb-2 tracking-widest flex items-center gap-1.5">
                                            <Scale size={12} className="text-amber-600" /> Abs. Grano (L/kg)
                                            <Tooltip label="Absorción" field="grainAbsorption" />
                                        </label>
                                        <input 
                                            type="number" step="0.1"
                                            className="w-full p-3 border border-line rounded-xl bg-surface text-content font-bold outline-none focus:ring-2 focus:ring-amber-500/50"
                                            value={formData.grainAbsorption}
                                            onChange={e => setFormData({...formData, grainAbsorption: parseFloat(e.target.value) || 0})}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                                    <label className="block text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase mb-2 tracking-widest flex items-center gap-1.5">
                                        <Maximize2 size={12} /> Capacidad Total Olla (L)
                                        <Tooltip label="Volumen Total" field="totalVolume" />
                                    </label>
                                    <input 
                                        type="number"
                                        className="w-full p-4 border border-line rounded-xl bg-surface text-content font-black text-2xl text-center outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                        value={formData.totalVolume}
                                        onChange={e => setFormData({...formData, totalVolume: parseFloat(e.target.value) || 0})}
                                    />
                                    <p className="text-[9px] text-muted font-bold mt-2 text-center uppercase">Crucial para alertas de desbordamiento</p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button 
                                        type="button" 
                                        onClick={handleCancel}
                                        className="flex-1 px-4 py-3 rounded-xl border border-line font-bold text-muted hover:bg-surface transition-all active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isSaving}
                                        className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
                                    >
                                        {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                        {editingId === 'new' ? 'Crear Perfil' : 'Guardar Cambios'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* Profiles List */}
                <div className={`${editingId ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4 animate-in fade-in duration-500`}>
                    {equipment.length === 0 && !editingId ? (
                        <div className="bg-panel p-12 rounded-3xl border border-dashed border-line flex flex-col items-center justify-center text-center">
                            <div className="bg-surface p-4 rounded-full mb-4">
                                <Settings size={40} className="text-muted/40" />
                            </div>
                            <h3 className="text-xl font-black text-content mb-2">No hay perfiles configurados</h3>
                            <p className="text-muted font-bold max-w-sm">Configura tu equipo para obtener cálculos precisos de agua y alertas de seguridad en tiempo real.</p>
                            <button 
                                onClick={() => setEditingId('new')}
                                className="mt-6 text-amber-500 font-bold flex items-center gap-2 hover:gap-3 transition-all underline underline-offset-4"
                            >
                                <Plus size={18} /> Crea tu primer perfil ahora
                            </button>
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 gap-4">
                            {equipment.map((profile) => (
                                <div key={profile.id} className={`group bg-panel p-6 rounded-3xl border transition-all duration-300 hover:shadow-2xl ${editingId === profile.id ? 'border-amber-500 ring-4 ring-amber-500/10' : 'border-line hover:border-amber-500/50'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-surface p-3 rounded-2xl group-hover:scale-110 transition-transform">
                                                <Settings className="text-amber-500" size={24} />
                                            </div>
                                            {profile.isDefault && (
                                                <div className="bg-amber-500 text-slate-900 px-3 py-1 rounded-full flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
                                                    <Star size={10} fill="currentColor" />
                                                    <span className="text-[10px] font-black uppercase tracking-tighter">Predeterminado</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEdit(profile)} className="p-2 text-muted hover:text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all" title="Editar"><Settings size={18} /></button>
                                            <button onClick={() => handleDelete(profile.id)} className="p-2 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all" title="Eliminar"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-xl font-black text-content tracking-tight mb-4 group-hover:text-amber-500 transition-colors uppercase">{profile.name}</h3>
                                    
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-muted uppercase tracking-widest">Capacidad</span>
                                            <span className="text-lg font-black text-content">{profile.totalVolume} L</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-muted uppercase tracking-widest">Absorción</span>
                                            <span className="text-lg font-bold text-content">{profile.grainAbsorption} L/kg</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-muted uppercase tracking-widest">Evaporación</span>
                                            <span className="text-lg font-bold text-content">{profile.evaporationRate} L/h</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-muted uppercase tracking-widest">Mash Ratio</span>
                                            <span className="text-lg font-bold text-content">{profile.mashRatio} L/kg</span>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-line flex items-center justify-between">
                                        {!profile.isDefault ? (
                                            <button 
                                                onClick={() => handleSetDefault(profile.id)}
                                                className="text-[10px] font-black text-muted hover:text-amber-500 uppercase tracking-widest flex items-center gap-2 transition-colors border border-line hover:border-amber-500/50 px-4 py-2 rounded-xl"
                                            >
                                                Establecer como pred.
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2 opacity-50 grayscale pointer-events-none">
                                                <button className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 px-4 py-2 border border-amber-500/20 rounded-xl">
                                                    Equipo Principal
                                                </button>
                                            </div>
                                        )}
                                        <span className="text-[9px] font-bold text-slate-400 bg-slate-800/20 px-2 py-1 rounded-md">ID: {profile.id.substring(0,6)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Quick Tips */}
                    <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-3xl mt-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Info size={24} className="text-blue-500" />
                            <h4 className="font-black text-blue-500 uppercase tracking-widest text-sm">¿Sabías que?</h4>
                        </div>
                        <p className="text-sm text-content/80 font-bold leading-relaxed">
                            Configurar el <span className="text-blue-600 dark:text-blue-400">Mash Ratio</span> correcto influye directamente en la eficiencia de extracción de azúcares. Para sistemas AIO (All-in-One), se suele recomendar un ratio entre 2.7 y 3.1 L/kg dependiendo de la densidad de la receta.
                        </p>
                    </div>

                    <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-3xl">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle size={24} className="text-red-500" />
                            <h4 className="font-black text-red-500 uppercase tracking-widest text-sm">Seguridad Ante Todo</h4>
                        </div>
                        <p className="text-sm text-content/80 font-bold leading-relaxed">
                            El <span className="text-red-600 dark:text-red-400">Volumen Total</span> debe ser la capacidad real de tu olla de maceración/cocción. Este valor activa alertas de desbordamiento si la suma del agua de strike y el volumen que ocupa el grano supera los límites físicos.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
