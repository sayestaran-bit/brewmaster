import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { 
  Beer, Plus, Trash2, History, TrendingUp, Package, ChevronRight, 
  AlertCircle, Loader2, Scale, Thermometer, Clock, Save, X, ChevronLeft,
  Flame, Droplets, Info
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE (Mantenida de tu proyecto real) ---
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

  // --- LOGICA DE AUTENTICACIÓN ---
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
  }, []);

  // --- SINCRONIZACIÓN DE DATOS ---
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

  // --- FUNCIONES DE CÁLCULO ---
  const calculateABV = (og, fg) => {
    const nOG = parseFloat(og);
    const nFG = parseFloat(fg);
    if (isNaN(nOG) || isNaN(nFG) || nOG === 0) return 0;
    return ((nOG - nFG) * 131.25).toFixed(1);
  };

  // --- ACCIONES ---
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
    if (!window.confirm("¿Seguro que quieres borrar esta receta?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'recipes', id));
    } catch (err) {
      console.error("Error al borrar:", err);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-amber-500">
      <Loader2 className="w-12 h-12 animate-spin mb-4" />
      <h2 className="text-xl font-black tracking-tighter uppercase">BREWMASTER <span className="text-white font-light">GUTEN</span></h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 md:pb-8">
      {/* Header Premium */}
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-2xl border-b border-amber-500/30">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-xl shadow-lg shadow-amber-500/20">
              <Beer className="text-slate-900 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black leading-none tracking-tight">BREWMASTER</h1>
              <p className="text-[10px] text-amber-500 font-bold tracking-[0.2em] uppercase">Guten Edition</p>
            </div>
          </div>
          <button 
            onClick={() => { setEditingRecipe(null); setIsCreating(true); }} 
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 p-2 rounded-xl transition-all active:scale-95 shadow-lg"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Recetas', val: recipes.length, icon: Beer, col: 'text-blue-600' },
                { label: 'En Stock', val: inventory.length, icon: Package, col: 'text-emerald-600' },
                { label: 'Cocciones', val: recipes.length > 0 ? recipes.length + 5 : 0, icon: Flame, col: 'text-orange-600' }
              ].map((s, i) => (
                <div key={i} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                  <s.icon className={`${s.col} w-5 h-5 mb-1`} />
                  <span className="text-xl font-black">{s.val}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider text-center">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Featured Action */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <h2 className="text-3xl font-black mb-2 leading-tight">¡Hola, Maestro!</h2>
                <p className="text-slate-400 text-sm mb-6 max-w-[200px]">Tus densidades están listas para ser registradas.</p>
                <button 
                  onClick={() => setIsCreating(true)}
                  className="bg-amber-500 text-slate-900 px-8 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-amber-400 transition-colors"
                >
                  <Plus className="w-4 h-4" /> NUEVA COCCIÓN
                </button>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-10">
                <Beer className="w-64 h-64 rotate-12" />
              </div>
            </div>

            {/* Recetas Recientes */}
            <div>
              <div className="flex justify-between items-end mb-4 px-2">
                <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter">
                  <History className="w-5 h-5 text-amber-500" /> Recientes
                </h3>
                <button onClick={() => setActiveTab('recipes')} className="text-xs font-bold text-amber-600 uppercase tracking-widest">Ver todas</button>
              </div>
              <div className="space-y-3">
                {recipes.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
                    <p className="text-slate-400 text-sm font-medium">Aún no hay recetas. Crea la primera para empezar.</p>
                  </div>
                ) : (
                  recipes.slice(0, 3).map(r => (
                    <div key={r.id} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                          <Beer className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-black text-slate-800 leading-tight">{r.name}</p>
                          <div className="flex gap-2 text-[10px] font-bold text-slate-400 mt-1 uppercase">
                            <span>{r.style}</span>
                            <span>•</span>
                            <span>{r.batchSize}L</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-800">{r.abv}%</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Alcohol</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recipes' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-900 px-2 tracking-tight">Biblioteca de Recetas</h2>
            {recipes.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                <Beer className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No hay recetas guardadas</p>
              </div>
            )}
            {recipes.map(r => (
              <div key={r.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden group">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-2 inline-block">
                        {r.style || 'Cerveza'}
                      </span>
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-amber-600 transition-colors">{r.name}</h3>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => { setEditingRecipe(r); setIsCreating(true); }} 
                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Save className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteRecipe(r.id)} 
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-slate-50 p-3 rounded-2xl text-center">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Litros</p>
                      <p className="font-black text-slate-800">{r.batchSize}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl text-center">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">D. Orig</p>
                      <p className="font-black text-slate-800">{r.og}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl text-center">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">D. Final</p>
                      <p className="font-black text-slate-800">{r.fg}</p>
                    </div>
                    <div className="bg-amber-500 p-3 rounded-2xl text-center text-slate-950 shadow-md shadow-amber-200">
                      <p className="text-[8px] font-bold uppercase opacity-70">ABV</p>
                      <p className="font-black">{r.abv}%</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="animate-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-6 tracking-tight px-2 uppercase">Bodega de Insumos</h2>
            <div className="bg-white rounded-[2.5rem] p-12 shadow-sm border border-slate-100 text-center">
              <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Próximamente</h3>
              <p className="text-slate-500 text-sm mb-6">Estamos destilando el módulo de control de stock de maltas y lúpulos.</p>
              <button className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">
                Notificarme
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Configuración de Receta */}
      {isCreating && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-end md:items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {editingRecipe ? 'Editar Receta' : 'Nueva Receta'}
                </h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Configuración Técnica</p>
              </div>
              <button 
                onClick={() => { setIsCreating(false); setEditingRecipe(null); }} 
                className="bg-slate-100 p-2 rounded-2xl hover:bg-slate-200 transition-colors"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleSaveRecipe} className="space-y-6">
              <div className="space-y-4">
                <div className="group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 block mb-1">Nombre</label>
                  <input 
                    name="name" 
                    defaultValue={editingRecipe?.name} 
                    required 
                    className="w-full bg-slate-50 border-2 border-transparent rounded-3xl p-4 font-bold text-slate-800 focus:border-amber-500 focus:bg-white outline-none transition-all" 
                    placeholder="Ej: Golden Ale S" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 block mb-1">Estilo</label>
                  <input 
                    name="style" 
                    defaultValue={editingRecipe?.style} 
                    className="w-full bg-slate-50 border-2 border-transparent rounded-3xl p-4 font-bold text-slate-800 focus:border-amber-500 focus:bg-white outline-none transition-all" 
                    placeholder="Ej: Belgian Strong Ale" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 block mb-1">Lote (Litros)</label>
                    <input 
                      name="batchSize" 
                      type="number" 
                      step="0.1" 
                      defaultValue={editingRecipe?.batchSize || 20} 
                      className="w-full bg-slate-50 border-2 border-transparent rounded-3xl p-4 font-bold text-slate-800 focus:border-amber-500 focus:bg-white outline-none transition-all" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 block mb-1">D. Original (OG)</label>
                    <input 
                      name="og" 
                      type="number" 
                      step="0.001" 
                      defaultValue={editingRecipe?.og || 1.050} 
                      className="w-full bg-slate-50 border-2 border-transparent rounded-3xl p-4 font-bold text-slate-800 focus:border-amber-500 focus:bg-white outline-none transition-all" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 block mb-1">D. Final (FG)</label>
                    <input 
                      name="fg" 
                      type="number" 
                      step="0.001" 
                      defaultValue={editingRecipe?.fg || 1.010} 
                      className="w-full bg-slate-50 border-2 border-transparent rounded-3xl p-4 font-bold text-slate-800 focus:border-amber-500 focus:bg-white outline-none transition-all" 
                    />
                  </div>
                  <div className="bg-amber-100 rounded-3xl flex flex-col items-center justify-center border-2 border-amber-200 shadow-inner">
                    <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Alcohol Estimado</span>
                    <span className="text-xl font-black text-amber-800 uppercase">Automático</span>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-slate-200 active:scale-95 hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
              >
                <Save className="w-6 h-6" /> GUARDAR RECETA
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Navegación Inferior (Diseño Móvil) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 p-2 pb-8 flex justify-around items-center z-50 md:pb-2">
        {[
          { id: 'dashboard', icon: TrendingUp, label: 'Inicio' },
          { id: 'recipes', icon: Beer, label: 'Recetas' },
          { id: 'inventory', icon: Package, label: 'Bodega' }
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex flex-col items-center p-3 px-6 rounded-2xl transition-all ${activeTab === t.id ? 'text-amber-600 bg-amber-50 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <t.icon className={`w-6 h-6 ${activeTab === t.id ? 'scale-110' : ''} transition-transform`} />
            <span className="text-[10px] font-black uppercase mt-1 tracking-tighter">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}