import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Beaker, Thermometer, Droplets, Clock, Info, CheckCircle2, 
  ChevronRight, BookOpen, Plus, ArrowLeft, Beer, Save, 
  Trash2, ChevronDown, ChevronUp, Play, Pause, SkipForward, 
  History, CalendarClock, Scale, Package, Star, MessageSquare, 
  Banknote, Wheat, Leaf, Cloud, RefreshCw, Moon, Sun, User, 
  LogOut, Edit3, FileClock, Waves, Zap, FlaskConical, Filter,
  LayoutDashboard, Database, Flame, TrendingUp, AlertCircle
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- CONFIGURACIÓN DE FIREBASE (Tus credenciales reales integradas) ---
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
const appId = 'brewmaster-pro-v1';

// --- FORMATO DE MONEDA (CLP) ---
const formatCurrency = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);

// --- MOTOR DE ESTILOS VISUALES DINÁMICOS ---
const getThemeForCategory = (category = '') => {
  const cat = category.toLowerCase();
  if (cat.includes('hazy') || cat.includes('ipa') || cat.includes('pale ale')) {
    return { 
      bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-900 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700', icon: 'text-orange-500', 
      badge: 'bg-orange-100 text-orange-800 dark:bg-orange-800/50 dark:text-orange-200', header: 'bg-gradient-to-r from-orange-500 to-amber-500',
    };
  }
  if (cat.includes('lager') || cat.includes('pilsner') || cat.includes('blonde')) {
    return { 
      bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-900 dark:text-yellow-300', border: 'border-yellow-400 dark:border-yellow-700', icon: 'text-yellow-500', 
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/50 dark:text-yellow-200', header: 'bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-900',
    };
  }
  if (cat.includes('amber') || cat.includes('red') || cat.includes('scotch')) {
    return { 
      bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-900 dark:text-red-300', border: 'border-red-300 dark:border-red-700', icon: 'text-red-600', 
      badge: 'bg-red-100 text-red-800 dark:bg-red-800/50 dark:text-red-200', header: 'bg-gradient-to-r from-red-700 to-orange-600',
    };
  }
  if (cat.includes('stout') || cat.includes('porter') || cat.includes('dark')) {
    return { 
      bg: 'bg-stone-100 dark:bg-stone-800/40', text: 'text-stone-900 dark:text-stone-300', border: 'border-stone-400 dark:border-stone-600', icon: 'text-stone-700 dark:text-stone-400', 
      badge: 'bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-300', header: 'bg-gradient-to-r from-stone-800 to-stone-600',
    };
  }
  return { 
    bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-900 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', icon: 'text-amber-500', 
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-800/50 dark:text-amber-200', header: 'bg-gradient-to-r from-amber-600 to-yellow-600',
  };
};

