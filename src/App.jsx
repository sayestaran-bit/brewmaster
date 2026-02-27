import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { 
  Beer, Plus, Trash2, History, TrendingUp, Package, ChevronRight, 
  AlertCircle, Loader2, Save, X, Flame, Droplets, Thermometer, Info,
  Settings, LayoutDashboard, Database, Calculator, Timer, Beaker,
  GlassWater, Waves, Wind
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE (Tus credenciales reales) ---
const firebaseConfig = {
  apiKey: "AIzaSyCGnXySz-WX7doAbY_p6BPd5umEX5QRHrw",
  authDomain: "brewmaster-86405.firebaseapp.com",
  projectId: "brewmaster-86405",
  storageBucket: "brewmaster-86405.firebasestorage.app",
  messagingSenderId: "891974847846",
  appId: "1:891974847846:web:32fb973e8f774f28524ca7",
  measurementId: "G-PY0EMY8PQV"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const APP_ID = 'seba-brewmaster-v1';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [recipes, setRecipes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const rPath = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'recipes');
    const iPath = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'inventory');

    const unsubR = onSnapshot(rPath, (s) => {
      setRecipes(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const unsubI = onSnapshot(iPath, (s) => setInventory(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubR(); unsubI(); };
  }, [user]);

  const calculateABV = (og, fg) => {
    const nOG = parseFloat(og);
    const nFG = parseFloat(fg);
    if (isNaN(nOG) || isNaN(nFG) || nOG === 0) return 0;
    return ((nOG - nFG) * 131.25).toFixed(1);
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const og = formData.get('og');
    const fg = formData.get('fg');
    
    const recipeData = {
      name: formData.get('name'),
      style: formData.get('style'),
      batchSize: Number(formData.get('batchSize')),
      og: Number(og),
      fg: Number(fg),
      abv: calculateABV(og, fg),
      updatedAt: Date.now()
    };

    try {
      if (editingRecipe?.id) {
        await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'recipes', editingRecipe.id), recipeData);
      } else {
        const path = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'recipes');
        await addDoc(path, { ...recipeData, createdAt: Date.now() });
      }
      setIsCreating(false);
      setEditingRecipe(null);
    } catch (err) {
      console.error("Error al guardar:", err);
    }
  };

  const handleDeleteRecipe = async (id) => {
    if (!window.confirm("¿Deseas eliminar esta receta de tu biblioteca?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'recipes', id));
    } catch (err) {
      console.error("Error al borrar:", err);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050608] flex flex-col items-center justify-center text-amber-500">
      <div className="relative mb-8">
        <Beer className="w-20 h-20 animate-pulse relative z-10 text-amber-500" />
        <div className="absolute inset-0 bg-amber-500/10 blur-3xl rounded-full scale-150"></div>
      </div>
      <h2 className="text-3xl font-black tracking-tighter uppercase italic text-white">
        BrewMaster <span className="text-amber-500">Guten</span>
      </h2>
      <p className="mt-4 text-slate-600 text-[10px] font-bold tracking-[0.4em] uppercase">Estabilizando mezcla...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050608] font-sans text-slate-300 pb-24 md:pb-8 selection:bg-amber-500/30">
      {/* Header Craft High-End */}
      <header className="bg-black/60 backdrop-blur-2xl p-6 sticky top-0 z-50 border-b border-white/5">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-amber-600 to-amber-400 rounded-2xl flex items-center justify-center shadow-[0_10px_30px_rgba(245,158,11,0.2)]">
              <Beer className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black leading-none tracking-tight text-white uppercase italic">Guten <span className="text-amber-500 not-italic font-light opacity-60">Master</span></h1>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></div>
                <span className="text-[8px] text-slate-500 font-black uppercase tracking-[0.25em]">Cloud Sync Activo</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => { setEditingRecipe(null); setIsCreating(true); }} 
            className="bg-amber-500 text-black px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all active:scale-95 shadow-xl flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Crear Lote
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-12 mt-4">
        {activeTab === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in duration-1000">
            {/* Métricas con Estilo Glassmorphism */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Recetas Totales', val: recipes.length, icon: Beaker, color: 'text-amber-500' },
                { label: 'Cocciones Mes', val: recipes.length > 0 ? recipes.length + 1 : 0, icon: Flame, color: 'text-orange-500' },
                { label: 'Lts. Producidos', val: recipes.reduce((acc, r) => acc + (r.batchSize || 0), 0) + ' L', icon: Waves, color: 'text-blue-500' },
                { label: 'Eficiencia Prom.', val: '74%', icon: TrendingUp, color: 'text-emerald-500' }
              ].map((s, i) => (
                <div key={i} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] relative overflow-hidden group hover:bg-white/[0.04] transition-all">
                  <s.icon className={`w-5 h-5 ${s.color} mb-4 group-hover:scale-110 transition-transform`} />
                  <span className="text-3xl font-black text-white block mb-1 tracking-tighter">{s.val}</span>
                  <span className="text-[9px] uppercase font-black text-slate-500 tracking-widest">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Banner de Bienvenida "Brewery Master" */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-600 to-orange-600 rounded-[3.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="bg-[#0c0e12] rounded-[3.5rem] p-12 border border-white/10 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="relative z-10 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/20 mb-6">
                    <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[9px] font-black uppercase text-amber-500 tracking-[0.3em]">Ambiente de producción</span>
                  </div>
                  <h2 className="text-5xl font-black text-white mb-6 leading-[0.9] italic tracking-tighter">DISEÑA TU <br/><span className="text-amber-500">PRÓXIMO ÉXITO.</span></h2>
                  <p className="text-slate-400 text-sm mb-10 max-w-sm font-medium leading-relaxed">Bienvenido, Sebastian. El panel de Guten está sincronizado y listo para registrar cada densidad de tu proceso.</p>
                  <button onClick={() => setIsCreating(true)} className="bg-white text-black h-16 px-10 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-amber-500 transition-all shadow-2xl active:scale-95">
                    Comenzar Receta
                  </button>
                </div>
                <div className="relative w-full max-w-xs aspect-square flex items-center justify-center">
                   <div className="absolute inset-0 bg-amber-500/5 rounded-full blur-3xl animate-pulse"></div>
                   <Beer className="w-48 h-48 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                   <Beaker className="absolute top-0 right-0 w-12 h-12 text-amber-500/20" />
                   <Calculator className="absolute bottom-10 left-0 w-10 h-10 text-amber-500/10" />
                </div>
              </div>
            </div>

            {/* Listado de Recetas Estilo Neumorphic Dark */}
            <div>
              <div className="flex justify-between items-center mb-8 px-4">
                <h3 className="font-black text-slate-500 flex items-center gap-4 text-[10px] uppercase tracking-[0.4em]">
                   Actividad Reciente <div className="w-12 h-[1px] bg-white/10"></div>
                </h3>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.length === 0 ? (
                  <div className="col-span-full bg-white/[0.01] rounded-[3rem] p-20 text-center border border-white/5">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Beer className="w-10 h-10 text-slate-700" />
                    </div>
                    <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">No se detectan cocciones guardadas.</p>
                  </div>
                ) : (
                  recipes.slice(0, 6).map(r => (
                    <div key={r.id} className="bg-white/[0.02] hover:bg-white/[0.04] p-8 rounded-[3rem] border border-white/5 transition-all duration-500 group flex flex-col h-full">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-amber-500 shadow-xl border border-white/5 group-hover:border-amber-500/30 transition-all">
                          <Beer className="w-7 h-7" />
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-black text-white tracking-tighter block leading-none">{r.abv}%</span>
                            <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">ABV Real</span>
                        </div>
                      </div>
                      <h4 className="font-black text-white text-xl mb-2 tracking-tight line-clamp-1">{r.name}</h4>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Droplets className="w-3 h-3 text-amber-600" /> {r.style || 'Guten Classic'}
                      </p>
                      
                      <div className="mt-auto grid grid-cols-2 gap-2">
                        <div className="bg-black/40 p-3 rounded-2xl border border-white/5">
                            <span className="text-[8px] font-bold text-slate-600 block uppercase mb-1 tracking-tighter">Densidad</span>
                            <span className="font-bold text-white text-sm">{r.og}</span>
                        </div>
                        <div className="bg-black/40 p-3 rounded-2xl border border-white/5">
                            <span className="text-[8px] font-bold text-slate-600 block uppercase mb-1 tracking-tighter">Volumen</span>
                            <span className="font-bold text-white text-sm">{r.batchSize}L</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recipes' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
              <div className="flex items-center gap-6">
                <button onClick={() => setActiveTab('dashboard')} className="w-14 h-14 bg-white/5 rounded-3xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all border border-white/5">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Archivo de <span className="text-amber-500">Recetas</span></h2>
              </div>
              <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/5 flex items-center gap-4">
                 <div className="text-right">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Total Registradas</p>
                    <p className="text-lg font-black text-white">{recipes.length}</p>
                 </div>
                 <Database className="w-6 h-6 text-amber-500/40" />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {recipes.map(r => (
                <div key={r.id} className="bg-gradient-to-br from-[#12151c] to-black rounded-[3.5rem] border border-white/10 overflow-hidden shadow-2xl relative group hover:border-amber-500/20 transition-all">
                  <div className="p-10">
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-amber-500 rounded-3xl flex items-center justify-center text-slate-950 shadow-2xl shadow-amber-500/30 group-hover:scale-105 transition-transform">
                          <Beer className="w-8 h-8" />
                        </div>
                        <div>
                          <span className="bg-amber-500/10 text-amber-500 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] mb-3 inline-block border border-amber-500/10">
                            {r.style || 'Receta de Autor'}
                          </span>
                          <h3 className="text-2xl font-black text-white tracking-tight leading-none group-hover:text-amber-500 transition-colors">{r.name}</h3>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingRecipe(r); setIsCreating(true); }} className="p-3 bg-white/5 rounded-2xl text-slate-500 hover:text-white hover:bg-white/10 transition-all"><Save className="w-5 h-5" /></button>
                        <button onClick={() => handleDeleteRecipe(r.id)} className="p-3 bg-white/5 rounded-2xl text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white/5 p-5 rounded-[2rem] text-center border border-white/5">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Densidad Original</p>
                          <p className="font-black text-2xl text-white tracking-tighter">{r.og}</p>
                        </div>
                        <div className="bg-white/5 p-5 rounded-[2rem] text-center border border-white/5">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Densidad Final</p>
                          <p className="font-black text-2xl text-white tracking-tighter">{r.fg}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-5 rounded-[2rem] text-center border border-white/5">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Volumen Lote</p>
                          <p className="font-black text-2xl text-white tracking-tighter">{r.batchSize} <span className="text-xs text-slate-600">LTS</span></p>
                        </div>
                        <div className="bg-amber-500 p-5 rounded-[2rem] text-center text-black shadow-xl shadow-amber-500/20">
                          <p className="text-[9px] font-black uppercase tracking-widest mb-2 opacity-70">Alcohol Final</p>
                          <p className="font-black text-3xl tracking-tighter leading-none">{r.abv}%</p>
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal Elite: Configuración de Parámetros */}
      {isCreating && (
        <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex items-end md:items-center justify-center p-4">
          <div className="bg-[#0c0e12] w-full max-w-2xl rounded-[4rem] p-12 border border-white/10 shadow-[0_0_120px_rgba(0,0,0,1)] max-h-[95vh] overflow-y-auto animate-in slide-in-from-bottom-12 duration-500 relative">
            <div className="flex justify-between items-center mb-14">
              <div>
                <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
                  {editingRecipe ? 'Ajustar' : 'Configurar'} <span className="text-amber-500">Lote</span>
                </h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-3 ml-1 flex items-center gap-2">
                    <Settings className="w-3 h-3" /> Registros de precisión
                </p>
              </div>
              <button onClick={() => { setIsCreating(false); setEditingRecipe(null); }} className="bg-white/5 p-5 rounded-3xl text-slate-500 hover:text-white transition-all"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSaveRecipe} className="space-y-10">
              <div className="grid gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] ml-8 block">Identificación de la Cerveza</label>
                  <input name="name" defaultValue={editingRecipe?.name} required className="w-full bg-white/5 border-2 border-transparent rounded-[2.5rem] p-7 font-bold text-white text-lg focus:border-amber-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-800" placeholder="Ej: Guten Imperial Stout" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] ml-8 block">Estilo Sugerido</label>
                  <input name="style" defaultValue={editingRecipe?.style} className="w-full bg-white/5 border-2 border-transparent rounded-[2.5rem] p-7 font-bold text-white focus:border-amber-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-800" placeholder="Ej: Russian Imperial" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] ml-8 block">Tamaño Lote (L)</label>
                    <input name="batchSize" type="number" step="0.1" defaultValue={editingRecipe?.batchSize || 20} className="w-full bg-white/5 border-2 border-transparent rounded-[2.5rem] p-7 font-bold text-white focus:border-amber-500 focus:bg-white/10 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] ml-8 block">D. Original (OG)</label>
                    <input name="og" type="number" step="0.001" defaultValue={editingRecipe?.og || 1.050} className="w-full bg-white/5 border-2 border-transparent rounded-[2.5rem] p-7 font-bold text-white focus:border-amber-500 focus:bg-white/10 outline-none transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] ml-8 block">D. Final (FG)</label>
                    <input name="fg" type="number" step="0.001" defaultValue={editingRecipe?.fg || 1.010} className="w-full bg-white/5 border-2 border-transparent rounded-[2.5rem] p-7 font-bold text-white focus:border-amber-500 focus:bg-white/10 outline-none transition-all" />
                  </div>
                  <div className="bg-amber-500 rounded-[2.5rem] flex flex-col items-center justify-center shadow-3xl shadow-amber-500/10 border-4 border-black/20">
                    <span className="text-[10px] font-black text-black uppercase tracking-[0.2em] opacity-50 mb-1">Resultado ABV</span>
                    <span className="text-3xl font-black text-black uppercase italic leading-none">AUTO</span>
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-white text-black py-8 rounded-[3rem] font-black text-xl shadow-2xl active:scale-[0.97] hover:bg-amber-500 transition-all uppercase tracking-[0.25em] flex items-center justify-center gap-5 group mt-8">
                <Save className="w-7 h-7 group-hover:animate-bounce" /> Procesar Receta
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Navegación Inferior High-End Glass */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-3xl border-t border-white/5 p-5 pb-10 md:pb-5 flex justify-around items-center z-50">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Panel' },
          { id: 'recipes', icon: Beer, label: 'Biblioteca' },
          { id: 'inventory', icon: Database, label: 'Insumos' }
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex flex-col items-center p-4 px-12 rounded-[2rem] transition-all duration-700 relative overflow-hidden group ${activeTab === t.id ? 'text-amber-500' : 'text-slate-600 hover:text-slate-300'}`}
          >
            {activeTab === t.id && (
              <div className="absolute inset-0 bg-white/5 animate-in fade-in zoom-in-95 duration-500 rounded-[2rem]"></div>
            )}
            <t.icon className={`w-6 h-6 relative z-10 ${activeTab === t.id ? 'scale-110 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]' : ''} transition-all duration-500`} />
            <span className="text-[10px] font-black uppercase mt-2 tracking-tighter relative z-10">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// Icono de flecha para el botón de retroceso
function ChevronLeft(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
  );
}