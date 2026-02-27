import React, { useState, useEffect, useRef } from 'react';
import { Beaker, Thermometer, Droplets, Clock, Info, CheckCircle2, ChevronRight, BookOpen, Plus, ArrowLeft, Beer, Save, Trash2, ChevronDown, ChevronUp, Play, Pause, SkipForward, History, CalendarClock, Scale, Package, Star, MessageSquare, Banknote, Wheat, Leaf, Cloud, RefreshCw, Moon, Sun, User, LogOut, Edit3, FileClock } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- FIREBASE SETUP ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- FORMATO DE MONEDA (CLP) ---
const formatCurrency = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);

// --- MOTOR DE ESTILOS VISUALES DINÁMICOS (Soporte Dark Mode) ---
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

// --- DATOS PRECARGADOS POR DEFECTO ---
const initialRecipes = [
  {
    id: 'hazy-tamango', category: 'Hazy IPA', name: "Jugosa Hazy IPA (Estilo Tamango)", targetVolume: 20, og: 1.065, fg: 1.015, abv: 6.5,
    waterProfile: { Ca: 120, Mg: 15, SO4: 75, Cl: 200, HCO3: 50 },
    ingredients: {
      malts: [ { name: "Malta Pilsen", amount: 4.5, unit: "kg" }, { name: "Avena en hojuelas", amount: 1.0, unit: "kg" }, { name: "Trigo en hojuelas", amount: 0.8, unit: "kg" } ],
      hops: [ { name: "Magnum", amount: 10, unit: "g", time: "60 min", stage: "Hervor" }, { name: "Citra", amount: 50, unit: "g", time: "20 min a 80°C", stage: "Whirlpool" }, { name: "Mosaic", amount: 50, unit: "g", time: "20 min a 80°C", stage: "Whirlpool" }, { name: "Citra", amount: 60, unit: "g", time: "Día 2-3", stage: "Dry Hop 1" }, { name: "Mosaic", amount: 60, unit: "g", time: "Día 7", stage: "Dry Hop 2" } ],
      yeast: { name: "Lallemand Verdant IPA", amount: 1, unit: "sobre" }, water: { strike: 22, sparge: 12 }
    },
    steps: [ { id: 1, title: "Maceración", desc: "Macerar a 67°C por 60 min. Recircular suavemente.", details: "Primero calienta el agua en la Guten a 70°C. Agrega los granos lentamente.", duration: 60 }, { id: 2, title: "Lavado", desc: "Lavar con agua a 75°C.", details: "Lava suavemente con agua a 75-78°C.", duration: 15 }, { id: 3, title: "Hervor", desc: "Hervir 60 min. Agregar lúpulo de amargor.", details: "Configura la Guten a 100°C (Hervor).", duration: 60 }, { id: 4, title: "Whirlpool", desc: "Enfriar a 80°C. Agregar lúpulos de sabor y hacer remolino.", details: "Pasa agua por el serpentín hasta 80°C.", duration: 20 }, { id: 5, title: "Fermentación", desc: "Fermentar a 19°C. Agregar primer Dry Hop al día 2.", details: "Traspasa al fermentador oxigenando bien." } ],
    tips: [ { title: "Oxidación", desc: "Las Hazy son muy sensibles al oxígeno. Evita abrir el fermentador innecesariamente." }, { title: "Agua", desc: "Busca un ratio Cloruro a Sulfato de 2:1 o 3:1 para mayor sedosidad." } ],
    modifications: []
  },
  {
    id: 'doble-hazy-ipa', category: 'Hazy IPA', name: "Nebulosa DDH - Doble Hazy IPA", targetVolume: 20, og: 1.080, fg: 1.018, abv: 8.2,
    waterProfile: { Ca: 130, Mg: 15, SO4: 75, Cl: 220, HCO3: 50 },
    ingredients: {
      malts: [ { name: "Malta Pilsen", amount: 6.0, unit: "kg" }, { name: "Avena en hojuelas", amount: 1.2, unit: "kg" }, { name: "Trigo en hojuelas", amount: 1.0, unit: "kg" } ],
      hops: [ { name: "Magnum", amount: 15, unit: "g", time: "60 min", stage: "Hervor" }, { name: "Galaxy", amount: 60, unit: "g", time: "20 min a 80°C", stage: "Whirlpool" }, { name: "Citra", amount: 60, unit: "g", time: "20 min a 80°C", stage: "Whirlpool" }, { name: "Galaxy", amount: 80, unit: "g", time: "Día 2", stage: "Dry Hop 1" }, { name: "Citra", amount: 80, unit: "g", time: "Día 7", stage: "Dry Hop 2" } ],
      yeast: { name: "Lallemand Verdant IPA", amount: 2, unit: "sobres" }, water: { strike: 25, sparge: 12 }
    },
    steps: [ { id: 1, title: "Maceración Densa", desc: "Macerar a 66°C por 60 min.", details: "Añade el grano MUY lento para evitar grumos. Si la bomba se ahoga, bájale la potencia.", duration: 60 }, { id: 2, title: "Lavado Lento", desc: "Lavar con agua a 75°C.", details: "Levanta el tubo lentamente. Ten paciencia y no raspes el fondo del colador.", duration: 20 }, { id: 3, title: "Hervor", desc: "Hervir 60 min. Agregar Magnum.", details: "Hervor estándar. Vigila que no se rebalse.", duration: 60 }, { id: 4, title: "Whirlpool Doble", desc: "Enfriar a 80°C y agregar 120g de lúpulo.", details: "Remolino con la bomba a 80°C por 20 minutos.", duration: 20 }, { id: 5, title: "Fermentación y Doble Dry Hop (DDH)", desc: "Fermentar a 19°C. Dos cargas masivas de lúpulo.", details: "Día 2: Echa el Galaxy. Día 7: Echa el Citra." } ],
    tips: [ { title: "Salud de la Levadura", desc: "Oxigena el mosto batiendo enérgicamente el fermentador por 5 minutos antes de echar la levadura." } ],
    modifications: []
  },
  {
    id: 'triple-hazy-ipa', category: 'Hazy IPA', name: "Agujero Negro - Triple Hazy IPA", targetVolume: 20, og: 1.100, fg: 1.022, abv: 10.5,
    waterProfile: { Ca: 150, Mg: 15, SO4: 80, Cl: 250, HCO3: 50 },
    ingredients: {
      malts: [ { name: "Malta Pale Ale", amount: 7.0, unit: "kg" }, { name: "Avena en hojuelas", amount: 1.5, unit: "kg" }, { name: "Trigo malteado", amount: 1.0, unit: "kg" }, { name: "Dextrosa (Añadir en hervor)", amount: 0.8, unit: "kg" } ],
      hops: [ { name: "Columbus", amount: 20, unit: "g", time: "60 min", stage: "Hervor" }, { name: "Nelson Sauvin", amount: 80, unit: "g", time: "20 min a 75°C", stage: "Whirlpool" }, { name: "Citra", amount: 80, unit: "g", time: "20 min a 75°C", stage: "Whirlpool" }, { name: "Nelson Sauvin", amount: 100, unit: "g", time: "Día 2", stage: "Dry Hop 1" }, { name: "Citra", amount: 100, unit: "g", time: "Día 7", stage: "Dry Hop 2" } ],
      yeast: { name: "Lallemand Verdant IPA", amount: 3, unit: "sobres" }, water: { strike: 27, sparge: 10 }
    },
    steps: [ { id: 1, title: "Maceración al Límite", desc: "Macerar a 65°C por 75 min.", details: "Estamos al límite de capacidad de la Guten (9.5kg). Agrega agua extra si la cama de granos se ve muy seca.", duration: 75 }, { id: 2, title: "Lavado Cuidadoso", desc: "Lavar con agua a 75°C.", details: "El lavado será mínimo porque usamos mucha agua al inicio (Strike). Deja estilar muy bien el tubo de malta.", duration: 20 }, { id: 3, title: "Hervor y Dextrosa", desc: "Hervir 90 min. Añadir lúpulo y azúcar.", details: "Al minuto 30, añade los 20g de Columbus. Al minuto 75, añade los 0.8kg de Dextrosa y revuelve bien.", duration: 90 }, { id: 4, title: "Whirlpool Extremo", desc: "Enfriar a 75°C. 160g de lúpulo.", details: "Enfriamos a 75°C en vez de 80°C para evitar amargor. Mantén el remolino por 20 min.", duration: 20 }, { id: 5, title: "Fermentación Explosiva", desc: "Fermentar a 19°C y subir gradualmente.", details: "Controla que no pase de 19°C los primeros 3 días. Luego del primer Dry Hop (Día 2), déjala subir a 21°C." } ],
    tips: [ { title: "¡Oxígeno x2!", desc: "Una Triple IPA requiere oxigenar el mosto antes de echar la levadura, y VOLVER a oxigenar vigorosamente a las 12 horas." }, { title: "Dextrosa vs Azúcar Normal", desc: "La dextrosa es vital para 'secar' la cerveza y que esos 10.5% de alcohol no se sientan pesados." } ],
    modifications: []
  },
  {
    id: 'oatmeal-stout', category: 'Stout', name: "Expreso de Medianoche - Oatmeal Stout", targetVolume: 20, og: 1.058, fg: 1.016, abv: 5.5,
    waterProfile: { Ca: 50, Mg: 10, SO4: 50, Cl: 50, HCO3: 150 }, 
    ingredients: {
      malts: [ { name: "Malta Pale Ale", amount: 4.0, unit: "kg" }, { name: "Avena en hojuelas", amount: 0.6, unit: "kg" }, { name: "Malta Chocolate", amount: 0.4, unit: "kg" }, { name: "Cebada Tostada", amount: 0.2, unit: "kg" } ],
      hops: [ { name: "Fuggles", amount: 40, unit: "g", time: "60 min", stage: "Hervor" } ],
      yeast: { name: "SafAle S-04", amount: 1, unit: "sobre" }, water: { strike: 18, sparge: 14 }
    },
    steps: [ { id: 1, title: "Maceración Oscura", desc: "Macerar a 68°C por 60 min.", details: "La maceración un poco más alta (68°C) dejará azúcares no fermentables.", duration: 60 }, { id: 2, title: "Lavado", desc: "Lavar con agua a 75°C.", details: "No sobre-laves el grano para no extraer taninos ásperos.", duration: 20 }, { id: 3, title: "Hervor Limpio", desc: "Hervir 60 min. Agregar lúpulo.", details: "Amargor de soporte para balancear el dulzor.", duration: 60 }, { id: 4, title: "Enfriado", desc: "Enfriar a 18°C y traspasar.", details: "Enfría y oxigena bien antes de la levadura.", duration: 20 }, { id: 5, title: "Fermentación", desc: "Fermentar a 18-20°C por 14 días.", details: "La levadura inglesa puede ser muy vigorosa los primeros días." } ],
    tips: [ { title: "El Secreto del Agua", desc: "Las maltas muy tostadas son ácidas. Fíjate que el perfil objetivo pide mucho Bicarbonato (HCO3)." } ],
    modifications: []
  },
  {
    id: 'lager-clasica', category: 'Lager', name: "Lager Pilsner Clásica", targetVolume: 20, og: 1.048, fg: 1.010, abv: 5.0,
    waterProfile: { Ca: 50, Mg: 5, SO4: 50, Cl: 50, HCO3: 20 },
    ingredients: {
      malts: [ { name: "Malta Pilsen", amount: 4.5, unit: "kg" }, { name: "Malta Carapils", amount: 0.2, unit: "kg" } ],
      hops: [ { name: "Magnum", amount: 15, unit: "g", time: "60 min", stage: "Hervor" }, { name: "Saaz", amount: 30, unit: "g", time: "15 min", stage: "Hervor" }, { name: "Saaz", amount: 20, unit: "g", time: "0 min", stage: "Apagado" } ],
      yeast: { name: "Fermentis W-34/70", amount: 2, unit: "sobres" }, water: { strike: 18, sparge: 14 }
    },
    steps: [ { id: 1, title: "Maceración", desc: "Macerar a 63°C por 40 min, luego subir a 70°C por 20 min.", details: "Enciende la bomba y mantén a 63°C por 40 min.", duration: 60 }, { id: 2, title: "Hervor", desc: "Hervir vigorosamente por 60 min.", details: "El hervor debe ser con la olla DESTAPADA por completo.", duration: 60 }, { id: 3, title: "Enfriado", desc: "Enfriar el mosto hasta 12°C.", details: "Vital enfriar a 12°C ANTES de inocular la levadura.", duration: 30 }, { id: 4, title: "Fermentación", desc: "Fermentar a 10-12°C por 7 a 10 días.", details: "Mantén la temperatura fría y estable." } ],
    tips: [ { title: "Mucha Levadura", desc: "Las Lagers fermentan en frío. Usa el doble de levadura." } ], modifications: []
  },
  {
    id: 'amber-ale', category: 'Amber Ale', name: "Amber Ale Americana", targetVolume: 20, og: 1.055, fg: 1.012, abv: 5.6,
    waterProfile: { Ca: 80, Mg: 10, SO4: 120, Cl: 60, HCO3: 40 },
    ingredients: {
      malts: [ { name: "Malta Pale Ale", amount: 4.5, unit: "kg" }, { name: "Malta Caraamber", amount: 0.4, unit: "kg" }, { name: "Malta Carared", amount: 0.2, unit: "kg" } ],
      hops: [ { name: "Cascade", amount: 15, unit: "g", time: "60 min", stage: "Hervor" }, { name: "Centennial", amount: 20, unit: "g", time: "15 min", stage: "Hervor" }, { name: "Cascade", amount: 30, unit: "g", time: "0 min", stage: "Apagado" } ],
      yeast: { name: "SafAle US-05", amount: 1, unit: "sobre" }, water: { strike: 18, sparge: 14 }
    },
    steps: [ { id: 1, title: "Maceración", desc: "Macerar a 66°C por 60 min.", details: "Mantén 66°C por una hora con recirculado continuo usando la bomba. Esto da un balance perfecto.", duration: 60 }, { id: 2, title: "Hervor", desc: "Hervir 60 min agregando los lúpulos.", details: "Al minuto 45, agrega el lúpulo Centennial.", duration: 60 }, { id: 3, title: "Enfriado", desc: "Enfriar a 18°C y traspasar.", details: "Enfría rápido para evitar amargor extra.", duration: 20 }, { id: 4, title: "Fermentación", desc: "Fermentar a 18-20°C por 10 a 14 días.", details: "Mantenla a 19°C idealmente." } ],
    tips: [ { title: "Equilibrio", desc: "El lúpulo y el caramelo deben ir de la mano." } ], modifications: []
  }
];