// --- RECETAS MAESTRAS (6 Estilos) ---
const initialRecipes = [
  {
    id: 'hazy-tamango', category: 'Hazy IPA', name: "Jugosa Hazy IPA (Estilo Tamango)", targetVolume: 20, og: 1.065, fg: 1.015, abv: 6.5,
    waterProfile: { Ca: 120, Mg: 15, SO4: 75, Cl: 200, HCO3: 50 },
    ingredients: {
      malts: [ { name: "Malta Pilsen", amount: 4.5, unit: "kg" }, { name: "Avena en hojuelas", amount: 1.0, unit: "kg" }, { name: "Trigo en hojuelas", amount: 0.8, unit: "kg" } ],
      hops: [ { name: "Magnum", amount: 10, unit: "g", time: "60 min", stage: "Hervor" }, { name: "Citra", amount: 50, unit: "g", time: "20 min a 80°C", stage: "Whirlpool" }, { name: "Mosaic", amount: 50, unit: "g", time: "20 min a 80°C", stage: "Whirlpool" } ],
      yeast: { name: "Lallemand Verdant IPA", amount: 1, unit: "sobre" }, water: { strike: 22, sparge: 12 }
    },
    steps: [ { id: 1, title: "Maceración", desc: "67°C por 60 min.", duration: 60 }, { id: 2, title: "Hervor", desc: "Hervir 60 min.", duration: 60 } ],
    tips: [ { title: "Oxidación", desc: "Las Hazy son muy sensibles al oxígeno." } ], modifications: []
  },
  {
    id: 'doble-hazy-ipa', category: 'Hazy IPA', name: "Nebulosa DDH - Doble Hazy IPA", targetVolume: 20, og: 1.080, fg: 1.018, abv: 8.2,
    ingredients: { malts: [{ name: "Pilsen", amount: 6.0 }], hops: [{ name: "Galaxy", amount: 60 }], yeast: {name: 'Verdant'}, water: {strike: 25, sparge: 12} },
    steps: [{ title: "Maceración Densa", desc: "66°C por 60 min", duration: 60 }], modifications: []
  },
  {
    id: 'triple-hazy-ipa', category: 'Hazy IPA', name: "Agujero Negro - Triple Hazy IPA", targetVolume: 20, og: 1.100, fg: 1.022, abv: 10.5,
    ingredients: { malts: [{ name: "Pale Ale", amount: 8.0 }], hops: [{ name: "Citra", amount: 100 }], yeast: {name: 'Verdant'}, water: {strike: 28, sparge: 10} },
    steps: [{ title: "Maceración al Límite", desc: "65°C por 75 min", duration: 75 }], modifications: []
  },
  {
    id: 'oatmeal-stout', category: 'Stout', name: "Expreso de Medianoche", targetVolume: 20, og: 1.058, fg: 1.016, abv: 5.5,
    ingredients: { malts: [{ name: "Malta Chocolate", amount: 0.5 }], hops: [{ name: "Fuggles", amount: 40 }], yeast: {name: 'S-04'}, water: {strike: 18, sparge: 14} },
    steps: [{ title: "Maceración Oscura", desc: "68°C por 60 min", duration: 60 }], modifications: []
  },
  { id: 'lager-premium', category: 'Lager', name: "Pilsner del Sur", targetVolume: 20, og: 1.048, fg: 1.010, abv: 5.0, ingredients: { malts: [], hops: [], yeast: {name: 'W-34/70'}, water: {strike: 18, sparge: 14} }, steps: [] },
  { id: 'amber-ale', category: 'Amber Ale', name: "Red Marzen", targetVolume: 20, og: 1.055, fg: 1.012, abv: 5.6, ingredients: { malts: [], hops: [], yeast: {name: 'US-05'}, water: {strike: 18, sparge: 14} }, steps: [] }
];

const initialInventory = [
  { id: 'inv-1', category: 'Malta', name: 'Malta Pilsen', stock: 25, unit: 'kg', price: 1600 },
  { id: 'inv-4', category: 'Lúpulo', name: 'Citra', stock: 500, unit: 'g', price: 80 },
  { id: 'inv-9', category: 'Levadura', name: 'Lallemand Verdant IPA', stock: 4, unit: 'sobre', price: 6500 }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [recipes, setRecipes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [view, setView] = useState('list');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [targetVol, setTargetVol] = useState(20);
  const [brewState, setBrewState] = useState({ stepIdx: 0, timeLeft: 0, isRunning: false, currentScaledRecipe: null });

  // Auth y Sincronización
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'brewery', 'mainData');
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRecipes(data.recipes || initialRecipes);
        setInventory(data.inventory || initialInventory);
        setHistory(data.history || []);
      } else {
        setDoc(docRef, { recipes: initialRecipes, inventory: initialInventory, history: [] });
      }
      setIsDataLoaded(true);
    });
  }, [user]);

  const updateCloudData = (newData) => {
    if (!user) return;
    setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'brewery', 'mainData'), newData, { merge: true });
  };

  const formatTime = (seconds) => `${Math.floor(seconds/60)}:${(seconds%60).toString().padStart(2,'0')}`;

  if (!isDataLoaded) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-amber-500 font-black flex-col gap-4">
      <Beer className="w-12 h-12 animate-bounce" />
      <p className="animate-pulse text-xs uppercase tracking-[0.3em]">Cargando Asistente...</p>
    </div>
  );

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-100 dark:bg-[#050608] text-slate-800 dark:text-slate-100 transition-colors duration-300">
        
        {/* HEADER */}
        <header className="bg-slate-900 dark:bg-black/60 backdrop-blur-2xl p-6 shadow-xl border-b border-white/5 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="bg-amber-500 p-2.5 rounded-2xl shadow-lg"><Beaker size={28} className="text-slate-900" /></div>
              <div>
                <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">Asistente <span className="text-amber-500">Guten</span></h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Maestro Cervecero Elite</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDarkMode(!darkMode)} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors border border-white/5">
                {darkMode ? <Sun size={18} className="text-amber-400"/> : <Moon size={18} className="text-slate-300"/>}
              </button>
              {view !== 'list' && (
                <button onClick={() => setView('list')} className="bg-white text-black px-5 py-2.5 rounded-xl font-black text-xs uppercase shadow-xl flex items-center gap-2 hover:bg-amber-500 transition-all">
                  <ArrowLeft size={14} /> Inicio
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
          
          {/* DASHBOARD PRINCIPAL */}
          {view === 'list' && (
            <div className="space-y-10 animate-fadeIn">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {[
                   { label: 'Recetas', val: recipes.length, icon: BookOpen, color: 'text-amber-500' },
                   { label: 'Historial', val: history.length, icon: History, color: 'text-blue-500' },
                   { label: 'Eficiencia', val: '72%', icon: Zap, color: 'text-emerald-500' },
                   { label: 'Lts Mes', val: history.reduce((acc, h) => acc + (h.volume || 0), 0), icon: Waves, color: 'text-blue-400' }
                 ].map((s, i) => (
                   <div key={i} className="bg-white dark:bg-white/[0.02] p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/5 flex flex-col items-center justify-center text-center group hover:border-amber-500/50 transition-all">
                      <s.icon className={`${s.color} w-6 h-6 mb-3 group-hover:scale-110 transition-transform`} />
                      <span className="text-3xl font-black text-slate-800 dark:text-white block mb-1 tracking-tighter">{s.val}</span>
                      <span className="text-[9px] uppercase font-black text-slate-500 tracking-widest">{s.label}</span>
                   </div>
                 ))}
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.map(recipe => (
                  <div 
                    key={recipe.id} 
                    onClick={() => { setSelectedRecipe(recipe); setTargetVol(recipe.targetVolume); setView('recipe'); }}
                    className="bg-white dark:bg-white/[0.03] p-8 rounded-[2.5rem] border border-transparent hover:border-amber-500/50 cursor-pointer transition-all shadow-sm hover:shadow-2xl group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Beer className="w-24 h-24 rotate-12" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full mb-4 inline-block">{recipe.category}</span>
                    <h3 className="text-xl font-black mb-6 italic leading-tight text-slate-800 dark:text-white group-hover:text-amber-500 transition-colors uppercase">{recipe.name}</h3>
                    <div className="flex gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-t border-gray-50 dark:border-white/5 pt-4">
                      <span className="flex items-center gap-1.5"><Droplets size={14} className="text-blue-500"/> {recipe.targetVolume}L</span>
                      <span className="flex items-center gap-1.5"><Zap size={14} className="text-amber-500"/> {recipe.abv}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA DETALLE RECETA */}
          {view === 'recipe' && selectedRecipe && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
               <div className="bg-gradient-to-br from-slate-900 to-black rounded-[3rem] border border-white/10 p-10 shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-10 opacity-5"><FlaskConical size={140} /></div>
                 <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white mb-6 drop-shadow-lg">{selectedRecipe.name}</h2>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                   {[
                     { l: 'Alcohol', v: selectedRecipe.abv + '%' },
                     { l: 'Original', v: selectedRecipe.og },
                     { l: 'Final', v: selectedRecipe.fg },
                     { l: 'Lote', v: targetVol + 'L', high: true }
                   ].map((m, i) => (
                     <div key={i} className={`${m.high ? 'bg-amber-500 text-black' : 'bg-white/5 text-white'} p-5 rounded-2xl border border-white/10 text-center`}>
                        <p className="text-[9px] font-black uppercase opacity-60 mb-1">{m.l}</p>
                        <p className="text-xl font-black">{m.v}</p>
                     </div>
                   ))}
                 </div>
                 <button onClick={() => {
                    setBrewState({ stepIdx: 0, timeLeft: (selectedRecipe.steps?.[0]?.duration || 60) * 60, isRunning: false, currentScaledRecipe: selectedRecipe });
                    setView('brew');
                 }} className="w-full bg-white text-black py-5 rounded-2xl font-black text-lg mt-10 hover:bg-amber-500 transition-all shadow-2xl active:scale-95 uppercase tracking-tighter italic">¡EMPEZAR COCCIÓN!</button>
               </div>
            </div>
          )}

          {/* MODO COCCIÓN */}
          {view === 'brew' && brewState.currentScaledRecipe && (
            <div className="min-h-[70vh] bg-slate-900 text-white p-10 md:p-20 rounded-[4rem] shadow-2xl flex flex-col items-center justify-center text-center border-8 border-slate-800 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-3 bg-slate-800">
                 <div className="h-full bg-amber-500 transition-all duration-1000" style={{width: `${((brewState.stepIdx + 1) / (brewState.currentScaledRecipe.steps?.length || 1)) * 100}%`}}></div>
               </div>
               <h3 className="text-5xl md:text-8xl font-black mb-6 italic tracking-tighter uppercase">{brewState.currentScaledRecipe.steps?.[brewState.stepIdx]?.title || "Proceso"}</h3>
               <p className="text-slate-400 text-xl md:text-3xl max-w-3xl mb-12 italic">{brewState.currentScaledRecipe.steps?.[brewState.stepIdx]?.desc || "Sigue las instrucciones."}</p>
               
               <div className="text-[10rem] md:text-[15rem] font-black tracking-tighter font-mono text-white mb-12 drop-shadow-[0_0_50px_rgba(255,255,255,0.1)] leading-none">
                 {formatTime(brewState.timeLeft)}
               </div>

               <div className="flex gap-8">
                 <button onClick={() => setBrewState(p => ({...p, isRunning: !p.isRunning}))} className={`w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-2xl active:scale-90 ${brewState.isRunning ? 'bg-red-500 border-4 border-red-400' : 'bg-emerald-500 border-4 border-emerald-400'}`}>
                   {brewState.isRunning ? <Pause className="fill-white" size={48}/> : <Play className="fill-white ml-2" size={48}/>}
                 </button>
                 <button onClick={() => setView('list')} className="bg-white text-slate-900 px-12 py-6 rounded-[2rem] font-black text-2xl hover:bg-amber-500 transition-all uppercase italic">Terminar</button>
               </div>
            </div>
          )}

        </main>

        {/* NAVEGACIÓN INFERIOR (Estilo Pro) */}
        <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-3xl border-t border-white/5 p-4 pb-10 md:pb-6 flex justify-around items-center z-[100] shadow-3xl">
           {[
             { id: 'list', icon: LayoutDashboard, label: 'Control' },
             { id: 'inventory', icon: Package, label: 'Bodega' },
             { id: 'history', icon: History, label: 'Lotes' }
           ].map(t => (
             <button key={t.id} onClick={() => setView(t.id)} className={`flex flex-col items-center gap-1 transition-all ${view === t.id ? 'text-amber-500' : 'text-slate-600'}`}>
               <t.icon size={26} />
               <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
             </button>
           ))}
        </nav>

      </div>
    </div>
  );
}