const initialInventory = [
  { id: 'inv-1', category: 'Malta', name: 'Malta Pilsen', stock: 25, unit: 'kg', price: 1600 },
  { id: 'inv-2', category: 'Malta', name: 'Avena en hojuelas', stock: 5, unit: 'kg', price: 2000 },
  { id: 'inv-3', category: 'Malta', name: 'Trigo en hojuelas', stock: 5, unit: 'kg', price: 2200 },
  { id: 'inv-4', category: 'Lúpulo', name: 'Citra', stock: 500, unit: 'g', price: 80 },
  { id: 'inv-5', category: 'Lúpulo', name: 'Mosaic', stock: 300, unit: 'g', price: 80 },
  { id: 'inv-6', category: 'Lúpulo', name: 'Galaxy', stock: 200, unit: 'g', price: 90 },
  { id: 'inv-7', category: 'Lúpulo', name: 'Magnum', stock: 1000, unit: 'g', price: 40 },
  { id: 'inv-8', category: 'Lúpulo', name: 'Saaz', stock: 250, unit: 'g', price: 50 },
  { id: 'inv-9', category: 'Levadura', name: 'Lallemand Verdant IPA', stock: 4, unit: 'sobre', price: 6500 },
  { id: 'inv-10', category: 'Levadura', name: 'Fermentis W-34/70', stock: 2, unit: 'sobre', price: 6000 },
  { id: 'inv-11', category: 'Malta', name: 'Malta Pale Ale', stock: 15, unit: 'kg', price: 1800 },
  { id: 'inv-15', category: 'Malta', name: 'Malta Chocolate', stock: 2, unit: 'kg', price: 3500 },
  { id: 'inv-16', category: 'Malta', name: 'Cebada Tostada', stock: 2, unit: 'kg', price: 3000 },
  { id: 'inv-17', category: 'Lúpulo', name: 'Cascade', stock: 250, unit: 'g', price: 60 },
  { id: 'inv-19', category: 'Lúpulo', name: 'Fuggles', stock: 200, unit: 'g', price: 75 },
  { id: 'inv-23', category: 'Levadura', name: 'SafAle S-04', stock: 2, unit: 'sobre', price: 4500 },
];
const defaultPrices = { malta: 2000, lupulo: 60, levadura: 5000 };

// --- COMPONENTE AUTOCOMPLETAR ---
function AutocompleteInput({ value, onChange, placeholder, category, inventory, onAddNewItem }) {
  const [showDrop, setShowDrop] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setShowDrop(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filtered = inventory.filter(i => i.category === category && i.name.toLowerCase().includes(value.toLowerCase()) && value.trim() !== '');
  const exactMatch = inventory.some(i => i.category === category && i.name.toLowerCase() === value.toLowerCase().trim());

  return (
    <div className="relative flex-1" ref={wrapperRef}>
      <input 
        type="text" 
        placeholder={placeholder} 
        className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" 
        value={value} 
        onChange={e => { onChange(e.target.value); setShowDrop(true); }}
        onFocus={() => setShowDrop(true)}
      />
      {showDrop && value.trim() !== '' && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
          {filtered.map(item => (
            <div 
              key={item.id} 
              className="p-3 hover:bg-amber-50 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-800 dark:text-slate-200 font-medium flex justify-between"
              onClick={() => { onChange(item.name); setShowDrop(false); }}
            >
              <span>{item.name}</span>
              <span className="text-gray-400 text-xs">{item.stock} {item.unit}</span>
            </div>
          ))}
          {!exactMatch && (
            <div 
              className="p-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer text-sm text-blue-700 dark:text-blue-300 font-bold flex items-center gap-2 border-t border-blue-100 dark:border-slate-700"
              onClick={() => { onAddNewItem(value, category); setShowDrop(false); }}
            >
              <Plus size={16}/> Añadir "{value}" al inventario
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- COMPONENTE DE FORMULARIO PARA RECETAS (Añadir / Editar) ---
function RecipeForm({ initialData, onSave, onCancel, inventory, onAddInventoryItem }) {
  const isEditing = !!initialData;
  
  // Convertimos los datos anidados de initialData a un formato plano para el formulario
  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return {
        id: initialData.id,
        name: initialData.name || '',
        category: initialData.category || '',
        targetVolume: initialData.targetVolume || 20,
        og: initialData.og || 1.050,
        fg: initialData.fg || 1.010,
        abv: initialData.abv || 5.0,
        malts: initialData.ingredients?.malts || [{ name: '', amount: 0 }],
        hops: initialData.ingredients?.hops || [{ name: '', amount: 0, time: '', stage: 'Hervor' }],
        yeast: initialData.ingredients?.yeast?.name || '',
        strike: initialData.ingredients?.water?.strike || 15,
        sparge: initialData.ingredients?.water?.sparge || 15,
        waterProfile: initialData.waterProfile || { Ca: 100, Mg: 10, SO4: 100, Cl: 100, HCO3: 50 },
        modifications: initialData.modifications || [],
        steps: initialData.steps || [],
        tips: initialData.tips || []
      };
    }
    return {
      name: '', category: 'Hazy IPA', targetVolume: 20, og: 1.050, fg: 1.010, abv: 5.0,
      malts: [{ name: '', amount: 0 }],
      hops: [{ name: '', amount: 0, time: '', stage: 'Hervor' }],
      yeast: '', strike: 15, sparge: 15,
      waterProfile: { Ca: 100, Mg: 10, SO4: 100, Cl: 100, HCO3: 50 },
      modifications: [],
      steps: [],
      tips: []
    };
  });
  
  const [modNote, setModNote] = useState('');

  const handleSave = () => {
    if(!formData.name) return alert("Ponle un nombre a tu receta");
    
    const newModifications = [...(formData.modifications || [])];
    if (isEditing && modNote.trim()) {
       newModifications.push({ date: new Date().toLocaleDateString(), note: modNote });
    } else if (isEditing) {
       newModifications.push({ date: new Date().toLocaleDateString(), note: "Edición general sin detalle." });
    }

    const recipeToSave = {
      id: isEditing ? formData.id : 'recipe-' + Date.now(),
      category: formData.category,
      name: formData.name,
      targetVolume: Number(formData.targetVolume),
      og: formData.og, fg: formData.fg, abv: formData.abv,
      waterProfile: {
        Ca: Number(formData.waterProfile.Ca), Mg: Number(formData.waterProfile.Mg),
        SO4: Number(formData.waterProfile.SO4), Cl: Number(formData.waterProfile.Cl),
        HCO3: Number(formData.waterProfile.HCO3)
      },
      ingredients: {
        malts: formData.malts.filter(m => m.name !== '').map(m => ({...m, unit: 'kg', amount: Number(m.amount)})),
        hops: formData.hops.filter(h => h.name !== '').map(h => ({...h, unit: 'g', amount: Number(h.amount)})),
        yeast: { name: formData.yeast || "Levadura Genérica", amount: 1, unit: "sobre" },
        water: { strike: Number(formData.strike), sparge: Number(formData.sparge) }
      },
      steps: formData.steps.length > 0 ? formData.steps : [
        { id: 1, title: "Maceración", desc: "Macerar a temperatura deseada.", duration: 60 },
        { id: 2, title: "Hervor", desc: "Hervir por 60 minutos.", duration: 60 },
        { id: 3, title: "Fermentación", desc: "Fermentar y madurar según el estilo." }
      ],
      tips: formData.tips || [],
      modifications: newModifications
    };
    onSave(recipeToSave);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 animate-fadeIn">
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-4 mb-6">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">{isEditing ? 'Editar Receta' : 'Crear Nueva Receta'}</h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-red-500 font-bold transition-colors">Cancelar</button>
      </div>

      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Nombre</label>
            <input type="text" className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Mi primera Stout" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Estilo</label>
            <input type="text" className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Ej: Stout, Hazy IPA..." />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Vol (L)</label>
            <input type="number" className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={formData.targetVolume} onChange={e => setFormData({...formData, targetVolume: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">ABV (%)</label>
            <input type="number" step="0.1" className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={formData.abv} onChange={e => setFormData({...formData, abv: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">D. Orig.</label>
            <input type="number" step="0.001" className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={formData.og} onChange={e => setFormData({...formData, og: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">D. Final</label>
            <input type="number" step="0.001" className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={formData.fg} onChange={e => setFormData({...formData, fg: e.target.value})} />
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
           <h3 className="font-black text-lg mb-3 text-slate-800 dark:text-white flex items-center gap-2"><Wheat size={20} className="text-amber-500"/> Granos (kg)</h3>
           {formData.malts.map((m, i) => (
              <div key={i} className="flex gap-2 mb-2 relative">
                <AutocompleteInput value={m.name} onChange={val => { const newM = [...formData.malts]; newM[i].name = val; setFormData({...formData, malts: newM}) }} placeholder="Buscar malta..." category="Malta" inventory={inventory} onAddNewItem={onAddInventoryItem} />
                <input type="number" step="0.1" placeholder="Kg" className="w-24 p-3 border border-gray-300 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={m.amount} onChange={e => { const newM = [...formData.malts]; newM[i].amount = e.target.value; setFormData({...formData, malts: newM}) }} />
              </div>
           ))}
           <button onClick={() => setFormData({...formData, malts: [...formData.malts, {name:'', amount:0}]})} className="text-sm text-amber-600 font-bold hover:text-amber-800 transition-colors bg-amber-50 dark:bg-amber-900/30 px-3 py-2 rounded-lg mt-1">+ Añadir fila</button>
        </div>

        <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
           <h3 className="font-black text-lg mb-3 text-slate-800 dark:text-white flex items-center gap-2"><Leaf size={20} className="text-green-500"/> Lúpulos (g)</h3>
           {formData.hops.map((h, i) => (
              <div key={i} className="flex gap-2 mb-2 relative">
                <AutocompleteInput value={h.name} onChange={val => { const newH = [...formData.hops]; newH[i].name = val; setFormData({...formData, hops: newH}) }} placeholder="Buscar lúpulo..." category="Lúpulo" inventory={inventory} onAddNewItem={onAddInventoryItem} />
                <input type="number" placeholder="Gramos" className="w-20 p-3 border border-gray-300 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={h.amount} onChange={e => { const newH = [...formData.hops]; newH[i].amount = e.target.value; setFormData({...formData, hops: newH}) }} />
                <input type="text" placeholder="Minuto/DryHop" className="w-32 p-3 border border-gray-300 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hidden md:block" value={h.time} onChange={e => { const newH = [...formData.hops]; newH[i].time = e.target.value; setFormData({...formData, hops: newH}) }} />
              </div>
           ))}
           <button onClick={() => setFormData({...formData, hops: [...formData.hops, {name:'', amount:0, time:'', stage:'Hervor'}]})} className="text-sm text-green-600 font-bold hover:text-green-800 transition-colors bg-green-50 dark:bg-green-900/30 px-3 py-2 rounded-lg mt-1">+ Añadir fila</button>
        </div>

        <div className="border-t border-gray-200 dark:border-slate-700 pt-4 grid md:grid-cols-3 gap-4">
          <div className="col-span-1 relative">
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Levadura</label>
            <AutocompleteInput value={formData.yeast} onChange={val => setFormData({...formData, yeast: val})} placeholder="Buscar..." category="Levadura" inventory={inventory} onAddNewItem={onAddInventoryItem} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Agua Maceración (L)</label>
            <input type="number" className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={formData.strike} onChange={e => setFormData({...formData, strike: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Agua Lavado (L)</label>
            <input type="number" className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={formData.sparge} onChange={e => setFormData({...formData, sparge: e.target.value})} />
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-slate-700 pt-4 bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-2xl mt-4">
          <h3 className="font-black text-lg mb-3 text-blue-900 dark:text-blue-400 flex items-center gap-2"><Droplets size={20} className="text-blue-500"/> Perfil de Agua Objetivo (ppm)</h3>
          <div className="grid grid-cols-5 gap-2 md:gap-4">
            {['Ca', 'Mg', 'SO4', 'Cl', 'HCO3'].map((ion) => (
              <div key={ion}>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 text-center">{ion}</label>
                <input type="number" className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-center bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={formData.waterProfile[ion]} onChange={e => setFormData({ ...formData, waterProfile: { ...formData.waterProfile, [ion]: e.target.value } })} />
              </div>
            ))}
          </div>
        </div>

        {isEditing && (
          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
             <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nota de Modificación (Opcional)</label>
             <input type="text" placeholder="Ej: Cambié el lúpulo Citra por Mosaic para probar." className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={modNote} onChange={e => setModNote(e.target.value)} />
          </div>
        )}

        <button onClick={handleSave} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white p-4 rounded-2xl font-black text-lg flex justify-center items-center gap-2 mt-6 transition-transform hover:scale-[1.02] shadow-lg">
          <Save size={24} /> {isEditing ? 'Guardar Cambios' : 'Crear Receta'}
        </button>
      </div>
    </div>
  );
}

// --- APLICACIÓN PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [recipes, setRecipes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);

  const [view, setView] = useState('list'); 
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [activeTab, setActiveTab] = useState('recipe');
  const [targetVol, setTargetVol] = useState(20);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [expandedStep, setExpandedStep] = useState(null); 
  const [baseWater, setBaseWater] = useState({ Ca: 20, Mg: 5, SO4: 15, Cl: 20, HCO3: 30 }); 

  const [brewState, setBrewState] = useState({ stepIdx: 0, timeLeft: 0, isRunning: false, currentScaledRecipe: null });
  const [tastingFormId, setTastingFormId] = useState(null);
  const [tastingData, setTastingData] = useState({ rating: 0, notes: '' });
  
  const [showInvForm, setShowInvForm] = useState(false);
  const [newInvItem, setNewInvItem] = useState({ category: 'Malta', name: '', stock: 0, unit: 'kg', price: 0 });

  // Estados Formulario Auth
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // --- FIREBASE: Autenticación ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- FIREBASE: Carga de Datos ---
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'brewery', 'mainData');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRecipes(data.recipes && data.recipes.length > 0 ? data.recipes : initialRecipes);
        setInventory(data.inventory && data.inventory.length > 0 ? data.inventory : initialInventory);
        setHistory(data.history || []);
      } else {
        setDoc(docRef, { recipes: initialRecipes, inventory: initialInventory, history: [] });
        setRecipes(initialRecipes);
        setInventory(initialInventory);
        setHistory([]);
      }
      setIsDataLoaded(true);
    }, (error) => console.error("Error cargando base de datos:", error));
    
    return () => unsubscribe();
  }, [user]);

  const updateCloudData = async (newData) => {
    if (!user) return;
    setIsSaving(true); 
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'brewery', 'mainData');
      await setDoc(docRef, newData, { merge: true });
    } catch (e) {
      console.error("Error guardando:", e);
    } finally {
      setTimeout(() => setIsSaving(false), 800); 
    }
  };

  const forceSyncCloud = () => updateCloudData({ recipes, inventory, history });

  // --- GESTIÓN DE AUTH ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, authEmail, authPass);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPass);
      }
      setView('list');
    } catch (err) {
      setAuthError('Error: Verifica tus credenciales. (Nota: En el entorno de prueba simulado, crear cuentas reales puede no estar habilitado hasta que conectes tu propio Firebase).');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    // Reiniciar anónimo para no romper la app en canvas
    signInAnonymously(auth); 
    setView('list');
  };

  // --- INVENTARIO HELPER ---
  const handleAddInventoryItem = (name, category) => {
    const unit = category === 'Levadura' ? 'sobre' : category === 'Lúpulo' ? 'g' : 'kg';
    const newInv = [...inventory, { id: 'inv-' + Date.now(), category, name, stock: 0, unit, price: 0 }];
    setInventory(newInv);
    updateCloudData({ inventory: newInv });
  };

  // --- CRONÓMETRO ---
  useEffect(() => {
    let interval = null;
    if (brewState.isRunning && brewState.timeLeft > 0) {
      interval = setInterval(() => setBrewState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 })), 1000);
    } else if (brewState.timeLeft === 0 && brewState.isRunning) {
      setBrewState(prev => ({ ...prev, isRunning: false }));
    }
    return () => clearInterval(interval);
  }, [brewState.isRunning, brewState.timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const calculateCostForRecipe = (recipe, targetVolume) => {
      let neto = 0;
      recipe.ingredients.malts.forEach(m => {
        const item = inventory.find(i => i.category === 'Malta' && (i.name.toLowerCase() === m.name.toLowerCase() || m.name.toLowerCase().includes(i.name.toLowerCase())));
        neto += m.amount * (item ? item.price : defaultPrices.malta);
      });
      recipe.ingredients.hops.forEach(h => {
        const item = inventory.find(i => i.category === 'Lúpulo' && h.name.toLowerCase().includes(i.name.toLowerCase()));
        neto += h.amount * (item ? item.price : defaultPrices.lupulo);
      });
      const yItem = inventory.find(i => i.category === 'Levadura' && recipe.ingredients.yeast.name.toLowerCase().includes(i.name.toLowerCase()));
      neto += recipe.ingredients.yeast.amount * (yItem ? yItem.price : defaultPrices.levadura);
      return neto + (neto * 0.19);
  };

  const deleteHistoryItem = (id) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    updateCloudData({ history: newHistory });
  };

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center text-amber-600 animate-pulse">
          <Beaker size={64} className="mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-800">Conectando a la Nube...</h2>
          <p className="text-slate-500 font-bold">Cargando tu cervecería ☁️</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTAS
  // ==========================================

  // 0. Vista Auth (Login/Register)
  const renderAuth = () => (
    <div className="flex justify-center items-center min-h-[60vh] animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 p-4 rounded-full inline-block mb-3"><User size={40}/></div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">{isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Separa tus recetas e inventario del resto conectando tu cuenta.</p>
        </div>
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Correo Electrónico</label>
            <input type="email" required className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Contraseña</label>
            <input type="password" required className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" value={authPass} onChange={e => setAuthPass(e.target.value)} />
          </div>
          {authError && <p className="text-red-500 text-sm font-medium bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">{authError}</p>}
          <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 dark:bg-amber-600 dark:hover:bg-amber-500 text-white p-4 rounded-xl font-black transition-colors shadow-lg">
            {isRegistering ? 'Registrar y Entrar' : 'Entrar'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors">
            {isRegistering ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>
      </div>
    </div>
  );

  // 1. Vista de Lista (DASHBOARD)
  const renderList = () => {
    const grouped = recipes.reduce((acc, recipe) => {
      if (!acc[recipe.category]) acc[recipe.category] = [];
      acc[recipe.category].push(recipe);
      return acc;
    }, {});

    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 gap-4">
          <div className="flex items-center">
            <p className="text-slate-600 dark:text-slate-400 font-medium">Tienes <span className="text-amber-600 font-bold">{recipes.length} recetas</span> guardadas.</p>
            <button 
              onClick={() => {
                const existingIds = recipes.map(r => r.id);
                const missing = initialRecipes.filter(r => !existingIds.includes(r.id));
                if(missing.length > 0) {
                    const updated = [...recipes, ...missing];
                    setRecipes(updated);
                    updateCloudData({ recipes: updated });
                }
              }} 
              className="text-xs text-blue-500 hover:text-blue-600 underline ml-3 font-bold"
            >
              ¿Faltan recetas base?
            </button>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-center">
            <button onClick={() => setView('inventory')} className="flex-1 md:flex-none justify-center bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors">
              <Package size={18} /> Inventario
            </button>
            <button onClick={() => setView('history')} className="flex-1 md:flex-none justify-center bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors">
              <History size={18} /> Historial
            </button>
            <button onClick={() => setView('add')} className="flex-1 md:flex-none justify-center bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm">
              <Plus size={18} /> Nueva
            </button>
          </div>
        </div>

        {Object.keys(grouped).map(category => {
          const theme = getThemeForCategory(category);
          return (
            <div key={category} className="space-y-4">
              <h2 className={`text-2xl font-black ${theme.text} border-b-2 ${theme.border} pb-2 flex items-center gap-2`}>
                <Beer className={theme.icon} /> {category}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {grouped[category].map(recipe => {
                  // --- LÓGICA DE ESTADÍSTICAS (Lotes y Promedio de Cata) ---
                  const recipeHistory = history.filter(h => h.recipeName === recipe.name);
                  const brewCount = recipeHistory.length;
                  const ratedHistory = recipeHistory.filter(h => h.tasting && h.tasting.rating > 0);
                  const avgRating = ratedHistory.length > 0 
                    ? (ratedHistory.reduce((sum, h) => sum + h.tasting.rating, 0) / ratedHistory.length).toFixed(1) 
                    : null;

                  return (
                    <div 
                      key={recipe.id} 
                      onClick={() => {
                        setSelectedRecipe(recipe);
                        setTargetVol(recipe.targetVolume);
                        setCompletedSteps([]);
                        setActiveTab('recipe');
                        setView('recipe');
                      }}
                      className={`bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm hover:shadow-lg border-2 border-transparent hover:${theme.border} cursor-pointer transition-all group flex flex-col justify-between`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className={`inline-block px-3 py-1 rounded text-xs font-bold ${theme.badge}`}>{recipe.category}</span>
                          
                          {/* INDICADORES DE HISTORIAL */}
                          {brewCount > 0 && (
                            <div className="flex items-center gap-2 text-xs font-bold">
                              <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-2 py-1 rounded-lg flex items-center gap-1">
                                <CalendarClock size={12} /> {brewCount} {brewCount === 1 ? 'Lote' : 'Lotes'}
                              </span>
                              {avgRating && (
                                <span className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 px-2 py-1 rounded-lg flex items-center gap-1">
                                  <Star size={12} className="fill-amber-500 text-amber-500" /> {avgRating}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight mb-2 group-hover:text-amber-600 transition-colors">{recipe.name}</h3>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-5 text-sm text-slate-600 dark:text-slate-400 font-bold border-t border-gray-100 dark:border-slate-800 pt-4">
                        <span className="flex items-center gap-1"><Droplets size={16} className="text-blue-500"/> {recipe.targetVolume}L</span>
                        <span className="flex items-center gap-1"><Thermometer size={16} className="text-red-500"/> {recipe.abv}%</span>
                        <span className="flex items-center gap-1"><Clock size={16} className="text-slate-400"/> DO: {recipe.og}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 2. Vista Inventario
  const renderInventory = () => {
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
      newInv[index][field] = Number(value);
      setInventory(newInv);
      updateCloudData({ inventory: newInv });
    }

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 dark:border-slate-700 pb-4 gap-4">
          <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Package className="text-blue-500" size={32} /> Tu Inventario
          </h2>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => setShowInvForm(!showInvForm)} className="flex-1 md:flex-none justify-center flex items-center gap-2 text-white font-bold bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition-colors shadow-sm">
              <Plus size={20} /> Añadir
            </button>
            <button onClick={() => setView('list')} className="flex-1 md:flex-none justify-center flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 font-bold bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors">
              <ArrowLeft size={20} /> Volver
            </button>
          </div>
        </div>

        <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl text-sm text-blue-800 dark:text-blue-300 shadow-sm flex items-start gap-3">
          <Info className="flex-shrink-0 text-blue-500 mt-0.5" size={20}/>
          <p>Los precios definidos aquí calculan el costo de tus recetas. Cuando terminas una cocción, la app <strong>descuenta automáticamente</strong> los insumos utilizados.</p>
        </div>

        {showInvForm && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-end mb-8 animate-fadeIn">
            <div className="w-full md:w-1/5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categoría</label>
              <select className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white" value={newInvItem.category} onChange={e => setNewInvItem({...newInvItem, category: e.target.value, unit: e.target.value === 'Levadura' ? 'sobre' : e.target.value === 'Lúpulo' ? 'g' : 'kg'})}>
                <option value="Malta">Malta</option>
                <option value="Lúpulo">Lúpulo</option>
                <option value="Levadura">Levadura</option>
              </select>
            </div>
            <div className="w-full md:w-2/5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre del Insumo</label>
              <input type="text" className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" placeholder="Ej: Malta Caramelo" value={newInvItem.name} onChange={e => setNewInvItem({...newInvItem, name: e.target.value})} />
            </div>
            <div className="w-full md:w-1/5 flex gap-2">
              <div className="w-1/2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Stock</label>
                <input type="number" className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-center bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={newInvItem.stock} onChange={e => setNewInvItem({...newInvItem, stock: e.target.value})} />
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
                <input type="number" className="w-full p-3 pl-8 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={newInvItem.price} onChange={e => setNewInvItem({...newInvItem, price: e.target.value})} />
              </div>
            </div>
            <button onClick={handleAddInvItem} className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex justify-center items-center h-[50px] px-8 transition-colors shadow-sm">
              <Save size={20}/>
            </button>
          </div>
        )}

        {['Malta', 'Lúpulo', 'Levadura'].map(category => {
           const catIcon = category === 'Malta' ? <Wheat size={18} className="text-amber-500"/> : category === 'Lúpulo' ? <Leaf size={18} className="text-green-500"/> : <Beaker size={18} className="text-blue-500"/>;
           return (
            <div key={category} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden mb-8">
              <div className="bg-gray-50 dark:bg-slate-800/50 px-6 py-4 border-b dark:border-slate-800 font-black text-slate-800 dark:text-white text-lg flex items-center gap-2">
                {catIcon} {category}s
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="text-xs text-slate-400 uppercase bg-white dark:bg-slate-900">
                    <tr>
                      <th className="px-6 py-4 font-bold tracking-wider">Ingrediente</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Stock Actual</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Costo Unidad</th>
                      <th className="px-6 py-4 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {inventory.filter(i => i.category === category).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 group transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{item.name}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <input type="number" value={item.stock} onChange={(e) => updateInvItem(item.id, 'stock', e.target.value)} className="w-20 p-2 border border-gray-200 dark:border-slate-700 rounded-lg text-center mr-2 focus:ring-2 focus:ring-blue-500 outline-none font-medium bg-white dark:bg-slate-800 dark:text-white"/>
                            <span className="text-gray-400 font-bold">{item.unit}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center text-gray-400">
                            <span className="mr-1">$</span>
                            <input type="number" value={item.price} onChange={(e) => updateInvItem(item.id, 'price', e.target.value)} className="w-24 p-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800"/>
                            <span className="text-xs ml-2">/ {item.unit}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => handleDeleteInvItem(item.id)} className="text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {inventory.filter(i => i.category === category).length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-gray-400 italic">Inventario vacío. Añade insumos arriba.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
           )
        })}
      </div>
    );
  };

  // 3. Vista de Detalles de Receta (Con Tema Dinámico)
  const renderRecipeView = () => {
    if (!selectedRecipe) return null;

    const theme = getThemeForCategory(selectedRecipe.category);

    const scaleFactor = targetVol / selectedRecipe.targetVolume;
    const scaledRecipe = {
      ...selectedRecipe,
      ingredients: {
        malts: selectedRecipe.ingredients.malts.map(m => ({ ...m, amount: (m.amount * scaleFactor).toFixed(2) })),
        hops: selectedRecipe.ingredients.hops.map(h => ({ ...h, amount: Math.round(h.amount * scaleFactor) })),
        yeast: selectedRecipe.ingredients.yeast,
        water: {
          strike: (selectedRecipe.ingredients.water.strike * scaleFactor).toFixed(1),
          sparge: (selectedRecipe.ingredients.water.sparge * scaleFactor).toFixed(1)
        }
      }
    };

    const calculateCost = () => {
      let neto = 0; let allFound = true;
      scaledRecipe.ingredients.malts.forEach(m => {
        const item = inventory.find(i => i.category === 'Malta' && (i.name.toLowerCase() === m.name.toLowerCase() || m.name.toLowerCase().includes(i.name.toLowerCase())));
        if (item) neto += m.amount * item.price; else { neto += m.amount * defaultPrices.malta; allFound = false; }
      });
      scaledRecipe.ingredients.hops.forEach(h => {
        const item = inventory.find(i => i.category === 'Lúpulo' && h.name.toLowerCase().includes(i.name.toLowerCase()));
        if (item) neto += h.amount * item.price; else { neto += h.amount * defaultPrices.lupulo; allFound = false; }
      });
      const yItem = inventory.find(i => i.category === 'Levadura' && scaledRecipe.ingredients.yeast.name.toLowerCase().includes(i.name.toLowerCase()));
      if (yItem) neto += scaledRecipe.ingredients.yeast.amount * yItem.price; else { neto += scaledRecipe.ingredients.yeast.amount * defaultPrices.levadura; allFound = false; }
      
      const iva = neto * 0.19; const totalConIva = neto + iva;
      return { neto, iva, totalConIva, perLiter: totalConIva / targetVol, allFound };
    };
    const costInfo = calculateCost();

    const calculateSalts = () => {
      if (!scaledRecipe.waterProfile) return null;
      const target = scaledRecipe.waterProfile;
      const totalWaterLiters = Number(scaledRecipe.ingredients.water.strike) + Number(scaledRecipe.ingredients.water.sparge);
      if (totalWaterLiters <= 0) return null;

      const diff = {
        Ca: Math.max(0, target.Ca - baseWater.Ca), Mg: Math.max(0, target.Mg - baseWater.Mg),
        SO4: Math.max(0, target.SO4 - baseWater.SO4), Cl: Math.max(0, target.Cl - baseWater.Cl)
      };

      const epsomGrams = (diff.Mg * totalWaterLiters) / 99; const epsomSO4Contributed = (epsomGrams * 390) / totalWaterLiters || 0;
      const cacl2Grams = (diff.Cl * totalWaterLiters) / 482; const cacl2CaContributed = (cacl2Grams * 272) / totalWaterLiters || 0;
      const remainingSO4 = Math.max(0, diff.SO4 - epsomSO4Contributed);
      const gypsumGrams = (remainingSO4 * totalWaterLiters) / 558; const gypsumCaContributed = (gypsumGrams * 232) / totalWaterLiters || 0;

      const finalEstimates = {
        Ca: Math.round(baseWater.Ca + cacl2CaContributed + gypsumCaContributed), Mg: Math.round(baseWater.Mg + diff.Mg),
        SO4: Math.round(baseWater.SO4 + epsomSO4Contributed + remainingSO4), Cl: Math.round(baseWater.Cl + diff.Cl)
      };
      return { totalWater: totalWaterLiters, gypsum: gypsumGrams.toFixed(1), cacl2: cacl2Grams.toFixed(1), epsom: epsomGrams.toFixed(1), finalEstimates };
    };
    const saltAdditions = calculateSalts();

    const toggleStep = (id) => setCompletedSteps(prev => prev.includes(id) ? prev.filter(stepId => stepId !== id) : [...prev, id]);
    const toggleStepDetails = (e, id) => { e.stopPropagation(); setExpandedStep(prev => prev === id ? null : id); };

    return (
      <div className="animate-fadeIn">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setView('list')} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 font-bold bg-white dark:bg-slate-800 px-4 py-2 rounded-xl transition-colors shadow-sm border border-gray-200 dark:border-slate-700">
            <ArrowLeft size={20} /> Menú Principal
          </button>
          {/* BOTÓN EDITAR */}
          <button onClick={() => setView('edit')} className="flex items-center gap-2 text-white font-bold bg-slate-800 hover:bg-slate-900 px-4 py-2 rounded-xl transition-colors shadow-sm">
            <Edit3 size={18} /> Editar Receta
          </button>
        </div>

        {/* HEADER DINÁMICO DE LA RECETA */}
        <div className={`${theme.header} text-white p-6 md:p-10 rounded-t-3xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-end relative overflow-hidden`}>
          <div className="relative z-10">
            <span className="bg-white/20 px-4 py-1.5 rounded-full text-sm font-black tracking-wider uppercase mb-4 inline-block shadow-sm backdrop-blur-md">
              {scaledRecipe.category}
            </span>
            <h2 className="text-4xl md:text-5xl font-black mb-3 leading-tight drop-shadow-md">{scaledRecipe.name}</h2>
            <div className="flex flex-wrap gap-3 mt-5 font-bold text-white/90">
              <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10"><Thermometer size={18}/> ABV: {scaledRecipe.abv}%</span>
              <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10"><Clock size={18}/> DO: {scaledRecipe.og}</span>
              <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10"><CheckCircle2 size={18}/> DF: {scaledRecipe.fg}</span>
            </div>
          </div>
          
          <div className="mt-6 md:mt-0 flex flex-col items-start md:items-end bg-black/20 p-5 rounded-2xl backdrop-blur-md border border-white/20 relative z-10">
            <label className="font-bold text-white/90 text-sm mb-2 uppercase tracking-wider">Volumen Objetivo</label>
            <div className="flex items-center gap-3">
              <input 
                type="number" 
                value={targetVol}
                onChange={(e) => setTargetVol(Number(e.target.value))}
                className="w-24 p-2 bg-white text-slate-800 rounded-xl text-center focus:ring-4 focus:ring-white/50 outline-none text-2xl font-black shadow-inner"
                min="10" max="40"
              />
              <span className="text-white font-black text-2xl">L</span>
            </div>
          </div>
        </div>

        {/* TABS NAVEGACIÓN */}
        <div className="flex flex-wrap border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto rounded-b-none">
          <button onClick={() => setActiveTab('recipe')} className={`flex-1 min-w-[100px] py-4 font-bold text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'recipe' ? `${theme.bg} border-b-4 ${theme.border} ${theme.text}` : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <BookOpen size={18} /> Receta
          </button>
          <button onClick={() => setActiveTab('process')} className={`flex-1 min-w-[100px] py-4 font-bold text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'process' ? `${theme.bg} border-b-4 ${theme.border} ${theme.text}` : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <CheckCircle2 size={18} /> Proceso
          </button>
          <button onClick={() => setActiveTab('water')} className={`flex-1 min-w-[100px] py-4 font-bold text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'water' ? `${theme.bg} border-b-4 ${theme.border} ${theme.text}` : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <Droplets size={18} /> Agua
          </button>
          <button onClick={() => setActiveTab('tips')} className={`flex-1 min-w-[100px] py-4 font-bold text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'tips' ? `${theme.bg} border-b-4 ${theme.border} ${theme.text}` : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <Info size={18} /> Tips
          </button>
          {(scaledRecipe.modifications && scaledRecipe.modifications.length > 0) && (
            <button onClick={() => setActiveTab('history')} className={`flex-1 min-w-[100px] py-4 font-bold text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'history' ? `${theme.bg} border-b-4 ${theme.border} ${theme.text}` : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <FileClock size={18} /> Cambios
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-b-3xl shadow-sm border border-t-0 border-gray-100 dark:border-slate-800 mt-0">
          
          {/* TAB: RECETA */}
          {activeTab === 'recipe' && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* CARD FINANCIERA */}
              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
                 <div className="flex items-center gap-4 w-full md:w-auto">
                   <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-4 rounded-2xl text-white shadow-md flex-shrink-0">
                     <Banknote size={32} />
                   </div>
                   <div>
                     <h4 className="font-black text-emerald-900 dark:text-emerald-400 text-xl tracking-tight">Costo de Producción</h4>
                     {!costInfo.allFound && <p className="text-sm text-emerald-700 dark:text-emerald-600 font-medium flex items-center gap-1 mt-1"><Info size={14}/> Faltan ítems, usando estimación.</p>}
                   </div>
                 </div>
                 
                 <div className="flex flex-col md:flex-row gap-6 bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-emerald-100 dark:border-slate-700 w-full md:w-auto flex-1 md:flex-none justify-end">
                   <div className="flex flex-col text-sm border-b md:border-b-0 md:border-r border-gray-100 dark:border-slate-700 pb-4 md:pb-0 md:pr-6 justify-center">
                     <div className="flex justify-between gap-8 text-slate-500 dark:text-slate-400 mb-2">
                       <span>Neto:</span>
                       <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(costInfo.neto)}</span>
                     </div>
                     <div className="flex justify-between gap-8 text-slate-500 dark:text-slate-400">
                       <span>IVA (19%):</span>
                       <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(costInfo.iva)}</span>
                     </div>
                   </div>
                   
                   <div className="flex justify-between md:flex-col items-center md:items-end md:justify-center gap-2 pl-0 md:pl-2">
                     <div className="text-left md:text-right w-full">
                       <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Lote</span>
                       <span className="text-2xl font-black text-emerald-600 leading-none block">{formatCurrency(costInfo.totalConIva)}</span>
                     </div>
                     <div className="text-right w-full border-l border-gray-100 dark:border-slate-700 pl-4 md:border-none md:pl-0 mt-0 md:mt-3">
                       <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Costo x Litro</span>
                       <span className="text-xl font-black text-emerald-500 leading-none block">{formatCurrency(costInfo.perLiter)}</span>
                     </div>
                   </div>
                 </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* LISTA DE MALTAS */}
                <div className="bg-amber-50/50 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-200 dark:border-amber-800/30 shadow-sm">
                  <h3 className="text-xl font-black flex items-center gap-2 border-b border-amber-200 dark:border-amber-800/50 pb-3 mb-5 text-amber-900 dark:text-amber-500">
                    <Wheat className="text-amber-500" size={24}/> Granos y Agua
                  </h3>
                  <ul className="space-y-4">
                    {scaledRecipe.ingredients.malts.map((malt, idx) => (
                      <li key={idx} className="flex justify-between items-center text-base border-b border-amber-100 dark:border-amber-900/30 pb-3">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{malt.name}</span>
                        <span className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 text-amber-800 dark:text-amber-400 px-3 py-1 rounded-lg font-black shadow-sm">{malt.amount} {malt.unit}</span>
                      </li>
                    ))}
                    <li className="flex justify-between items-center pt-3 mt-2 border-t border-dashed border-amber-300 dark:border-amber-800/50">
                      <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-2"><Droplets size={16}/> Agua Strike (Macerar)</span>
                      <span className="font-black text-blue-800 dark:text-blue-300 text-lg">{scaledRecipe.ingredients.water.strike} L</span>
                    </li>
                    <li className="flex justify-between items-center pt-2">
                      <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-2"><Droplets size={16}/> Agua Sparge (Lavar)</span>
                      <span className="font-black text-blue-800 dark:text-blue-300 text-lg">{scaledRecipe.ingredients.water.sparge} L</span>
                    </li>
                  </ul>
                </div>

                {/* LISTA DE LÚPULOS */}
                <div className="bg-green-50/50 dark:bg-green-900/10 p-6 rounded-2xl border border-green-200 dark:border-green-800/30 shadow-sm">
                  <h3 className="text-xl font-black flex items-center gap-2 border-b border-green-200 dark:border-green-800/50 pb-3 mb-5 text-green-900 dark:text-green-500">
                    <Leaf className="text-green-500" size={24}/> Lúpulos
                  </h3>
                  <ul className="space-y-4">
                    {scaledRecipe.ingredients.hops.map((hop, idx) => (
                      <li key={idx} className="flex flex-col border-b border-green-100 dark:border-green-900/30 pb-3 last:border-0">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">{hop.name}</span>
                          <span className="bg-white dark:bg-slate-800 border border-green-200 dark:border-slate-700 text-green-800 dark:text-green-400 px-3 py-1 rounded-lg font-black shadow-sm">{hop.amount} {hop.unit}</span>
                        </div>
                        <span className="text-green-700 dark:text-green-300 font-bold text-xs flex items-center gap-1.5 bg-green-100/50 dark:bg-green-900/40 w-fit px-2.5 py-1 rounded-md border border-green-200/50 dark:border-green-800">
                          <Clock size={14}/> {hop.time} <span className="mx-1">•</span> <span className="uppercase tracking-wider">{hop.stage}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center gap-5 shadow-sm">
                 <div className="bg-white dark:bg-slate-700 p-4 rounded-2xl text-slate-600 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600 flex-shrink-0">
                    <Beaker size={32} />
                 </div>
                 <div>
                   <h4 className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs mb-1">Levadura Recomendada</h4>
                   <p className="text-slate-800 dark:text-white font-black text-2xl">{scaledRecipe.ingredients.yeast.amount} <span className="text-lg font-bold text-slate-500">{scaledRecipe.ingredients.yeast.unit}</span> de <span className="text-amber-600 dark:text-amber-500">{scaledRecipe.ingredients.yeast.name}</span></p>
                 </div>
              </div>
            </div>
          )}

          {/* TAB: PROCESO */}
          {activeTab === 'process' && (
            <div className="space-y-5 animate-fadeIn">
              <div className={`${theme.header} text-white p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-6 mb-8`}>
                <div className="text-center md:text-left">
                  <h3 className="text-3xl font-black flex items-center justify-center md:justify-start gap-3 mb-2"><Play size={32} className="fill-white" /> Día de Cocción</h3>
                  <p className="text-white/80 font-bold text-sm md:text-base">Modo guiado paso a paso. Al finalizar descontaremos automáticamente de tu inventario.</p>
                </div>
                <button 
                  onClick={() => {
                    const firstStep = scaledRecipe.steps[0];
                    setBrewState({ stepIdx: 0, timeLeft: firstStep.duration ? firstStep.duration * 60 : 0, isRunning: false, currentScaledRecipe: scaledRecipe });
                    setView('brew');
                  }}
                  className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black transition-all shadow-xl w-full md:w-auto text-center hover:scale-105"
                >
                  ¡Empezar a Cocinar!
                </button>
              </div>

              {scaledRecipe.steps.map((step) => (
                <div key={step.id} className="flex flex-col group">
                  <div 
                    onClick={() => toggleStep(step.id)}
                    className={`p-6 rounded-t-2xl md:rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-5 ${completedSteps.includes(step.id) ? 'border-green-400 bg-green-50/50 dark:bg-green-900/20 opacity-70' : 'border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-amber-300 dark:hover:border-amber-600'} ${expandedStep === step.id ? 'rounded-b-none border-b-0' : ''}`}
                  >
                    <button className={`mt-1 rounded-full flex-shrink-0 transition-colors ${completedSteps.includes(step.id) ? 'text-green-500' : 'text-gray-300 dark:text-slate-600 group-hover:text-amber-400'}`}>
                      <CheckCircle2 size={32} className={completedSteps.includes(step.id) ? 'fill-green-100 dark:fill-green-900' : ''} />
                    </button>
                    <div className="flex-1">
                      <h3 className={`font-black text-xl ${completedSteps.includes(step.id) ? 'text-green-800 dark:text-green-400 line-through decoration-green-400 decoration-2' : 'text-slate-800 dark:text-white'}`}>
                        {step.id}. {step.title}
                      </h3>
                      <p className={`text-base mt-2 leading-relaxed font-medium ${completedSteps.includes(step.id) ? 'text-green-700 dark:text-green-500' : 'text-slate-600 dark:text-slate-400'}`}>
                        {step.desc}
                      </p>
                    </div>
                    {step.details && (
                      <button 
                        onClick={(e) => toggleStepDetails(e, step.id)}
                        className="ml-auto text-gray-400 hover:text-amber-600 p-2 flex flex-col items-center justify-center transition-colors bg-gray-50 dark:bg-slate-800 rounded-lg"
                        title="Ver detalle del paso"
                      >
                        {expandedStep === step.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Detalle</span>
                      </button>
                    )}
                  </div>
                  
                  {expandedStep === step.id && step.details && (
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-t-0 border-slate-200 dark:border-slate-700 rounded-b-2xl text-slate-800 dark:text-slate-200 animate-fadeIn text-base shadow-inner">
                      <h4 className="font-black flex items-center gap-2 mb-4 text-amber-700 dark:text-amber-500"><Info size={20}/> Guía Técnica:</h4>
                      <div className="pl-6 space-y-3 border-l-4 border-amber-300 dark:border-amber-700 font-medium">
                         {step.details.split(/(\d+\.\s)/).filter(Boolean).reduce((acc, curr, i, arr) => {
                            if (i % 2 === 0) acc.push(<p key={i} className="pl-3"><strong>{curr}</strong>{arr[i+1]}</p>);
                            return acc;
                         }, [])}
                         {!step.details.match(/\d+\.\s/) && <p className="pl-3">{step.details}</p>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB: AGUA */}
          {activeTab === 'water' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-8 rounded-3xl border border-blue-100 dark:border-blue-800 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 text-blue-500 pointer-events-none">
                  <Droplets size={160} />
                </div>
                <h3 className="text-2xl font-black text-blue-900 dark:text-blue-400 mb-2 flex items-center gap-2 relative z-10">
                  <Droplets size={28} className="text-blue-500" /> Perfil Mineral Objetivo
                </h3>
                <p className="text-blue-800 dark:text-blue-300 text-base mb-6 font-medium relative z-10">
                  Clave para resaltar el lúpulo crujiente o la sedosidad maltosa.
                </p>
                
                {scaledRecipe.waterProfile ? (
                  <div className="grid grid-cols-5 gap-3 text-center relative z-10">
                    {['Ca', 'Mg', 'SO4', 'Cl', 'HCO3'].map(ion => (
                      <div key={ion} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-blue-100 dark:border-slate-700 flex flex-col">
                        <span className="block font-black text-slate-400 text-xs uppercase tracking-wider mb-1">{ion}</span>
                        <span className="text-blue-600 dark:text-blue-400 font-black text-2xl">{scaledRecipe.waterProfile[ion]}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-xl text-center text-slate-500 font-bold border border-blue-100 relative z-10">
                    No hay un perfil estricto para esta receta.
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm">
                 <h4 className="font-black text-slate-800 dark:text-white mb-6 text-xl">Tu Agua de la Llave (PPM)</h4>
                 <div className="grid grid-cols-5 gap-3 md:gap-5">
                    {['Ca', 'Mg', 'SO4', 'Cl', 'HCO3'].map(ion => (
                      <div key={ion}>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">{ion}</label>
                        <input 
                          type="number" 
                          value={baseWater[ion]} 
                          onChange={(e) => setBaseWater({...baseWater, [ion]: Number(e.target.value)})}
                          className="w-full p-4 border border-gray-200 dark:border-slate-700 rounded-2xl text-center font-black text-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 dark:bg-slate-800 text-slate-800 dark:text-white transition-colors"
                        />
                      </div>
                    ))}
                 </div>
              </div>

              {saltAdditions && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 p-6 md:p-10 rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-md">
                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                     <h4 className="font-black text-amber-900 dark:text-amber-500 text-3xl flex items-center gap-3">
                       <Scale size={32} className="text-amber-600" /> Adición de Sales
                     </h4>
                     <span className="bg-amber-600 text-white px-5 py-2.5 rounded-xl text-base font-black shadow-sm">
                       Para {saltAdditions.totalWater} L (Total)
                     </span>
                   </div>
                   
                   <p className="text-lg text-amber-800 dark:text-slate-300 font-medium mb-8">
                     Mezcla estas cantidades exactas en el agua antes de agregar la malta.
                   </p>

                   <div className="grid md:grid-cols-3 gap-5 mb-8">
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-amber-100 dark:border-slate-700 text-center shadow-sm relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-400"></div>
                       <span className="block font-black text-slate-800 dark:text-white text-4xl mb-2">{saltAdditions.cacl2}g</span>
                       <span className="text-sm font-bold text-slate-500 uppercase tracking-wider block">Cloruro de Calcio</span>
                     </div>
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-amber-100 dark:border-slate-700 text-center shadow-sm relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-400"></div>
                       <span className="block font-black text-slate-800 dark:text-white text-4xl mb-2">{saltAdditions.gypsum}g</span>
                       <span className="text-sm font-bold text-slate-500 uppercase tracking-wider block">Gypsum (CaSO4)</span>
                     </div>
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-amber-100 dark:border-slate-700 text-center shadow-sm relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-1.5 bg-green-400"></div>
                       <span className="block font-black text-slate-800 dark:text-white text-4xl mb-2">{saltAdditions.epsom}g</span>
                       <span className="text-sm font-bold text-slate-500 uppercase tracking-wider block">Sal de Epsom</span>
                     </div>
                   </div>

                   <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-amber-200 dark:border-slate-700 shadow-sm">
                     <h5 className="font-black text-sm text-slate-400 uppercase tracking-widest mb-4 text-center">Perfil Final Estimado</h5>
                     <div className="flex justify-around text-lg font-bold">
                       <span className="text-slate-500">Ca: <span className={saltAdditions.finalEstimates.Ca >= scaledRecipe.waterProfile.Ca ? 'text-green-600' : 'text-amber-600'}>{saltAdditions.finalEstimates.Ca}</span></span>
                       <span className="text-slate-500">Mg: <span className="text-green-600">{saltAdditions.finalEstimates.Mg}</span></span>
                       <span className="text-slate-500">SO4: <span className="text-green-600">{saltAdditions.finalEstimates.SO4}</span></span>
                       <span className="text-slate-500">Cl: <span className="text-green-600">{saltAdditions.finalEstimates.Cl}</span></span>
                     </div>
                   </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: TIPS */}
          {activeTab === 'tips' && (
            <div className="space-y-6 animate-fadeIn">
              {scaledRecipe.tips.map((tip, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-800 border-l-4 border-amber-500 shadow-sm p-6 rounded-r-2xl">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                    💡 {tip.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed font-medium">
                    {tip.desc}
                  </p>
                </div>
              ))}
              {scaledRecipe.tips.length === 0 && (
                <p className="text-gray-500 font-medium italic text-center py-10 bg-gray-50 dark:bg-slate-800 rounded-xl">No hay tips específicos para esta receta, ¡aplica las buenas prácticas de siempre!</p>
              )}
            </div>
          )}

          {/* TAB: HISTORIAL CAMBIOS */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-6 border-b border-gray-200 dark:border-slate-700 pb-3">Historial de Modificaciones</h3>
              <div className="border-l-4 border-slate-300 dark:border-slate-600 ml-4 pl-6 space-y-8">
                {scaledRecipe.modifications.map((mod, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[37px] top-1 bg-white dark:bg-slate-900 border-4 border-slate-300 dark:border-slate-600 w-5 h-5 rounded-full"></div>
                    <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block mb-1">{mod.date}</span>
                    <p className="text-slate-700 dark:text-slate-300 font-medium bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">"{mod.note}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    );
  };

  // 4. Vista Modo de Cocción
  const renderBrewSession = () => {
    if (!brewState.currentScaledRecipe) return null;
    const recipe = brewState.currentScaledRecipe;
    const step = recipe.steps[brewState.stepIdx];
    const isLastStep = brewState.stepIdx === recipe.steps.length - 1;

    const handleNextStep = () => {
      if (isLastStep) {
        const totalCost = calculateCostForRecipe(recipe, recipe.targetVolume);

        let currentInventory = JSON.parse(JSON.stringify(inventory));
        recipe.ingredients.malts.forEach(m => {
            const item = currentInventory.find(i => i.category === 'Malta' && (i.name.toLowerCase() === m.name.toLowerCase() || m.name.toLowerCase().includes(i.name.toLowerCase())));
            if (item) item.stock = Math.max(0, item.stock - Number(m.amount));
        });
        recipe.ingredients.hops.forEach(h => {
            const item = currentInventory.find(i => i.category === 'Lúpulo' && h.name.toLowerCase().includes(i.name.toLowerCase()));
            if (item) item.stock = Math.max(0, item.stock - Number(h.amount));
        });
        const yItem = currentInventory.find(i => i.category === 'Levadura' && recipe.ingredients.yeast.name.toLowerCase().includes(i.name.toLowerCase()));
        if (yItem) yItem.stock = Math.max(0, yItem.stock - Number(recipe.ingredients.yeast.amount));

        const newHistoryItem = {
          id: 'hist-' + Date.now(),
          recipeName: recipe.name,
          date: new Date().toLocaleDateString(),
          volume: recipe.targetVolume,
          og: recipe.og,
          fg: recipe.fg,
          abv: recipe.abv,
          totalCost: totalCost,
          notes: "Producción completada. Insumos descontados."
        };
        
        const newHistory = [newHistoryItem, ...history];
        
        setHistory(newHistory);
        setInventory(currentInventory);
        updateCloudData({ history: newHistory, inventory: currentInventory });
        setView('history');

      } else {
        const nextStep = recipe.steps[brewState.stepIdx + 1];
        setBrewState({
          ...brewState,
          stepIdx: brewState.stepIdx + 1,
          timeLeft: nextStep.duration ? nextStep.duration * 60 : 0,
          isRunning: false
        });
      }
    };

    return (
      <div className="bg-slate-900 p-6 md:p-12 rounded-3xl shadow-2xl border border-slate-700 animate-fadeIn min-h-[75vh] flex flex-col text-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex justify-between items-center border-b border-slate-700/50 pb-6 mb-8 relative z-10">
          <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3 text-amber-500">
            <Beaker size={32} /> Cocinando: <span className="text-white drop-shadow-sm">{recipe.name}</span>
          </h2>
          <span className="bg-slate-800 text-slate-300 px-4 py-2 rounded-full font-black text-sm tracking-wider uppercase border border-slate-700 shadow-inner">
            Paso {brewState.stepIdx + 1} de {recipe.steps.length}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 relative z-10">
          <h3 className="text-4xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-md">{step.title}</h3>
          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl font-medium leading-relaxed">{step.desc}</p>
          
          {step.details && (
             <div className="bg-slate-800/80 backdrop-blur-md p-6 md:p-8 rounded-2xl text-left max-w-3xl border border-slate-600/50 text-lg text-slate-200 w-full shadow-2xl">
               <span className="font-black flex items-center gap-2 mb-3 text-amber-400 uppercase tracking-wider text-sm"><Info size={20}/> Detalle Técnico</span>
               <p className="leading-relaxed">{step.details}</p>
             </div>
          )}

          {step.duration !== undefined ? (
            <div className="my-10">
              <div className={`text-8xl md:text-[12rem] font-black tracking-tighter font-mono drop-shadow-2xl ${brewState.timeLeft === 0 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                {formatTime(brewState.timeLeft)}
              </div>
              <div className="flex justify-center gap-6 mt-12">
                <button 
                  onClick={() => setBrewState(prev => ({ ...prev, isRunning: !prev.isRunning }))}
                  className={`px-12 py-6 rounded-full font-black text-2xl flex items-center gap-4 text-white transition-all shadow-xl hover:scale-105 ${brewState.isRunning ? 'bg-orange-600 hover:bg-orange-500 border-b-4 border-orange-800' : 'bg-emerald-600 hover:bg-emerald-500 border-b-4 border-emerald-800'}`}
                >
                  {brewState.isRunning ? <><Pause className="fill-white" size={32}/> Pausar</> : <><Play className="fill-white" size={32}/> Iniciar</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="my-12 p-12 border-4 border-dashed border-slate-700 rounded-3xl w-full max-w-2xl bg-slate-800/30 backdrop-blur-sm">
              <p className="text-slate-400 font-bold text-2xl">Este paso es manual. Avanza cuando termines.</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-700/50 pt-8 mt-auto flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
          <button onClick={() => setView('recipe')} className="text-slate-400 hover:text-red-400 font-bold text-lg transition-colors">Abandonar Cocción</button>
          <button 
            onClick={handleNextStep}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-10 py-5 rounded-2xl font-black text-xl flex items-center gap-3 transition-all shadow-xl border-b-4 border-amber-700 hover:border-amber-600 active:translate-y-1 active:border-b-0 w-full md:w-auto justify-center"
          >
            {isLastStep ? <><Save size={28} /> Finalizar y Guardar</> : <>Siguiente Paso <SkipForward size={28} /></>}
          </button>
        </div>
      </div>
    );
  };

  // 5. Vista de Historial
  const renderHistory = () => {
    const saveTasting = () => {
      const newHistory = history.map(h => 
        h.id === tastingFormId ? { ...h, tasting: tastingData } : h
      );
      setHistory(newHistory);
      updateCloudData({ history: newHistory }); 
      setTastingFormId(null);
    };

    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 dark:border-slate-700 pb-4 gap-4">
          <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <History className="text-blue-600" size={32} /> Historial de Producción
          </h2>
          <button 
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 font-bold bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors shadow-sm w-full md:w-auto justify-center"
          >
            <ArrowLeft size={20} /> Menú Principal
          </button>
        </div>

        {history.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl text-center shadow-sm border border-gray-100 dark:border-slate-800">
            <CalendarClock size={72} className="mx-auto text-gray-300 dark:text-slate-700 mb-5" />
            <h3 className="text-2xl font-black text-slate-700 dark:text-slate-300 mb-2">Aún no hay lotes registrados</h3>
            <p className="text-slate-500 dark:text-slate-500 font-medium">Inicia un "Día de Cocción" desde cualquier receta y guárdala al finalizar.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {history.map((h) => (
              <div key={h.id} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all relative group">
                
                <button 
                  onClick={() => deleteHistoryItem(h.id)}
                  className="absolute top-6 right-6 text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors md:opacity-0 group-hover:opacity-100 bg-white dark:bg-slate-800 p-2 rounded-lg"
                  title="Eliminar registro"
                >
                  <Trash2 size={20} />
                </button>

                <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
                  <div className="flex items-start gap-5 w-full lg:w-3/5">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl text-blue-600 dark:text-blue-400 hidden sm:block mt-1 border border-blue-100 dark:border-blue-800">
                      <Beer size={32} />
                    </div>
                    <div className="w-full pr-8 md:pr-0">
                      <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3">{h.recipeName}</h3>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1.5"><CalendarClock size={16}/> {h.date}</span>
                        <span className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5"><Droplets size={16}/> {h.volume} L</span>
                        <span className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-lg text-sm font-black flex items-center gap-1.5">💰 Total: {formatCurrency(h.totalCost || 0)}</span>
                        <span className="bg-emerald-100 dark:bg-emerald-800/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 px-3 py-1.5 rounded-lg text-sm font-black flex items-center gap-1.5 text-xs uppercase tracking-wider">🏷️ x Litro: {formatCurrency((h.totalCost || 0) / (h.volume || 1))}</span>
                      </div>
                      
                      <div className="flex gap-6 text-sm text-slate-500 dark:text-slate-400 font-bold border-t border-gray-100 dark:border-slate-800 pt-4 mt-2">
                         <span className="flex items-center gap-1">🎯 DO: <span className="text-slate-800 dark:text-white">{h.og || '-'}</span></span>
                         <span className="flex items-center gap-1">🏁 DF: <span className="text-slate-800 dark:text-white">{h.fg || '-'}</span></span>
                         <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">🍻 ABV: {h.abv || '-'}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full lg:w-2/5 flex flex-col justify-between h-full bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700">
                     {h.tasting ? (
                       <div>
                         <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Evaluación Final:</span>
                            <div className="flex items-center">
                              {[1,2,3,4,5].map(star => (
                                <Star key={star} size={18} className={star <= h.tasting.rating ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-slate-600"} />
                              ))}
                            </div>
                         </div>
                         <p className="text-slate-700 dark:text-slate-300 text-sm font-medium italic leading-relaxed">"{h.tasting.notes}"</p>
                       </div>
                     ) : (
                       <div className="text-center py-5">
                         <p className="text-slate-400 font-bold mb-4">Aún no evaluada</p>
                         {!tastingFormId && (
                           <button 
                             onClick={() => { setTastingFormId(h.id); setTastingData({ rating: 0, notes: '' }); }}
                             className="text-white text-sm font-bold bg-amber-500 hover:bg-amber-600 px-6 py-3 rounded-xl transition-colors shadow-sm inline-flex items-center gap-2"
                           >
                             <Star size={18} className="fill-white" /> Anotar Cata
                           </button>
                         )}
                       </div>
                     )}
                  </div>
                </div>

                {tastingFormId === h.id && (
                  <div className="mt-8 pt-6 border-t border-dashed border-gray-200 dark:border-slate-700 animate-fadeIn">
                    <h4 className="font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2 text-lg"><Star className="text-amber-500 fill-amber-500" size={24}/> Notas de Degustación</h4>
                    <div className="flex gap-2 mb-5 bg-slate-50 dark:bg-slate-800 w-fit p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                      {[1,2,3,4,5].map(star => (
                        <button key={star} onClick={() => setTastingData({...tastingData, rating: star})}>
                          <Star size={36} className={`transition-transform hover:scale-110 ${star <= tastingData.rating ? "fill-amber-400 text-amber-400 drop-shadow-sm" : "text-gray-300 dark:text-slate-600"}`} />
                        </button>
                      ))}
                    </div>
                    <textarea 
                      className="w-full p-4 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none mb-4 text-base font-medium bg-gray-50 dark:bg-slate-800 text-slate-800 dark:text-white resize-none"
                      rows="3"
                      placeholder="¿Qué tal el aroma a lúpulo? ¿Cuerpo sedoso? ¿Retención de espuma?"
                      value={tastingData.notes}
                      onChange={(e) => setTastingData({...tastingData, notes: e.target.value})}
                    ></textarea>
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setTastingFormId(null)} className="px-6 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold transition-colors">Cancelar</button>
                      <button onClick={saveTasting} className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black shadow-md transition-colors">Guardar Evaluación</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans p-4 md:p-6 lg:p-10 selection:bg-amber-200 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          
          {/* HEADER GLOBAL REDISEÑADO CON FLEX */}
          <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl mb-8 flex flex-col justify-between items-stretch relative overflow-hidden border border-slate-700 gap-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse pointer-events-none" style={{animationDelay: '2s'}}></div>
            
            {/* Fila Superior: Controles (Nube, Modo Oscuro, Auth) */}
            <div className="relative z-10 flex flex-wrap justify-end gap-3 w-full">
              <button onClick={forceSyncCloud} disabled={isSaving} title="Forzar Sincronización Manual" className="flex items-center gap-2 text-xs font-black bg-slate-800/80 hover:bg-slate-700 px-4 py-2.5 rounded-full border border-slate-600 backdrop-blur-sm transition-colors disabled:cursor-wait shadow-sm">
                {isSaving ? <><RefreshCw size={14} className="animate-spin text-amber-400" /><span className="text-amber-400">GUARDANDO...</span></> : <><Cloud size={14} className="text-emerald-400" /><span className="text-emerald-400">NUBE SINC.</span></>}
              </button>
              
              <button onClick={() => setDarkMode(!darkMode)} className="flex items-center justify-center w-10 h-10 bg-slate-800/80 hover:bg-slate-700 rounded-full border border-slate-600 backdrop-blur-sm transition-colors shadow-sm text-slate-300 hover:text-amber-300">
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {user && !user.isAnonymous ? (
                <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-bold bg-red-900/30 hover:bg-red-900/50 text-red-300 px-4 py-2.5 rounded-full border border-red-800/50 backdrop-blur-sm transition-colors shadow-sm">
                  <LogOut size={14} /> Salir ({user.email?.split('@')[0]})
                </button>
              ) : (
                <button onClick={() => setView('auth')} className="flex items-center gap-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-full border border-amber-500 backdrop-blur-sm transition-colors shadow-sm">
                  <User size={14} /> Iniciar Sesión
                </button>
              )}
            </div>
            
            {/* Fila Inferior: Título y Navegación Principal */}
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 mt-2">
              <div className="flex items-center gap-5 text-center md:text-left">
                <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-4 rounded-2xl shadow-lg">
                  <Beaker size={36} className="text-slate-900" />
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-1">BrewMaster Guten</h1>
                  <p className="text-slate-400 text-sm md:text-base font-medium">Sistema operativo para tu cervecería artesanal.</p>
                </div>
              </div>
              
              {view !== 'list' && (
                <button onClick={() => setView('list')} className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold transition-all border border-white/10 backdrop-blur-md flex items-center gap-2 hover:scale-105 shadow-sm w-full md:w-auto justify-center">
                  <BookOpen size={18}/> Mis Recetas
                </button>
              )}
            </div>
          </div>

          {/* CONTENEDOR DE VISTAS */}
          <main className="transition-all duration-300 ease-in-out">
            {view === 'auth' && renderAuth()}
            {view === 'list' && renderList()}
            {view === 'recipe' && renderRecipeView()}
            {view === 'add' && <RecipeForm onSave={(newRecipe) => { 
               const newRecipesList = [...recipes, newRecipe];
               setRecipes(newRecipesList); updateCloudData({ recipes: newRecipesList }); setView('list'); 
            }} onCancel={() => setView('list')} inventory={inventory} onAddInventoryItem={handleAddInventoryItem} />}
            {view === 'edit' && <RecipeForm initialData={selectedRecipe} onSave={(updatedRecipe) => { 
               const newRecipesList = recipes.map(r => r.id === updatedRecipe.id ? updatedRecipe : r);
               setRecipes(newRecipesList); setSelectedRecipe(updatedRecipe); updateCloudData({ recipes: newRecipesList }); setView('recipe'); 
            }} onCancel={() => setView('recipe')} inventory={inventory} onAddInventoryItem={handleAddInventoryItem} />}
            {view === 'brew' && renderBrewSession()}
            {view === 'history' && renderHistory()}
            {view === 'inventory' && renderInventory()}
          </main>

        </div>
      </div>
    </div>
  );
}