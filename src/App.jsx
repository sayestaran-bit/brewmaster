import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Beaker, Thermometer, Droplets, Clock, Info, CheckCircle2, 
  ChevronRight, BookOpen, Plus, ArrowLeft, Beer, Save, 
  Trash2, ChevronDown, ChevronUp, Play, Pause, SkipForward, 
  History, CalendarClock, Scale, Package, Star, MessageSquare, 
  Banknote, Wheat, Leaf, Cloud, RefreshCw, Moon, Sun, User, 
  LogOut, Edit3, FileClock, Eye, EyeOff, Activity, Palette, ListOrdered,
  Sparkles, Loader2, BrainCircuit, Wand2, TrendingUp, BarChart3, PieChart,
  LayoutDashboard, Filter, AlertTriangle
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- FIREBASE SETUP BLINDADO ---
let firebaseConfig = {
  apiKey: "AIzaSyCGnXySz-WX7doAbY_p6BPd5umEX5QRHrw",
  authDomain: "brewmaster-86405.firebaseapp.com",
  projectId: "brewmaster-86405",
  storageBucket: "brewmaster-86405.firebasestorage.app",
  messagingSenderId: "891974847846",
  appId: "1:891974847846:web:32fb973e8f774f28524ca7",
  measurementId: "G-PY0EMY8PQV"
};

try {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    firebaseConfig = JSON.parse(__firebase_config);
  }
} catch (e) {
  console.error("Error leyendo config de firebase", e);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Sanitizamos el ID de la app
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'brewmaster-pro-v1';
const appId = rawAppId.replace(/[^a-zA-Z0-9_-]/g, '_');

// --- GEMINI API INTEGRATION ---
const apiKey = "";

const callGemini = async (prompt, systemInstruction = "", isJson = false) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  if (systemInstruction) payload.systemInstruction = { parts: [{ text: systemInstruction }] };
  if (isJson) payload.generationConfig = { responseMimeType: "application/json" };

  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      return isJson ? JSON.parse(text) : text;
    } catch (error) {
      if (attempt === 4) throw new Error("No se pudo contactar a la IA después de varios intentos. Verifica tu conexión.");
      await new Promise(resolve => setTimeout(resolve, delays[attempt]));
    }
  }
};

// --- FORMATO DE MONEDA & FECHAS ---
const formatCurrency = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(val) || 0);

const parseDateToTimestamp = (dateStr) => {
  if (!dateStr) return 0;
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
  return Date.now();
};

// --- SIMULADOR DE COLOR SRM A HEX ---
const getSrmColor = (srm) => {
  const srmColors = {
    1: '#FFE699', 2: '#FFD878', 3: '#FFCA5A', 4: '#FFBF42', 5: '#FBB123',
    6: '#F8A600', 7: '#F39C00', 8: '#EA8F00', 9: '#E58500', 10: '#DE7C00',
    11: '#D77200', 12: '#CF6900', 13: '#CB6200', 14: '#C35900', 15: '#BB5100',
    16: '#B54C00', 17: '#B04500', 18: '#A63E00', 19: '#A13700', 20: '#9B3200',
    21: '#962D00', 22: '#8E2900', 23: '#882300', 24: '#821E00', 25: '#7B1A00',
    30: '#5E0B00', 35: '#4C0500', 40: '#380000'
  };
  if (!srm || srm <= 0) return '#FFD878';
  const keys = Object.keys(srmColors).map(Number);
  const closest = keys.reduce((prev, curr) => Math.abs(curr - srm) < Math.abs(prev - srm) ? curr : prev);
  return srmColors[closest];
};

// --- MOTOR DE ESTILOS VISUALES DINÁMICOS ---
const getThemeForCategory = (category = '') => {
  const cat = category.toLowerCase();
  if (cat.includes('hazy') || cat.includes('ipa') || cat.includes('pale ale')) {
    return { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-900 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700', icon: 'text-orange-500', badge: 'bg-orange-100 text-orange-800 dark:bg-orange-800/50 dark:text-orange-200', header: 'bg-gradient-to-r from-orange-500 to-amber-500', colorBase: '#f97316' };
  }
  if (cat.includes('lager') || cat.includes('pilsner') || cat.includes('blonde')) {
    return { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-900 dark:text-yellow-300', border: 'border-yellow-400 dark:border-yellow-700', icon: 'text-yellow-500', badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/50 dark:text-yellow-200', header: 'bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-900', colorBase: '#eab308' };
  }
  if (cat.includes('amber') || cat.includes('red') || cat.includes('scotch')) {
    return { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-900 dark:text-red-300', border: 'border-red-300 dark:border-red-700', icon: 'text-red-600', badge: 'bg-red-100 text-red-800 dark:bg-red-800/50 dark:text-red-200', header: 'bg-gradient-to-r from-red-700 to-orange-600', colorBase: '#dc2626' };
  }
  if (cat.includes('stout') || cat.includes('porter') || cat.includes('dark')) {
    return { bg: 'bg-stone-100 dark:bg-stone-800/40', text: 'text-stone-900 dark:text-stone-300', border: 'border-stone-400 dark:border-stone-600', icon: 'text-stone-700 dark:text-stone-400', badge: 'bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-300', header: 'bg-gradient-to-r from-stone-800 to-stone-600', colorBase: '#44403c' };
  }
  return { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-900 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', icon: 'text-amber-500', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-800/50 dark:text-amber-200', header: 'bg-gradient-to-r from-amber-600 to-yellow-600', colorBase: '#f59e0b' };
};

// --- DATOS PRECARGADOS ---
const initialRecipes = [
  {
    id: 'hazy-tamango-pro', category: 'Hazy IPA', name: "Jugosa Hazy IPA (Estilo Tamango)", targetVolume: 20, og: 1.065, fg: 1.015, abv: 6.5, ibu: 42, colorSRM: 5,
    waterProfile: { Ca: 120, Mg: 15, SO4: 75, Cl: 200, HCO3: 50 },
    ingredients: {
      malts: [ { name: "Malta Pilsen", amount: 4.5, unit: "kg" }, { name: "Avena en hojuelas", amount: 1.0, unit: "kg" }, { name: "Trigo en hojuelas", amount: 0.8, unit: "kg" } ],
      hops: [ { name: "Magnum", amount: 10, unit: "g", time: "60 min", stage: "Hervor" }, { name: "Citra", amount: 50, unit: "g", time: "20 min", stage: "Whirlpool a 80°C" }, { name: "Mosaic", amount: 50, unit: "g", time: "20 min", stage: "Whirlpool a 80°C" }, { name: "Citra", amount: 60, unit: "g", time: "Día 2", stage: "Dry Hop 1" }, { name: "Mosaic", amount: 60, unit: "g", time: "Día 7", stage: "Dry Hop 2" } ],
      yeast: { name: "Lallemand Verdant IPA", amount: 1, unit: "sobre" }, water: { strike: 22, sparge: 12 }
    },
    steps: [ 
      { id: 1, title: "Maceración y Ajuste de Agua", desc: "Macerar a 67°C por 60 min. Buscar sedosidad extrema.", details: "1. Calienta el agua en la Guten a 71°C.\n2. Agrega tus sales para llegar al perfil.\n3. Incorpora los granos lentamente removiendo para evitar grumos, la avena tiende a apelmazarse.\n4. Mide el pH a los 10 min: el objetivo es 5.2 - 5.3.", duration: 60 }, 
      { id: 2, title: "Lavado (Sparge)", desc: "Lavar suavemente con 12L a 75°C.", details: "Realiza un lavado lento. Es CRÍTICO no superar los 76°C ni que el pH suba de 5.8 al final del lavado, o extraerás taninos de las cáscaras.", duration: 15 }, 
      { id: 3, title: "Hervor Controlado", desc: "Hervir 60 min. Adición de amargor limpio.", details: "Lleva el mosto a ebullición vigorosa. Al romper hervor, agrega los 10g de Magnum para dar la columna vertebral de amargor limpio.", duration: 60 }, 
      { id: 4, title: "Whirlpool / Hop Stand Crítico", desc: "Enfriar a 80°C e incorporar lúpulos de aroma.", details: "¡Fase clave! Enfría a 80°C exactos. Agrega Citra y Mosaic, y mantén un remolino suave por 20 minutos. Así no sumarás IBUs pero extraerás todos los aceites tropicales.", duration: 20 },
      { id: 5, title: "Fermentación y Biotransformación", desc: "Inocular a 18°C. Dry Hop activo.", details: "1. Enfría a 18°C y traspasa al fermentador oxigenando muy bien el mosto.\n2. Inocula la Verdant IPA.\n3. DÍA 2-3 (Alta actividad): Agrega el primer Dry Hop para biotransformación.\n4. Deja subir la temperatura a 20°C para descanso de diacetilo.\n5. DÍA 7: Agrega el segundo Dry Hop." },
      { id: 6, title: "Maduración y Envasado", desc: "Cold Crash extremo y purga de O2.", details: "1. Baja la temperatura a 2°C (Cold Crash) por 48hrs.\n2. Envasa purgando todo con CO2." }
    ],
    tips: [ 
      { title: "Miedo al Oxígeno", desc: "Las Hazy IPAs mueren en días si se exponen al oxígeno. Evita abrir la tapa del fermentador para mirar. Usa un sistema de purga de CO2." },
      { title: "El Secreto del Agua", desc: "Para que sea verdaderamente 'Jugosa' y sedosa, necesitas más Cloruros que Sulfatos. Apunta a un ratio de 2.5:1 o 3:1 de Cloruro sobre Sulfato." },
      { title: "Biotransformación", desc: "Añadir lúpulo durante la fermentación activa (Día 2-3) permite que la levadura Verdant IPA convierta el geraniol del lúpulo en citronelol, potenciando sabores cítricos." }
    ], modifications: []
  },
  {
    id: 'doble-hazy-ipa-pro', category: 'Hazy IPA', name: "Nebulosa DDH - Doble Hazy", targetVolume: 20, og: 1.080, fg: 1.018, abv: 8.2, ibu: 55, colorSRM: 6,
    waterProfile: { Ca: 130, Mg: 15, SO4: 80, Cl: 220, HCO3: 50 },
    ingredients: { 
      malts: [{ name: "Malta Pilsen", amount: 6.0, unit: 'kg' }, { name: "Trigo en hojuelas", amount: 1.5, unit: 'kg' }, { name: "Avena en hojuelas", amount: 1.0, unit: 'kg' }], 
      hops: [{ name: "Magnum", amount: 15, unit: 'g', time: "60 min", stage: "Hervor" }, { name: "Galaxy", amount: 80, unit: 'g', time: "30 min", stage: "Whirlpool a 78°C" }, { name: "Citra", amount: 40, unit: 'g', time: "30 min", stage: "Whirlpool a 78°C" }, { name: "Galaxy", amount: 100, unit: 'g', time: "Día 4", stage: "Dry Hop" }], 
      yeast: {name: 'Verdant', amount: 2, unit: 'sobres'}, water: {strike: 25, sparge: 12} 
    },
    steps: [
      { id: 1, title: "Maceración Densa", desc: "66°C por 60 min. Cuidado con atascos.", details: "Al tener una carga de granos tan alta (8.5kg para 20L), la recirculación debe ser muy lenta al inicio para no compactar la cama de granos en tu equipo.", duration: 60 },
      { id: 2, title: "Lavado Controlado", desc: "Lavar con 12L a 75°C.", details: "No te apresures. Lava lentamente para extraer todos los azúcares posibles de esa gran cama de granos.", duration: 20 },
      { id: 3, title: "Hervor", desc: "Hervir 60 min.", details: "Añade el Magnum al inicio. Vigila posibles derrames (boil-overs) por la alta densidad del mosto.", duration: 60 },
      { id: 4, title: "Whirlpool Masivo", desc: "Bajar a 78°C e incorporar Galaxy y Citra.", details: "El Galaxy aporta notas a maracuyá intensas. Mantenlo a 78°C durante 30 minutos enteros para saturar el mosto de aceites esenciales.", duration: 30 },
      { id: 5, title: "Fermentación Doble", desc: "Inocular a 18°C con DOS sobres.", details: "Oxigena el doble de lo normal. La alta densidad estresará a la levadura si no tiene el oxígeno y la cantidad de células suficientes." }
    ], 
    tips: [
      { title: "Tasa de Inoculación (Pitch Rate)", desc: "Es una cerveza de alta densidad (1.080). Un solo sobre de levadura sufrirá estrés y generará alcoholes fusel (sabor a solvente o quemado). Asegúrate de usar 2 sobres bien hidratados." },
      { title: "Hop Burn", desc: "Cantidades masivas de lúpulo pueden dejar partículas en suspensión que causan 'Hop Burn' (picor en la garganta). Un buen Cold Crash de 3-4 días a 1°C es obligatorio." }
    ], modifications: []
  },
  {
    id: 'triple-hazy-ipa-pro', category: 'Hazy IPA', name: "Agujero Negro - Triple Hazy", targetVolume: 20, og: 1.100, fg: 1.022, abv: 10.5, ibu: 65, colorSRM: 7,
    waterProfile: { Ca: 140, Mg: 15, SO4: 100, Cl: 250, HCO3: 50 },
    ingredients: { 
      malts: [{ name: "Malta Pale Ale", amount: 8.0, unit: 'kg' }, { name: "Avena en hojuelas", amount: 1.5, unit: 'kg' }, { name: "Trigo en hojuelas", amount: 1.0, unit: 'kg' }, { name: "Maltodextrina", amount: 0.5, unit: 'kg' }], 
      hops: [{ name: "Columbus", amount: 20, unit: 'g', time: "60 min", stage: "Hervor" }, { name: "Citra", amount: 100, unit: 'g', time: "30 min", stage: "Whirlpool" }, { name: "Mosaic", amount: 100, unit: 'g', time: "30 min", stage: "Whirlpool" }, { name: "Galaxy", amount: 150, unit: 'g', time: "Día 5", stage: "Dry Hop 1" }, { name: "Citra", amount: 100, unit: 'g', time: "Día 10", stage: "Dry Hop 2" }], 
      yeast: {name: 'Verdant', amount: 3, unit: 'sobres'}, water: {strike: 28, sparge: 10} 
    },
    steps: [
      { id: 1, title: "Maceración al Límite", desc: "65°C por 90 min para alta fermentabilidad.", details: "Necesitas extraer cada gota de azúcar. Macera 90 minutos para asegurar la conversión enzimática total. El equipo estará al límite de su capacidad.", duration: 90 },
      { id: 2, title: "Lavado Corto", desc: "Lavar con solo 10L a 76°C", details: "Al buscar una densidad tan extrema (1.100), no podemos diluir mucho el mosto. El lavado será mínimo.", duration: 15 },
      { id: 3, title: "Hervor y Azúcares", desc: "Hervir 90 min. Añadir Maltodextrina.", details: "Hierve por 90 minutos para concentrar aún más el mosto. Agrega la Maltodextrina faltando 15 minutos para darle un cuerpo ultra denso y pegajoso.", duration: 90 },
      { id: 4, title: "Fermentación Extrema", desc: "Inocular 3 sobres a 18°C.", details: "Controla estrictamente la temperatura. La levadura generará muchísimo calor propio. Si sube de 20°C los primeros días, tendrás sabores a alcohol muy ásperos." }
    ], tips: [ 
      { title: "Cuidado con la Fermentación", desc: "A 10.5% ABV, la levadura genera mucho calor. Controla estrictamente la temperatura a 18°C los primeros 4 días o sabrá a alcohol puro." },
      { title: "Nutrientes", desc: "Para este nivel de alcohol, añadir nutrientes de levadura en los últimos 10 min de hervor es la diferencia entre una fermentación limpia y una estancada." }
    ], modifications: []
  },
  {
    id: 'oatmeal-stout-pro', category: 'Stout', name: "Expreso de Medianoche", targetVolume: 20, og: 1.058, fg: 1.016, abv: 5.5, ibu: 32, colorSRM: 38,
    waterProfile: { Ca: 50, Mg: 10, SO4: 50, Cl: 50, HCO3: 150 },
    ingredients: { 
      malts: [{ name: "Malta Pale Ale", amount: 4.0, unit: 'kg' }, { name: "Avena", amount: 0.8, unit: 'kg' }, { name: "Cebada Tostada", amount: 0.3, unit: 'kg' }, { name: "Malta Chocolate", amount: 0.2, unit: 'kg' }], 
      hops: [{ name: "Fuggles", amount: 40, unit: 'g', time: "60 min", stage: "Hervor" }], 
      yeast: {name: 'S-04', amount: 1, unit: 'sobre'}, water: {strike: 18, sparge: 14} 
    },
    steps: [
      { id: 1, title: "Maceración Base", desc: "68°C por 50 min. Solo maltas claras y avena.", details: "TRUCO PRO: Macera a 68°C para dejar azúcares residuales y dar cuerpo dulce. NO agregues las maltas oscuras (Chocolate y Cebada Tostada) todavía. Si las pones desde el principio, el pH caerá mucho y extraerás astringencia.", duration: 50 },
      { id: 2, title: "Adición de Maltas Oscuras", desc: "Minuto 50: Añadir maltas oscuras.", details: "Espolvorea la malta Chocolate y la Cebada Tostada por encima de la cama de granos y remueve solo la capa superior. Déjalo reposar 10 minutos más antes de hacer el Mash Out. Esto extrae el color y aroma a café, pero deja la acidez y astringencia atrás.", duration: 10 },
      { id: 3, title: "Hervor Clásico", desc: "Hervir 60 minutos con Fuggles.", details: "Añade todo el lúpulo al inicio. En una Stout, el aroma a lúpulo no debe competir con el tostado de las maltas.", duration: 60 },
      { id: 4, title: "Fermentación Inglesa", desc: "Fermentar a 19°C.", details: "La levadura S-04 aportará un ligero perfil afrutado inglés que combina perfecto con el chocolate." }
    ], tips: [ 
      { title: "Control de pH con Maltas Oscuras", desc: "Las maltas muy tostadas son ácidas y pueden bajar el pH de tu macerado a niveles subóptimos (< 5.0). Añadirlas al final del macerado o hacer un 'Cold Steeping' (infusión en frío de 24hs) y agregarlo al hervor es un truco maestro." },
      { title: "Carbonatación", desc: "Apunta a una carbonatación baja (1.8 a 2.0 volúmenes de CO2). Mucho gas destruye la sensación cremosa que aporta la avena." } 
    ], modifications: []
  },
  { 
    id: 'lager-premium-pro', category: 'Lager', name: "Pilsner del Sur", targetVolume: 20, og: 1.048, fg: 1.010, abv: 5.0, ibu: 28, colorSRM: 4,
    waterProfile: { Ca: 50, Mg: 5, SO4: 50, Cl: 50, HCO3: 20 },
    ingredients: { 
      malts: [{name: 'Malta Pilsen', amount: 4.5, unit: 'kg'}, {name: 'Carapils', amount: 0.2, unit: 'kg'}], 
      hops: [{name: 'Magnum', amount: 15, unit: 'g', time: '60 min', stage: 'Hervor'}, {name: 'Saaz', amount: 30, unit: 'g', time: '15 min', stage: 'Hervor'}], 
      yeast: {name: 'W-34/70', amount: 2, unit: 'sobres'}, water: {strike: 18, sparge: 14} 
    }, 
    steps: [
      { id: 1, title: "Maceración Escalonada", desc: "Escalón proteico y sacarificación.", details: "Comienza a 52°C por 15 min (mejora retención de espuma). Luego sube a 64°C por 45 min para un mosto altamente fermentable y seco.", duration: 60 },
      { id: 2, title: "Hervor Largo", desc: "Hervir 90 min.", details: "La malta Pilsen contiene precursores de DMS (olor a maíz cocido). Hiérvela destapada por 90 minutos para evaporarlos. Agrega Magnum a los 60 min y Saaz a los 15 min del final.", duration: 90 },
      { id: 3, title: "Fermentación Fría y Diacetilo", desc: "Inocular a 10°C.", details: "1. Oxigena al máximo y fermenta a 10-12°C.\n2. Cuando falten 4 puntos de densidad para terminar, SUbE a 16°C por 3 días (Descanso de Diacetilo).\n3. Lagering: Guarda en frío a 1°C por 4 semanas mínimo." }
    ], 
    tips: [
      { title: "Descanso de Diacetilo", desc: "Las levaduras Lager producen diacetilo (sabor a mantequilla). Es obligatorio subir la temperatura a 16-18°C cuando falten unos 4 puntos de gravedad para terminar, así la levadura reabsorbe esta mantequilla." },
      { title: "Inoculación en Frío", desc: "Es un error inocular levadura Lager a 20°C y luego enfriar. Debes enfriar tu mosto a 10°C, y recién ahí inocular DOBLE cantidad de levadura. Esto asegura un perfil extra limpio." }
    ], modifications: [] 
  },
  { 
    id: 'amber-ale-pro', category: 'Amber Ale', name: "Red Marzen Americana", targetVolume: 20, og: 1.055, fg: 1.012, abv: 5.6, ibu: 32, colorSRM: 14,
    waterProfile: { Ca: 80, Mg: 10, SO4: 100, Cl: 80, HCO3: 80 },
    ingredients: { 
      malts: [{name: 'Malta Pale Ale', amount: 4.0, unit: 'kg'}, {name: 'Caramelo 60L', amount: 0.5, unit: 'kg'}, {name: 'Melanoidina', amount: 0.3, unit: 'kg'}, {name: 'Cebada Tostada', amount: 0.05, unit: 'kg'}], 
      hops: [{name: 'Cascade', amount: 20, unit: 'g', time: '60 min', stage: 'Hervor'}, {name: 'Cascade', amount: 30, unit: 'g', time: '15 min', stage: 'Hervor'}], 
      yeast: {name: 'US-05', amount: 1, unit: 'sobre'}, water: {strike: 18, sparge: 14} 
    }, 
    steps: [
      { id: 1, title: "Maceración Balanceada", desc: "66°C por 60 min", details: "Macerar a esta temperatura nos dará un balance perfecto entre azúcares fermentables y cuerpo residual, ideal para el dulzor del caramelo.", duration: 60 },
      { id: 2, title: "Hervor y Sabor", desc: "60 min. Adiciones de Cascade.", details: "Añade 20g de Cascade al inicio. A los 45 minutos (faltando 15 min), agrega los otros 30g para fijar el clásico sabor a pomelo/pino americano.", duration: 60 },
      { id: 3, title: "Fermentación Limpia", desc: "18°C con US-05.", details: "Mantenlo a 18°C para que la levadura no genere ésteres y deje brillar el perfil a malta tostada y caramelo." }
    ], 
    tips: [
      { title: "Ajuste de Color", desc: "Esos 50 gramos de Cebada Tostada no son para sabor, sino para darle ese tono rojo/rubí profundo característico del estilo sin aportar notas a café." }
    ], modifications: [] 
  }
];

const initialInventory = [
  // MALTAS
  { id: 'inv-m1', category: 'Malta', name: 'Malta Pilsen', stock: 25, unit: 'kg', price: 1600 },
  { id: 'inv-m2', category: 'Malta', name: 'Malta Pale Ale', stock: 25, unit: 'kg', price: 1800 },
  { id: 'inv-m3', category: 'Malta', name: 'Avena en hojuelas', stock: 5, unit: 'kg', price: 1500 },
  { id: 'inv-m4', category: 'Malta', name: 'Trigo en hojuelas', stock: 5, unit: 'kg', price: 1500 },
  { id: 'inv-m5', category: 'Malta', name: 'Malta Chocolate', stock: 2, unit: 'kg', price: 2500 },
  { id: 'inv-m6', category: 'Malta', name: 'Cebada Tostada', stock: 2, unit: 'kg', price: 2800 },
  { id: 'inv-m7', category: 'Malta', name: 'Carapils', stock: 2, unit: 'kg', price: 2200 },
  { id: 'inv-m8', category: 'Malta', name: 'Caramelo 60L', stock: 3, unit: 'kg', price: 2200 },
  { id: 'inv-m9', category: 'Malta', name: 'Melanoidina', stock: 1, unit: 'kg', price: 3000 },
  { id: 'inv-m10', category: 'Malta', name: 'Maltodextrina', stock: 1, unit: 'kg', price: 4000 },
  
  // LÚPULOS
  { id: 'inv-h1', category: 'Lúpulo', name: 'Citra', stock: 500, unit: 'g', price: 80 },
  { id: 'inv-h2', category: 'Lúpulo', name: 'Mosaic', stock: 500, unit: 'g', price: 85 },
  { id: 'inv-h3', category: 'Lúpulo', name: 'Magnum', stock: 250, unit: 'g', price: 40 },
  { id: 'inv-h4', category: 'Lúpulo', name: 'Galaxy', stock: 250, unit: 'g', price: 90 },
  { id: 'inv-h5', category: 'Lúpulo', name: 'Fuggles', stock: 250, unit: 'g', price: 60 },
  { id: 'inv-h6', category: 'Lúpulo', name: 'Saaz', stock: 250, unit: 'g', price: 70 },
  { id: 'inv-h7', category: 'Lúpulo', name: 'Cascade', stock: 500, unit: 'g', price: 50 },
  { id: 'inv-h8', category: 'Lúpulo', name: 'Columbus', stock: 250, unit: 'g', price: 50 },

  // LEVADURAS
  { id: 'inv-y1', category: 'Levadura', name: 'Lallemand Verdant IPA', stock: 4, unit: 'sobre', price: 6500 },
  { id: 'inv-y2', category: 'Levadura', name: 'Verdant', stock: 4, unit: 'sobre', price: 6500 },
  { id: 'inv-y3', category: 'Levadura', name: 'SafAle S-04', stock: 4, unit: 'sobre', price: 4500 },
  { id: 'inv-y4', category: 'Levadura', name: 'W-34/70', stock: 4, unit: 'sobre', price: 5500 },
  { id: 'inv-y5', category: 'Levadura', name: 'US-05', stock: 4, unit: 'sobre', price: 4500 }
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

  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const filtered = safeInventory.filter(i => i.category === category && (i.name || '').toLowerCase().includes((value || '').toLowerCase()) && (value || '').trim() !== '');
  const exactMatch = safeInventory.some(i => i.category === category && (i.name || '').toLowerCase() === (value || '').toLowerCase().trim());

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
              <span className="text-gray-400 text-xs">{item.stock} {item.unit}</span>
            </div>
          ))}
          {!exactMatch && (
            <div 
              className="p-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer text-sm text-blue-700 dark:text-blue-300 font-bold flex items-center gap-2 border-t border-blue-100 dark:border-slate-700"
              onClick={() => { onAddNewItem(value, category); setShowDrop(false); }}
            >
              <Plus size={16}/> Añadir "{value}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- COMPONENTE DE FORMULARIO PARA RECETAS (Añadir / Editar) CON IA ---
function RecipeForm({ initialData, onSave, onCancel, inventory, onAddInventoryItem }) {
  const isEditing = !!initialData;
  const [isGeneratingIA, setIsGeneratingIA] = useState(false);
  const [iaPrompt, setIaPrompt] = useState("");
  
  const [formData, setFormData] = useState(() => {
    if (initialData) {
      const safeMalts = Array.isArray(initialData.ingredients?.malts) ? [...initialData.ingredients.malts] : [{ name: '', amount: 0 }];
      const safeHops = Array.isArray(initialData.ingredients?.hops) ? [...initialData.ingredients.hops] : [{ name: '', amount: 0, time: '', stage: 'Hervor' }];
      
      let safeYeast = '';
      if (initialData.ingredients?.yeast) {
        if (typeof initialData.ingredients.yeast === 'string') safeYeast = initialData.ingredients.yeast;
        else safeYeast = initialData.ingredients.yeast.name || '';
      }

      return {
        id: initialData.id,
        name: initialData.name || '',
        category: initialData.category || 'Hazy IPA',
        targetVolume: initialData.targetVolume || 20,
        og: initialData.og || 1.050,
        fg: initialData.fg || 1.010,
        abv: initialData.abv || 5.0,
        ibu: initialData.ibu || 0,
        colorSRM: initialData.colorSRM || 0,
        malts: safeMalts,
        hops: safeHops,
        yeast: safeYeast,
        strike: initialData.ingredients?.water?.strike || 15,
        sparge: initialData.ingredients?.water?.sparge || 15,
        waterProfile: initialData.waterProfile || { Ca: 100, Mg: 10, SO4: 100, Cl: 100, HCO3: 50 },
        modifications: initialData.modifications || [],
        steps: Array.isArray(initialData.steps) ? [...initialData.steps] : [],
        tips: Array.isArray(initialData.tips) ? [...initialData.tips] : []
      };
    }
    return {
      name: '', category: 'Hazy IPA', targetVolume: 20, og: 1.050, fg: 1.010, abv: 5.0, ibu: 30, colorSRM: 5,
      malts: [{ name: '', amount: 0 }],
      hops: [{ name: '', amount: 0, time: '', stage: 'Hervor' }],
      yeast: '', strike: 15, sparge: 15,
      waterProfile: { Ca: 100, Mg: 10, SO4: 100, Cl: 100, HCO3: 50 },
      modifications: [], steps: [], tips: []
    };
  });
  
  const [modNote, setModNote] = useState('');

  const handleAIGenerate = async () => {
    if (!iaPrompt.trim()) return alert("Por favor, describe la cerveza que deseas generar.");
    setIsGeneratingIA(true);
    try {
      const systemInstruction = "Eres un Maestro Cervecero experto. Genera una receta de cerveza altamente detallada. Responde ÚNICAMENTE con un JSON válido.";
      const prompt = `Genera una receta profesional de cerveza basada en esta idea: "${iaPrompt}". 
      Estructura JSON esperada OBLIGATORIA:
      {
        "name": "Nombre creativo de la receta",
        "category": "Estilo oficial (ej. Stout, IPA)",
        "targetVolume": 20,
        "og": 1.050, "fg": 1.010, "abv": 5.0, "ibu": 30, "colorSRM": 5,
        "waterProfile": { "Ca": 100, "Mg": 10, "SO4": 100, "Cl": 100, "HCO3": 50 },
        "malts": [{ "name": "Nombre Malta", "amount": 5 }],
        "hops": [{ "name": "Nombre Lúpulo", "amount": 50, "time": "60 min", "stage": "Hervor" }],
        "yeast": "Nombre de Levadura recomendada",
        "strike": 15, "sparge": 15,
        "steps": [{ "title": "Maceración", "desc": "Descripción corta", "details": "Detalles técnicos", "duration": 60 }],
        "tips": [{ "title": "Tip Importante", "desc": "Explicación técnica" }]
      }`;
      
      const responseJSON = await callGemini(prompt, systemInstruction, true);
      
      setFormData(prev => ({
        ...prev,
        ...responseJSON,
        malts: responseJSON.malts || [{ name: '', amount: 0 }],
        hops: responseJSON.hops || [{ name: '', amount: 0, time: '', stage: 'Hervor' }],
        steps: (responseJSON.steps || []).map((s, i) => ({ ...s, id: Date.now() + i })),
        tips: responseJSON.tips || []
      }));
      
    } catch (err) {
      console.error(err);
      alert("Hubo un error conectando con la IA. Inténtalo de nuevo más tarde.");
    } finally {
      setIsGeneratingIA(false);
    }
  };

  const handleSave = () => {
    if(!formData.name) return alert("Ponle un nombre a tu receta");
    
    const newModifications = [...(formData.modifications || [])];
    if (isEditing && modNote.trim()) {
       newModifications.push({ date: new Date().toLocaleDateString(), note: modNote });
    } else if (isEditing) {
       newModifications.push({ date: new Date().toLocaleDateString(), note: "Edición general." });
    }

    const recipeToSave = {
      id: isEditing ? formData.id : 'recipe-' + Date.now(),
      category: formData.category,
      name: formData.name,
      targetVolume: Number(formData.targetVolume),
      og: formData.og, fg: formData.fg, abv: formData.abv, 
      ibu: Number(formData.ibu), colorSRM: Number(formData.colorSRM),
      waterProfile: {
        Ca: Number(formData.waterProfile?.Ca || 0), Mg: Number(formData.waterProfile?.Mg || 0),
        SO4: Number(formData.waterProfile?.SO4 || 0), Cl: Number(formData.waterProfile?.Cl || 0),
        HCO3: Number(formData.waterProfile?.HCO3 || 0)
      },
      ingredients: {
        malts: formData.malts.filter(m => m.name !== '').map(m => ({...m, unit: 'kg', amount: Number(m.amount)})),
        hops: formData.hops.filter(h => h.name !== '').map(h => ({...h, unit: 'g', amount: Number(h.amount)})),
        yeast: { name: formData.yeast || "Levadura Genérica", amount: 1, unit: "sobre" },
        water: { strike: Number(formData.strike), sparge: Number(formData.sparge) }
      },
      steps: formData.steps.filter(s => s.title !== ''),
      tips: formData.tips.filter(t => t.title !== ''),
      modifications: newModifications
    };
    onSave(recipeToSave);
  };

  const updateArray = (arrayName, idx, field, value) => {
    const newArr = [...formData[arrayName]]; newArr[idx][field] = value;
    setFormData({...formData, [arrayName]: newArr});
  };
  const removeArrayItem = (arrayName, idx) => {
    const newArr = formData[arrayName].filter((_, i) => i !== idx);
    setFormData({...formData, [arrayName]: newArr});
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 animate-fadeIn">
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-4 mb-6">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">{isEditing ? 'Editar Receta' : 'Crear Nueva Receta'}</h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-red-500 font-bold transition-colors">Cancelar</button>
      </div>

      {/* --- ASISTENTE IA --- */}
      {!isEditing && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 p-6 rounded-2xl border border-amber-200 dark:border-amber-800/30 mb-8 shadow-sm">
          <label className="block text-sm font-black text-amber-800 dark:text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Sparkles size={20} /> ✨ Generador Cervecero IA
          </label>
          <div className="flex flex-col md:flex-row gap-3">
            <input type="text" placeholder="Ej: Una IPA muy lupulada con notas a mango y 7% ABV" className="flex-1 p-4 border border-amber-200 dark:border-amber-800/50 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={iaPrompt} onChange={e => setIaPrompt(e.target.value)} disabled={isGeneratingIA} />
            <button onClick={handleAIGenerate} disabled={isGeneratingIA} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50">
               {isGeneratingIA ? <Loader2 className="animate-spin" size={20}/> : <Wand2 size={20}/>} {isGeneratingIA ? 'Magia en proceso...' : 'Generar Receta'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label><input type="text" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-amber-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estilo</label><input type="text" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-amber-500" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} /></div>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          <div><label className="block text-[10px] font-bold text-slate-500 uppercase">Vol (L)</label><input type="number" className="w-full p-3 border dark:border-slate-700 rounded-xl dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.targetVolume} onChange={e => setFormData({...formData, targetVolume: e.target.value})} /></div>
          <div><label className="block text-[10px] font-bold text-slate-500 uppercase">ABV (%)</label><input type="number" step="0.1" className="w-full p-3 border dark:border-slate-700 rounded-xl dark:bg-slate-800 focus:ring-2 focus:ring-red-500 outline-none" value={formData.abv} onChange={e => setFormData({...formData, abv: e.target.value})} /></div>
          <div><label className="block text-[10px] font-bold text-slate-500 uppercase">D. Orig.</label><input type="number" step="0.001" className="w-full p-3 border dark:border-slate-700 rounded-xl dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none" value={formData.og} onChange={e => setFormData({...formData, og: e.target.value})} /></div>
          <div><label className="block text-[10px] font-bold text-slate-500 uppercase">D. Final</label><input type="number" step="0.001" className="w-full p-3 border dark:border-slate-700 rounded-xl dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none" value={formData.fg} onChange={e => setFormData({...formData, fg: e.target.value})} /></div>
          <div><label className="block text-[10px] font-bold text-orange-500 uppercase">IBU</label><input type="number" className="w-full p-3 border dark:border-slate-700 rounded-xl dark:bg-slate-800 focus:ring-2 focus:ring-orange-500 outline-none" value={formData.ibu} onChange={e => setFormData({...formData, ibu: e.target.value})} /></div>
          <div><label className="block text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase">Color (SRM)</label><input type="number" className="w-full p-3 border dark:border-slate-700 rounded-xl dark:bg-slate-800 focus:ring-2 focus:ring-amber-600 outline-none" value={formData.colorSRM} onChange={e => setFormData({...formData, colorSRM: e.target.value})} /></div>
        </div>

        <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
           <h3 className="font-black text-lg mb-3 text-slate-800 dark:text-white flex items-center gap-2"><Wheat size={20} className="text-amber-500"/> Granos (kg)</h3>
           {formData.malts.map((m, i) => (
              <div key={i} className="flex gap-2 mb-2 relative">
                <AutocompleteInput value={m.name} onChange={val => updateArray('malts', i, 'name', val)} placeholder="Buscar malta..." category="Malta" inventory={inventory} onAddNewItem={onAddInventoryItem} />
                <input type="number" step="0.1" placeholder="Kg" className="w-24 p-3 border border-gray-300 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={m.amount} onChange={e => updateArray('malts', i, 'amount', e.target.value)} />
              </div>
           ))}
           <button onClick={() => setFormData({...formData, malts: [...formData.malts, {name:'', amount:0}]})} className="text-sm text-amber-600 font-bold hover:text-amber-800 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 rounded-lg mt-1">+ Añadir fila</button>
        </div>

        <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
           <h3 className="font-black text-lg mb-3 text-slate-800 dark:text-white flex items-center gap-2"><Leaf size={20} className="text-green-500"/> Lúpulos (g)</h3>
           {formData.hops.map((h, i) => (
              <div key={i} className="flex gap-2 mb-2 relative">
                <AutocompleteInput value={h.name} onChange={val => updateArray('hops', i, 'name', val)} placeholder="Buscar lúpulo..." category="Lúpulo" inventory={inventory} onAddNewItem={onAddInventoryItem} />
                <input type="number" placeholder="Gramos" className="w-20 p-3 border border-gray-300 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={h.amount} onChange={e => updateArray('hops', i, 'amount', e.target.value)} />
                <input type="text" placeholder="Tiempo/Etapa" className="w-32 p-3 border border-gray-300 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={h.time} onChange={e => updateArray('hops', i, 'time', e.target.value)} />
                <input type="text" placeholder="Etapa" className="w-32 p-3 border border-gray-300 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hidden md:block" value={h.stage} onChange={e => updateArray('hops', i, 'stage', e.target.value)} />
              </div>
           ))}
           <button onClick={() => setFormData({...formData, hops: [...formData.hops, {name:'', amount:0, time:'', stage:'Hervor'}]})} className="text-sm text-green-600 font-bold hover:text-green-800 bg-green-50 dark:bg-green-900/30 px-3 py-2 rounded-lg mt-1">+ Añadir fila</button>
        </div>

        <div className="border-t border-gray-200 dark:border-slate-700 pt-4 grid md:grid-cols-3 gap-4">
          <div className="col-span-1 relative">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Levadura</label>
            <AutocompleteInput value={formData.yeast} onChange={val => setFormData({...formData, yeast: val})} placeholder="Buscar..." category="Levadura" inventory={inventory} onAddNewItem={onAddInventoryItem} />
          </div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Maceración (L)</label><input type="number" className="w-full p-3 border dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800" value={formData.strike} onChange={e => setFormData({...formData, strike: e.target.value})} /></div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lavado (L)</label><input type="number" className="w-full p-3 border dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800" value={formData.sparge} onChange={e => setFormData({...formData, sparge: e.target.value})} /></div>
        </div>

        <div className="border-t border-gray-200 dark:border-slate-700 pt-4 bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-2xl mt-4 border border-blue-100 dark:border-blue-800/30">
          <h3 className="font-black text-lg mb-3 text-blue-900 dark:text-blue-400 flex items-center gap-2"><Droplets size={20}/> Perfil Agua Objetivo (ppm)</h3>
          <div className="grid grid-cols-5 gap-2 md:gap-4">
            {['Ca', 'Mg', 'SO4', 'Cl', 'HCO3'].map((ion) => (
              <div key={ion}>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 text-center">{ion}</label>
                <input type="number" className="w-full p-3 border dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-center dark:bg-slate-800" value={formData.waterProfile?.[ion] || 0} onChange={e => setFormData({ ...formData, waterProfile: { ...formData.waterProfile, [ion]: e.target.value } })} />
              </div>
            ))}
          </div>
        </div>

        {/* NUEVO: CREADOR DE PROCESO (PASOS) */}
        <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
           <h3 className="font-black text-lg mb-4 text-slate-800 dark:text-white flex items-center gap-2"><ListOrdered size={20} className="text-purple-500"/> Pasos de Producción</h3>
           {formData.steps.map((step, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 mb-4 relative">
                <button type="button" onClick={() => removeArrayItem('steps', i)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                <div className="grid md:grid-cols-3 gap-3 mb-3">
                  <div className="md:col-span-2"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Título</label><input type="text" className="w-full p-3 border dark:border-slate-600 rounded-xl outline-none dark:bg-slate-900" value={step.title} onChange={e => updateArray('steps', i, 'title', e.target.value)} /></div>
                  <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Minutos</label><input type="number" className="w-full p-3 border dark:border-slate-600 rounded-xl outline-none dark:bg-slate-900" value={step.duration || ''} onChange={e => updateArray('steps', i, 'duration', e.target.value)} /></div>
                </div>
                <div className="mb-3"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descripción Breve</label><input type="text" className="w-full p-3 border dark:border-slate-600 rounded-xl outline-none dark:bg-slate-900" value={step.desc} onChange={e => updateArray('steps', i, 'desc', e.target.value)} /></div>
                <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Detalle Técnico</label><textarea rows="2" className="w-full p-3 border dark:border-slate-600 rounded-xl outline-none dark:bg-slate-900 resize-none" value={step.details || ''} onChange={e => updateArray('steps', i, 'details', e.target.value)} /></div>
              </div>
           ))}
           <button onClick={() => setFormData({...formData, steps: [...formData.steps, {id: Date.now(), title:'', desc:'', details:'', duration: 0}]})} className="text-sm text-purple-600 font-bold hover:text-purple-800 bg-purple-50 dark:bg-purple-900/30 px-4 py-2 rounded-xl mt-1 flex items-center gap-2"><Plus size={16}/> Añadir Fase</button>
        </div>

        <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
           <h3 className="font-black text-lg mb-4 text-slate-800 dark:text-white flex items-center gap-2"><Info size={20} className="text-yellow-500"/> Tips de Elaboración</h3>
           {formData.tips.map((tip, i) => (
              <div key={i} className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-2xl border border-yellow-200 dark:border-yellow-900/30 mb-3 relative flex flex-col gap-3">
                <button type="button" onClick={() => removeArrayItem('tips', i)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                <input type="text" placeholder="Concepto (Ej: Control pH)" className="w-[90%] p-3 border dark:border-slate-600 rounded-xl text-sm outline-none dark:bg-slate-900" value={tip.title} onChange={e => updateArray('tips', i, 'title', e.target.value)} />
                <textarea rows="2" placeholder="Explicación..." className="w-full p-3 border dark:border-slate-600 rounded-xl text-sm outline-none dark:bg-slate-900 resize-none" value={tip.desc} onChange={e => updateArray('tips', i, 'desc', e.target.value)} />
              </div>
           ))}
           <button onClick={() => setFormData({...formData, tips: [...formData.tips, {title:'', desc:''}]})} className="text-sm text-yellow-600 font-bold bg-yellow-50 dark:bg-yellow-900/30 px-4 py-2 rounded-xl mt-1 flex items-center gap-2"><Plus size={16}/> Añadir Tip</button>
        </div>

        {isEditing && (
          <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
             <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nota de Modificación (Opcional)</label>
             <input type="text" placeholder="Ej: Cambié el lúpulo Citra por Mosaic para probar." className="w-full p-4 border border-gray-300 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={modNote} onChange={e => setModNote(e.target.value)} />
          </div>
        )}

        <button onClick={handleSave} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white p-5 rounded-2xl font-black text-xl flex justify-center items-center gap-3 mt-8 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
          <Save size={28} /> {isEditing ? 'Guardar Obra Maestra' : 'Registrar Nueva Receta'}
        </button>
      </div>
    </div>
  );
}

// --- APLICACIÓN PRINCIPAL ---
function MainApp() {
  const [user, setUser] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const [recipes, setRecipes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);

  const [view, setView] = useState('dashboard'); 
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

  // Filtros Dashboard
  const [dashTimeFilter, setDashTimeFilter] = useState('all');
  const [dashStyleFilter, setDashStyleFilter] = useState('Todos');

  // Autenticación
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  
  // Estado IA
  const [aiAdvice, setAiAdvice] = useState(null);
  const [isAdvising, setIsAdvising] = useState(false);

  // --- EFECTO MODO OSCURO ---
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // --- FIREBASE: Autenticación ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) setUser(currentUser);
      else {
        try {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
          else await signInAnonymously(auth);
        } catch (error) { console.error("Error auth anónima:", error); }
      }
    });
    return () => unsubscribe();
  }, []);

  // --- FIREBASE: Carga de Datos ---
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'brewery', 'mainData');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRecipes(Array.isArray(data.recipes) ? data.recipes : []);
        setInventory(Array.isArray(data.inventory) ? data.inventory : []);
        setHistory(Array.isArray(data.history) ? data.history : []);
      } else {
        const seedRecipes = user.isAnonymous ? [] : initialRecipes;
        const seedInventory = user.isAnonymous ? [] : initialInventory;
        setDoc(docRef, { recipes: seedRecipes, inventory: seedInventory, history: [] });
        setRecipes(seedRecipes); setInventory(seedInventory); setHistory([]);
      }
      setIsDataLoaded(true);
    }, (error) => {
      console.error("Error DB:", error);
      setIsDataLoaded(true);
    });
    return () => unsubscribe();
  }, [user]);

  const updateCloudData = async (newData) => {
    if (!user) return;
    setIsSaving(true); 
    try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'brewery', 'mainData'), newData, { merge: true }); } 
    catch (e) { console.error(e); } 
    finally { setTimeout(() => setIsSaving(false), 800); }
  };

  const forceSyncCloud = () => updateCloudData({ recipes, inventory, history });

  const handleAuthSubmit = async (e) => {
    e.preventDefault(); setAuthError(''); setResetMessage('');
    try {
      if (isRegistering) await createUserWithEmailAndPassword(auth, authEmail, authPass);
      else await signInWithEmailAndPassword(auth, authEmail, authPass);
      setView('dashboard');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setAuthError('Este correo ya está registrado.');
      else if (err.code === 'auth/weak-password') setAuthError('Mínimo 6 caracteres.');
      else setAuthError(`Error: ${err.message}`);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setAuthError('');
    try {
      await signInWithPopup(auth, provider);
      setView('dashboard');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain') {
          setAuthError(`Dominio bloqueado. Habilítalo en Firebase.`);
      } else {
          setAuthError('Error al conectar con Google.');
      }
    }
  };

  const handleResetPassword = async () => {
    setAuthError(''); setResetMessage('');
    if (!authEmail) return setAuthError('Ingresa tu correo arriba.');
    try {
      await sendPasswordResetEmail(auth, authEmail);
      setResetMessage('¡Enlace de recuperación enviado!');
    } catch (err) { setAuthError('Error al enviar correo.'); }
  };

  const handleLogout = async () => { await signOut(auth); setView('dashboard'); };

  const handleAddInventoryItem = (name, category) => {
    const unit = category === 'Levadura' ? 'sobre' : category === 'Lúpulo' ? 'g' : 'kg';
    const newInv = [...inventory, { id: 'inv-' + Date.now(), category, name, stock: 0, unit, price: 0 }];
    setInventory(newInv); updateCloudData({ inventory: newInv });
  };
  
  const handleGetAiAdvice = async () => {
    if (!selectedRecipe) return;
    setIsAdvising(true); setAiAdvice(null);
    try {
      const prompt = `Analiza esta receta: ${selectedRecipe.name} (${selectedRecipe.category}). Formulación: ${JSON.stringify(selectedRecipe.ingredients)}. Agua: ${JSON.stringify(selectedRecipe.waterProfile)}. Dame 3 sugerencias técnicas pro para mejorar.`;
      const res = await callGemini(prompt, "Eres un Maestro Cervecero de élite mundial.");
      setAiAdvice(res);
    } catch (err) { alert("IA Ocupada."); } finally { setIsAdvising(false); }
  };

  // --- CRONÓMETRO ---
  useEffect(() => {
    let interval = null;
    if (brewState.isRunning && brewState.timeLeft > 0) interval = setInterval(() => setBrewState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 })), 1000);
    else if (brewState.timeLeft === 0 && brewState.isRunning) setBrewState(prev => ({ ...prev, isRunning: false }));
    return () => clearInterval(interval);
  }, [brewState.isRunning, brewState.timeLeft]);

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60); const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Corrección de cruce de datos seguros:
  const calculateCostForRecipe = (recipe, targetVolume) => {
      let neto = 0;
      (recipe.ingredients?.malts || []).forEach(m => {
        const mName = (m.name || '').toLowerCase();
        const item = inventory.find(i => {
          const iName = (i.name || '').toLowerCase();
          return i.category === 'Malta' && iName && (iName === mName || mName.includes(iName));
        });
        neto += (Number(m.amount) || 0) * (item ? Number(item.price) : defaultPrices.malta);
      });
      (recipe.ingredients?.hops || []).forEach(h => {
        const hName = (h.name || '').toLowerCase();
        const item = inventory.find(i => {
          const iName = (i.name || '').toLowerCase();
          return i.category === 'Lúpulo' && iName && hName.includes(iName);
        });
        neto += (Number(h.amount) || 0) * (item ? Number(item.price) : defaultPrices.lupulo);
      });
      
      const yeastObj = recipe.ingredients?.yeast;
      if (yeastObj) {
         const yeastName = typeof yeastObj === 'string' ? yeastObj : (yeastObj.name || '');
         const yeastAmount = typeof yeastObj === 'string' ? 1 : (Number(yeastObj.amount) || 1);
         const yName = (yeastName || '').toLowerCase();
         const yItem = inventory.find(i => {
           const iName = (i.name || '').toLowerCase();
           return i.category === 'Levadura' && iName && yName.includes(iName);
         });
         neto += yeastAmount * (yItem ? Number(yItem.price) : defaultPrices.levadura);
      }
      return neto + (neto * 0.19);
  };

  const deleteHistoryItem = (id) => {
    if(window.confirm("¿Seguro que deseas eliminar este registro del historial?")) {
      const newHistory = history.filter(item => item.id !== id);
      setHistory(newHistory);
      updateCloudData({ history: newHistory });
    }
  };

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-amber-500 animate-pulse">
          <Beaker size={64} className="mx-auto mb-4" />
          <h2 className="text-2xl font-black">Conectando a la Nube...</h2>
          <p className="font-bold text-sm mt-2 tracking-widest uppercase">Cargando tu cervecería</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTAS
  // ==========================================

  const renderAuth = () => (
    <div className="flex justify-center items-center min-h-[60vh] animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 p-4 rounded-full inline-block mb-3"><User size={40}/></div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">{isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Guarda tus recetas y métricas en la nube.</p>
        </div>
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Correo Electrónico</label><input type="email" required className="w-full p-3 border dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" value={authEmail} onChange={e => setAuthEmail(e.target.value)} /></div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contraseña</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} required className="w-full p-3 pr-12 border dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" value={authPass} onChange={e => setAuthPass(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-amber-500 transition-colors">{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
            </div>
            {!isRegistering && <div className="text-right mt-2"><button type="button" onClick={handleResetPassword} className="text-xs font-bold text-slate-500 hover:text-amber-500">¿Olvidaste tu contraseña?</button></div>}
          </div>
          {authError && <p className="text-red-500 text-sm font-medium bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">{authError}</p>}
          {resetMessage && <p className="text-emerald-500 text-sm font-medium bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-lg">{resetMessage}</p>}
          <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 dark:bg-amber-600 dark:hover:bg-amber-500 text-white p-4 rounded-xl font-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">{isRegistering ? 'Registrar y Entrar' : 'Entrar'}</button>
        </form>

        <div className="mt-4 flex flex-col gap-3">
          <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">O acceder con</span>
              <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
          </div>
          <button type="button" onClick={handleGoogleSignIn} className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold p-3 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            Google
          </button>
        </div>

        <div className="mt-6 text-center"><button onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); setResetMessage(''); }} className="text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors">{isRegistering ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate'}</button></div>
      </div>
    </div>
  );

  const renderDashboard = () => {
    const safeHistory = Array.isArray(history) ? history : [];
    const availableStyles = ['Todos', ...new Set(safeHistory.map(h => h.category || 'Otros'))];

    // Aplicar Filtros
    const now = Date.now();
    const filteredHistory = safeHistory.filter(h => {
        // Filtro Estilo
        if (dashStyleFilter !== 'Todos' && (h.category || 'Otros') !== dashStyleFilter) return false;
        // Filtro Tiempo
        if (dashTimeFilter !== 'all') {
            const histTime = h.timestamp || parseDateToTimestamp(h.date);
            const daysDiff = (now - histTime) / (1000 * 3600 * 24);
            if (dashTimeFilter === '30' && daysDiff > 30) return false;
            if (dashTimeFilter === '90' && daysDiff > 90) return false;
            if (dashTimeFilter === '365' && daysDiff > 365) return false;
        }
        return true;
    });
    
    // Cálculos de KPIs basados en el filtro
    const totalLiters = filteredHistory.reduce((sum, h) => sum + (Number(h.volume) || 0), 0);
    const totalCost = filteredHistory.reduce((sum, h) => sum + (Number(h.totalCost) || 0), 0);
    const avgCostPerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;
    const totalBatches = filteredHistory.length;
    
    let sumABV = 0; let countABV = 0;
    filteredHistory.forEach(h => { if(h.abv && Number(h.abv) > 0) { sumABV += Number(h.abv); countABV++; } });
    const avgABV = countABV > 0 ? (sumABV / countABV).toFixed(1) : 0;

    const volumeByStyle = filteredHistory.reduce((acc, h) => {
        const style = h.category || 'Otros';
        acc[style] = (acc[style] || 0) + (Number(h.volume) || 0);
        return acc;
    }, {});
    const topStyles = Object.entries(volumeByStyle).sort((a,b) => b[1] - a[1]).slice(0, 4);
    const maxStyleVolume = topStyles.length > 0 ? topStyles[0][1] : 1;

    // Lógica para Alertas de Stock
    const lowStockItems = inventory.filter(i => {
      if (i.category === 'Lúpulo' && i.stock <= 100) return true;
      if (i.category === 'Malta' && i.stock <= 3) return true;
      if (i.category === 'Levadura' && i.stock <= 1) return true;
      return false;
    });

    return (
      <div className="space-y-6 animate-fadeIn">
        
        {/* Cabecera Dashboard */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 mb-6 gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
              <TrendingUp className="text-blue-500" size={32} /> Central de Operaciones
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Visión analítica de tu cervecería.</p>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button onClick={() => setView('list')} className="flex-1 md:flex-none justify-center bg-amber-500 hover:bg-amber-400 text-slate-900 px-6 py-3 rounded-xl font-black flex items-center gap-2 transition-all shadow-md hover:-translate-y-0.5">
              <Beer size={20} /> Iniciar Cocción
            </button>
            <button onClick={() => setView('add')} className="flex-1 md:flex-none justify-center bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 transition-all shadow-md hover:-translate-y-0.5 border border-slate-700">
              <Plus size={20} /> Formular Receta
            </button>
          </div>
        </div>

        {/* Panel de Filtros Inteligentes */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center shadow-inner">
           <div className="flex items-center gap-3 w-full md:w-auto">
              <Filter className="text-slate-400" size={20} />
              <span className="font-bold text-sm uppercase tracking-wider text-slate-500">Filtros:</span>
           </div>
           
           <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {[{l:'Todo', v:'all'}, {l:'30 Días', v:'30'}, {l:'90 Días', v:'90'}, {l:'1 Año', v:'365'}].map(f => (
                <button 
                  key={f.v} onClick={() => setDashTimeFilter(f.v)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${dashTimeFilter === f.v ? 'bg-blue-500 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                >{f.l}</button>
              ))}
           </div>
           
           <div className="w-full md:w-auto md:ml-auto">
              <select 
                value={dashStyleFilter} onChange={e => setDashStyleFilter(e.target.value)}
                className="w-full md:w-48 p-2 rounded-lg text-sm font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                {availableStyles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
           </div>
        </div>

        {user && user.isAnonymous && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
             <p className="text-amber-600 dark:text-amber-500 text-sm font-bold flex items-center justify-center md:justify-start gap-2"><Info size={18}/> Estás en modo invitado. Tus estadísticas desaparecerán al salir.</p>
             <button onClick={() => setView('auth')} className="bg-amber-500 text-slate-900 px-6 py-2 rounded-xl font-black shadow-md hover:bg-amber-400 transition-all whitespace-nowrap">Crear Cuenta</button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden transition-transform hover:scale-105">
            <div className="absolute -right-4 -bottom-4 opacity-20"><Droplets size={100} /></div>
            <span className="text-blue-100 text-[10px] font-black uppercase tracking-widest block mb-1 relative z-10">Lts Producidos</span>
            <span className="text-4xl md:text-5xl font-black relative z-10">{totalLiters} <span className="text-2xl text-blue-200">L</span></span>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden transition-transform hover:scale-105">
            <div className="absolute -right-4 -bottom-4 opacity-20"><Banknote size={100} /></div>
            <span className="text-emerald-100 text-[10px] font-black uppercase tracking-widest block mb-1 relative z-10">Costo / Litro</span>
            <span className="text-3xl md:text-4xl font-black relative z-10">{formatCurrency(avgCostPerLiter)}</span>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden transition-transform hover:scale-105">
            <div className="absolute right-[-20px] top-[-20px] opacity-5 dark:opacity-10 text-orange-500"><CalendarClock size={100} /></div>
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-1 relative z-10">Lotes (Batches)</span>
            <span className="text-4xl font-black text-slate-800 dark:text-white relative z-10">{totalBatches}</span>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden transition-transform hover:scale-105">
            <div className="absolute right-[-20px] top-[-20px] opacity-5 dark:opacity-10 text-red-500"><Thermometer size={100} /></div>
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-1 relative z-10">ABV Promedio</span>
            <span className="text-4xl font-black text-red-500 relative z-10">{avgABV}%</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mt-2">
          {/* GRÁFICO BARRAS: Producción por Estilo (Ocupa 2/3) */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm flex-1">
              <h3 className="font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2"><BarChart3 size={20} className="text-blue-500"/> Top Estilos (Volumen)</h3>
              {topStyles.length === 0 ? (
                <p className="text-slate-400 font-medium italic text-center py-8">Cocina tu primer lote para ver estadísticas.</p>
              ) : (
                <div className="space-y-5">
                  {topStyles.map(([style, vol], idx) => {
                    const percentage = Math.max(5, (vol / maxStyleVolume) * 100);
                    const theme = getThemeForCategory(style);
                    return (
                      <div key={idx} className="relative group">
                        <div className="flex justify-between text-sm font-bold mb-1.5">
                          <span className="text-slate-700 dark:text-slate-300 group-hover:text-white transition-colors">{style}</span>
                          <span className={theme.text}>{vol} L</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden shadow-inner">
                          <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${percentage}%`, backgroundColor: theme.colorBase }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: Finanzas y Alertas (Ocupa 1/3) */}
          <div className="space-y-6 flex flex-col">
            {/* TARJETA INVERSION TOTAL */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-950 p-8 rounded-3xl border border-slate-700 shadow-xl flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-1000"><PieChart size={250} className="text-emerald-500"/></div>
              <div className="relative z-10">
                <h3 className="font-black text-white text-xl mb-2 flex items-center gap-2"><Banknote size={24} className="text-emerald-400"/> Inversión Acumulada</h3>
                <p className="text-slate-400 text-sm font-medium">Suma de costos de todos los insumos de los lotes en este periodo.</p>
              </div>
              <div className="mt-8 text-center bg-black/40 p-8 rounded-2xl border border-white/5 backdrop-blur-md relative z-10 shadow-inner group-hover:border-emerald-500/30 transition-colors">
                <span className="block text-5xl md:text-6xl font-black text-emerald-400 mb-2 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)] tracking-tighter">{formatCurrency(totalCost)}</span>
                <span className="text-emerald-500/70 text-[10px] font-black uppercase tracking-[0.3em]">CLP Histórico</span>
              </div>
            </div>

            {/* ALERTAS DE STOCK (La Nueva Función) */}
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm flex-1">
              <h3 className="font-black text-slate-800 dark:text-white mb-5 flex items-center gap-2"><AlertTriangle size={20} className="text-red-500"/> Alertas de Stock</h3>
              {lowStockItems.length === 0 ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl text-center border border-emerald-100 dark:border-emerald-900/30">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2"/>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 font-bold">Insumos suficientes</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {lowStockItems.slice(0, 4).map(item => (
                    <li key={item.id} className="flex justify-between items-center p-3 bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20">
                      <div className="overflow-hidden pr-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block truncate text-sm">{item.name}</span>
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">{item.category}</span>
                      </div>
                      <span className="font-black text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded-md text-xs shrink-0 whitespace-nowrap">{item.stock} {item.unit}</span>
                    </li>
                  ))}
                  {lowStockItems.length > 4 && (
                    <button onClick={() => setView('inventory')} className="w-full text-center text-xs font-bold text-red-500 hover:text-red-600 pt-3 flex justify-center items-center gap-1 transition-colors">Ver {lowStockItems.length - 4} alertas más <ChevronRight size={14}/></button>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>

      </div>
    );
  };

  // 1.5 Vista de Mis Recetas
  const renderList = () => {
    const safeRecipes = Array.isArray(recipes) ? recipes : [];
    const grouped = safeRecipes.reduce((acc, recipe) => {
      const cat = recipe.category || 'Sin Categoría';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(recipe);
      return acc;
    }, {});

    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 gap-4">
          <div className="flex items-center">
            <p className="text-slate-600 dark:text-slate-400 font-medium">Tienes <span className="text-amber-600 font-bold">{safeRecipes.length} recetas</span> en tu biblioteca.</p>
            {user && !user.isAnonymous && (
              <button 
                onClick={() => {
                  const existingIds = safeRecipes.map(r => r.id);
                  const missing = initialRecipes.filter(r => !existingIds.includes(r.id));
                  if(missing.length > 0) {
                      const updated = [...safeRecipes, ...missing];
                      setRecipes(updated); updateCloudData({ recipes: updated });
                  } else { alert("¡Ya tienes todas las recetas maestras actualizadas en tu perfil!"); }
                }} 
                className="text-xs text-blue-500 hover:text-blue-600 underline ml-3 font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded"
              >
                ¿Faltan recetas base?
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-center">
            <button onClick={() => setView('add')} className="flex-1 md:flex-none justify-center bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm">
              <Plus size={18} /> Nueva / Clonar Receta
            </button>
          </div>
        </div>

        {Object.keys(grouped).map(category => {
          const theme = getThemeForCategory(category);
          return (
            <div key={category} className="space-y-4">
              <h2 className={`text-2xl font-black ${theme.text} border-b-2 ${theme.border} pb-2 flex items-center gap-2`}><Beer className={theme.icon} /> {category}</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {grouped[category].map(recipe => {
                  const recipeHistory = Array.isArray(history) ? history.filter(h => h.recipeName === recipe.name) : [];
                  const brewCount = recipeHistory.length;
                  const ratedHistory = recipeHistory.filter(h => h.tasting && h.tasting.rating > 0);
                  const avgRating = ratedHistory.length > 0 ? (ratedHistory.reduce((sum, h) => sum + h.tasting.rating, 0) / ratedHistory.length).toFixed(1) : null;
                  const srmColorHex = getSrmColor(recipe.colorSRM); // NUEVO: Obtener color SRM

                  return (
                    <div 
                      key={recipe.id} 
                      className={`bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm hover:shadow-xl border-2 border-transparent hover:${theme.border} transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between relative overflow-hidden`}
                    >
                      {/* BARRA SRM INFERIOR */}
                      <div className="absolute bottom-0 left-0 w-full h-1.5 opacity-80" style={{ backgroundColor: srmColorHex }}></div>

                      <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           if(window.confirm(`¿Seguro que deseas eliminar la receta: ${recipe.name}?`)) {
                             const newRecipes = recipes.filter(r => r.id !== recipe.id);
                             setRecipes(newRecipes); updateCloudData({ recipes: newRecipes });
                           }
                         }}
                         className="absolute top-4 right-4 text-gray-300 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10 p-1 bg-white dark:bg-slate-800 rounded-md shadow-sm" title="Eliminar receta"
                      ><Trash2 size={18}/></button>

                      <div className="cursor-pointer" onClick={() => { setSelectedRecipe(recipe); setTargetVol(recipe.targetVolume || 20); setCompletedSteps([]); setActiveTab('recipe'); setAiAdvice(null); setView('recipe'); }}>
                        <div className="flex justify-between items-start mb-3">
                          <span className={`inline-block px-3 py-1 rounded text-xs font-bold shadow-sm ${theme.badge}`}>{recipe.category || 'Sin Estilo'}</span>
                          {brewCount > 0 && (
                            <div className="flex items-center gap-2 text-xs font-bold mr-6">
                              <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm"><CalendarClock size={12} /> {brewCount} {brewCount === 1 ? 'Lote' : 'Lotes'}</span>
                              {avgRating && <span className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm"><Star size={12} className="fill-amber-500 text-amber-500" /> {avgRating}</span>}
                            </div>
                          )}
                        </div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight mb-2 group-hover:text-amber-600 transition-colors pr-6 tracking-tight">{recipe.name || 'Sin Nombre'}</h3>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-5 text-sm text-slate-600 dark:text-slate-400 font-bold border-t border-gray-100 dark:border-slate-800 pt-4 cursor-pointer pb-2" onClick={() => { setSelectedRecipe(recipe); setTargetVol(recipe.targetVolume || 20); setCompletedSteps([]); setActiveTab('recipe'); setAiAdvice(null); setView('recipe'); }}>
                        <span className="flex items-center gap-1" title="Volumen"><Droplets size={16} className="text-blue-500"/> {recipe.targetVolume || 0}L</span>
                        <span className="flex items-center gap-1" title="Alcohol Est."><Thermometer size={16} className="text-red-500"/> {recipe.abv || 0}%</span>
                        {(recipe.ibu > 0) && <span className="flex items-center gap-1" title="Amargor"><Activity size={16} className="text-orange-500"/> {recipe.ibu} IBU</span>}
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
      newInv[index][field] = Number(value) || 0;
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
            <p className="text-sm font-bold text-slate-500 mt-2 flex items-center gap-2"><Scale size={16}/> Capital Estimado: <span className="text-emerald-600 dark:text-emerald-400 font-black">{formatCurrency(totalInventoryValue)}</span></p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => setShowInvForm(!showInvForm)} className="flex-1 md:flex-none justify-center flex items-center gap-2 text-white font-bold bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition-colors shadow-sm">
              <Plus size={20} /> Añadir
            </button>
          </div>
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
           const categoryItems = Array.isArray(inventory) ? inventory.filter(i => i.category === category) : [];
           
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
                    {categoryItems.map((item) => (
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
                  </tbody>
                </table>
              </div>
            </div>
           )
        })}
      </div>
    );
  };

  // 3. Vista de Detalles de Receta
  const renderRecipeView = () => {
    if (!selectedRecipe) return null;

    const theme = getThemeForCategory(selectedRecipe.category);
    const scaleFactor = (targetVol || 1) / (selectedRecipe.targetVolume || 1);
    
    // SAFE PARSING DE RECETA
    const safeMalts = Array.isArray(selectedRecipe.ingredients?.malts) ? selectedRecipe.ingredients.malts : [];
    const safeHops = Array.isArray(selectedRecipe.ingredients?.hops) ? selectedRecipe.ingredients.hops : [];
    const safeYeast = typeof selectedRecipe.ingredients?.yeast === 'string' 
      ? { name: selectedRecipe.ingredients.yeast, amount: 1, unit: 'sobre' } 
      : (selectedRecipe.ingredients?.yeast || { name: 'Levadura', amount: 1, unit: 'sobre' });

    const scaledRecipe = {
      ...selectedRecipe,
      ingredients: {
        malts: safeMalts.map(m => ({ ...m, amount: ((Number(m.amount) || 0) * scaleFactor).toFixed(2) })),
        hops: safeHops.map(h => ({ ...h, amount: Math.round((Number(h.amount) || 0) * scaleFactor) })),
        yeast: safeYeast,
        water: {
          strike: ((Number(selectedRecipe.ingredients?.water?.strike) || 15) * scaleFactor).toFixed(1),
          sparge: ((Number(selectedRecipe.ingredients?.water?.sparge) || 15) * scaleFactor).toFixed(1)
        }
      }
    };

    const calculateCost = () => {
      let neto = 0; let allFound = true;
      scaledRecipe.ingredients.malts.forEach(m => {
        const mName = (m.name || '').toLowerCase();
        const item = inventory.find(i => {
          const iName = (i.name || '').toLowerCase();
          return i.category === 'Malta' && iName && (iName === mName || mName.includes(iName));
        });
        if (item) neto += (Number(m.amount) || 0) * Number(item.price); else { neto += (Number(m.amount) || 0) * defaultPrices.malta; allFound = false; }
      });
      scaledRecipe.ingredients.hops.forEach(h => {
        const hName = (h.name || '').toLowerCase();
        const item = inventory.find(i => {
          const iName = (i.name || '').toLowerCase();
          return i.category === 'Lúpulo' && iName && hName.includes(iName);
        });
        if (item) neto += (Number(h.amount) || 0) * Number(item.price); else { neto += (Number(h.amount) || 0) * defaultPrices.lupulo; allFound = false; }
      });
      
      const yName = (typeof scaledRecipe.ingredients?.yeast === 'string' ? scaledRecipe.ingredients.yeast : (scaledRecipe.ingredients?.yeast?.name || '')).toLowerCase();
      const yItem = inventory.find(i => {
        const iName = (i.name || '').toLowerCase();
        return i.category === 'Levadura' && iName && yName.includes(iName);
      });
      const yAmount = typeof scaledRecipe.ingredients?.yeast === 'string' ? 1 : (Number(scaledRecipe.ingredients?.yeast?.amount) || 1);
      
      if (yItem) neto += yAmount * Number(yItem.price); else { neto += yAmount * defaultPrices.levadura; allFound = false; }
      
      const iva = neto * 0.19; const totalConIva = neto + iva;
      return { neto, iva, totalConIva, perLiter: totalConIva / (targetVol || 1), allFound };
    };
    const costInfo = calculateCost();

    const calculateSalts = () => {
      if (!scaledRecipe.waterProfile) return null;
      const target = scaledRecipe.waterProfile;
      const totalWaterLiters = Number(scaledRecipe.ingredients.water.strike) + Number(scaledRecipe.ingredients.water.sparge);
      if (totalWaterLiters <= 0) return null;

      const diff = {
        Ca: Math.max(0, (Number(target.Ca) || 0) - baseWater.Ca), Mg: Math.max(0, (Number(target.Mg) || 0) - baseWater.Mg),
        SO4: Math.max(0, (Number(target.SO4) || 0) - baseWater.SO4), Cl: Math.max(0, (Number(target.Cl) || 0) - baseWater.Cl),
        HCO3: Math.max(0, (Number(target.HCO3) || 0) - baseWater.HCO3) // NUEVO: Calculo para Bicarbonato
      };

      const epsomGrams = (diff.Mg * totalWaterLiters) / 99; const epsomSO4Contributed = (epsomGrams * 390) / totalWaterLiters || 0;
      const cacl2Grams = (diff.Cl * totalWaterLiters) / 482; const cacl2CaContributed = (cacl2Grams * 272) / totalWaterLiters || 0;
      
      // NUEVO: Bicarbonato de Sodio (Baking Soda) para alcanzar HCO3
      const bakingSodaGrams = (diff.HCO3 * totalWaterLiters) / 728; 

      const remainingSO4 = Math.max(0, diff.SO4 - epsomSO4Contributed);
      const gypsumGrams = (remainingSO4 * totalWaterLiters) / 558; const gypsumCaContributed = (gypsumGrams * 232) / totalWaterLiters || 0;

      const finalEstimates = {
        Ca: Math.round(baseWater.Ca + cacl2CaContributed + gypsumCaContributed), 
        Mg: Math.round(baseWater.Mg + diff.Mg),
        SO4: Math.round(baseWater.SO4 + epsomSO4Contributed + remainingSO4), 
        Cl: Math.round(baseWater.Cl + diff.Cl),
        HCO3: Math.round(baseWater.HCO3 + diff.HCO3) // Ya alcanzamos el objetivo con Baking Soda
      };
      
      return { totalWater: totalWaterLiters.toFixed(1), gypsum: gypsumGrams.toFixed(1), cacl2: cacl2Grams.toFixed(1), epsom: epsomGrams.toFixed(1), bakingSoda: bakingSodaGrams.toFixed(1), finalEstimates };
    };
    const saltAdditions = calculateSalts();

    const toggleStep = (id) => setCompletedSteps(prev => prev.includes(id) ? prev.filter(stepId => stepId !== id) : [...prev, id]);
    const toggleStepDetails = (e, id) => { e.stopPropagation(); setExpandedStep(prev => prev === id ? null : id); };

    return (
      <div className="animate-fadeIn">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setView('list')} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 font-bold bg-white dark:bg-slate-800 px-4 py-2 rounded-xl transition-all shadow-sm border border-gray-200 dark:border-slate-700 hover:-translate-x-1">
            <ArrowLeft size={20} /> Mis Recetas
          </button>
          <button onClick={() => setView('edit')} className="flex items-center gap-2 text-white font-bold bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition-all shadow-sm hover:scale-105 border border-slate-700">
            <Edit3 size={18} /> Editar Receta
          </button>
        </div>

        {/* HEADER DINÁMICO */}
        <div className={`${theme.header} text-white p-8 md:p-12 rounded-t-[2.5rem] shadow-xl flex flex-col md:flex-row justify-between items-start md:items-end relative overflow-hidden`}>
          <div className="relative z-10">
            <span className="bg-white/20 px-5 py-2 rounded-full text-sm font-black tracking-[0.2em] uppercase mb-4 inline-block shadow-sm backdrop-blur-md">
              {scaledRecipe.category || 'Sin Categoría'}
            </span>
            <h2 className="text-5xl md:text-6xl font-black mb-3 leading-[0.9] drop-shadow-md tracking-tighter">{scaledRecipe.name || 'Receta Sin Nombre'}</h2>
            <div className="flex flex-wrap gap-3 mt-6 font-bold text-white/90">
              <span className="flex items-center gap-1.5 bg-black/20 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm" title="Alcohol por Volumen"><Thermometer size={18}/> ABV: {scaledRecipe.abv}%</span>
              <span className="flex items-center gap-1.5 bg-black/20 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm" title="Gravedad Original"><Clock size={18}/> DO: {scaledRecipe.og}</span>
              <span className="flex items-center gap-1.5 bg-black/20 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm" title="Gravedad Final"><CheckCircle2 size={18}/> DF: {scaledRecipe.fg}</span>
              {(scaledRecipe.ibu > 0) && <span className="flex items-center gap-1.5 bg-black/20 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm" title="Amargor (IBU)"><Activity size={18}/> IBU: {scaledRecipe.ibu}</span>}
              {(scaledRecipe.colorSRM > 0) && (
                 <span className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm" title="Color Estimado (SRM)">
                    <div className="w-4 h-4 rounded-full border border-white/50" style={{backgroundColor: getSrmColor(scaledRecipe.colorSRM)}}></div> SRM: {scaledRecipe.colorSRM}
                 </span>
              )}
            </div>
          </div>
          
          <div className="mt-8 md:mt-0 flex flex-col items-start md:items-end bg-black/20 p-6 rounded-3xl backdrop-blur-md border border-white/20 relative z-10 shadow-lg">
            <label className="font-bold text-white/90 text-xs mb-2 uppercase tracking-widest">Volumen Objetivo</label>
            <div className="flex items-center gap-3">
              <input 
                type="number" 
                value={targetVol}
                onChange={(e) => setTargetVol(Number(e.target.value) || 0)}
                className="w-28 p-2 bg-white text-slate-800 rounded-2xl text-center focus:ring-4 focus:ring-white/50 outline-none text-3xl font-black shadow-inner"
                min="1"
              />
              <span className="text-white font-black text-3xl italic">L</span>
            </div>
          </div>
        </div>

        {/* TABS NAVEGACIÓN */}
        <div className="flex flex-wrap border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto rounded-b-none">
          <button onClick={() => setActiveTab('recipe')} className={`flex-1 min-w-[100px] py-5 font-black text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'recipe' ? `${theme.bg} border-b-4 ${theme.border} ${theme.text}` : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <BookOpen size={18} /> Receta
          </button>
          <button onClick={() => setActiveTab('process')} className={`flex-1 min-w-[100px] py-5 font-black text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'process' ? `${theme.bg} border-b-4 ${theme.border} ${theme.text}` : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <CheckCircle2 size={18} /> Proceso
          </button>
          <button onClick={() => setActiveTab('water')} className={`flex-1 min-w-[100px] py-5 font-black text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'water' ? `${theme.bg} border-b-4 ${theme.border} ${theme.text}` : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <Droplets size={18} /> Agua
          </button>
          <button onClick={() => setActiveTab('tips')} className={`flex-1 min-w-[100px] py-5 font-black text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'tips' ? `${theme.bg} border-b-4 ${theme.border} ${theme.text}` : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <Info size={18} /> Tips
          </button>
          {(Array.isArray(scaledRecipe.modifications) && scaledRecipe.modifications.length > 0) && (
            <button onClick={() => setActiveTab('history')} className={`flex-1 min-w-[100px] py-5 font-black text-sm md:text-base flex justify-center items-center gap-2 transition-colors ${activeTab === 'history' ? `${theme.bg} border-b-4 ${theme.border} ${theme.text}` : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <FileClock size={18} /> Cambios
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-b-[2.5rem] shadow-sm border border-t-0 border-gray-100 dark:border-slate-800 mt-0">
          
          {/* TAB: RECETA */}
          {activeTab === 'recipe' && (
            <div className="space-y-10 animate-fadeIn">
              
              {/* BOTON IA Y CONSEJOS */}
              <div className="flex justify-end">
                <button 
                  onClick={handleGetAiAdvice} 
                  disabled={isAdvising}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-400 font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow-md disabled:opacity-50 border border-amber-200 dark:border-amber-800"
                >
                  {isAdvising ? <Loader2 className="animate-spin" size={18} /> : <BrainCircuit size={18} />}
                  {isAdvising ? 'Analizando parámetros...' : '✨ Consultar al Maestro IA'}
                </button>
              </div>

              {aiAdvice && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800 p-8 rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-inner relative animate-in zoom-in duration-500">
                   <div className="absolute top-6 right-6 text-amber-400/20"><Sparkles size={64} /></div>
                   <h4 className="font-black text-amber-800 dark:text-amber-500 text-xl flex items-center gap-2 mb-4">
                     <Wand2 size={24} /> Análisis Experto de la Receta
                   </h4>
                   <div className="text-slate-700 dark:text-slate-300 font-medium text-base whitespace-pre-line leading-relaxed">
                     {aiAdvice}
                   </div>
                </div>
              )}

              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-8 rounded-3xl border border-emerald-200 dark:border-emerald-800/50 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
                 <div className="flex items-center gap-5 w-full md:w-auto">
                   <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-5 rounded-2xl text-white shadow-lg flex-shrink-0">
                     <Banknote size={36} />
                   </div>
                   <div>
                     <h4 className="font-black text-emerald-900 dark:text-emerald-400 text-2xl tracking-tight">Costo de Producción</h4>
                     {!costInfo.allFound && <p className="text-sm text-emerald-700 dark:text-emerald-600 font-medium flex items-center gap-1 mt-1"><Info size={14}/> Faltan ítems, usando estimación.</p>}
                   </div>
                 </div>
                 
                 <div className="flex flex-col md:flex-row gap-8 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-emerald-100 dark:border-slate-700 w-full md:w-auto flex-1 md:flex-none justify-end">
                   <div className="flex flex-col text-sm border-b md:border-b-0 md:border-r border-gray-100 dark:border-slate-700 pb-4 md:pb-0 md:pr-8 justify-center">
                     <div className="flex justify-between gap-10 text-slate-500 dark:text-slate-400 mb-2">
                       <span>Neto:</span>
                       <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(costInfo.neto)}</span>
                     </div>
                     <div className="flex justify-between gap-10 text-slate-500 dark:text-slate-400">
                       <span>IVA (19%):</span>
                       <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(costInfo.iva)}</span>
                     </div>
                   </div>
                   
                   <div className="flex justify-between md:flex-col items-center md:items-end md:justify-center gap-3 pl-0 md:pl-4">
                     <div className="text-left md:text-right w-full">
                       <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Lote</span>
                       <span className="text-3xl font-black text-emerald-600 leading-none block">{formatCurrency(costInfo.totalConIva)}</span>
                     </div>
                     <div className="text-right w-full border-l border-gray-100 dark:border-slate-700 pl-4 md:border-none md:pl-0 mt-0 md:mt-2">
                       <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Costo x Litro</span>
                       <span className="text-xl font-black text-emerald-500 leading-none block">{formatCurrency(costInfo.perLiter)}</span>
                     </div>
                   </div>
                 </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-amber-50/50 dark:bg-amber-900/10 p-8 rounded-3xl border border-amber-200 dark:border-amber-800/30 shadow-sm">
                  <h3 className="text-2xl font-black flex items-center gap-3 border-b border-amber-200 dark:border-amber-800/50 pb-4 mb-6 text-amber-900 dark:text-amber-500">
                    <Wheat className="text-amber-500" size={28}/> Granos y Agua
                  </h3>
                  <ul className="space-y-4">
                    {scaledRecipe.ingredients.malts.map((malt, idx) => (
                      <li key={idx} className="flex justify-between items-center text-lg border-b border-amber-100 dark:border-amber-900/30 pb-4">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{malt.name || 'Malta'}</span>
                        <span className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 text-amber-800 dark:text-amber-400 px-4 py-1.5 rounded-xl font-black shadow-sm">{malt.amount} {malt.unit || 'kg'}</span>
                      </li>
                    ))}
                    <li className="flex justify-between items-center pt-4 mt-4 border-t border-dashed border-amber-300 dark:border-amber-800/50">
                      <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-2"><Droplets size={18}/> Agua Strike (Macerar)</span>
                      <span className="font-black text-blue-800 dark:text-blue-300 text-xl">{scaledRecipe.ingredients.water.strike} L</span>
                    </li>
                    <li className="flex justify-between items-center pt-3">
                      <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-2"><Droplets size={18}/> Agua Sparge (Lavar)</span>
                      <span className="font-black text-blue-800 dark:text-blue-300 text-xl">{scaledRecipe.ingredients.water.sparge} L</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-green-50/50 dark:bg-green-900/10 p-8 rounded-3xl border border-green-200 dark:border-green-800/30 shadow-sm">
                  <h3 className="text-2xl font-black flex items-center gap-3 border-b border-green-200 dark:border-green-800/50 pb-4 mb-6 text-green-900 dark:text-green-500">
                    <Leaf className="text-green-500" size={28}/> Lúpulos
                  </h3>
                  <ul className="space-y-5">
                    {scaledRecipe.ingredients.hops.map((hop, idx) => (
                      <li key={idx} className="flex flex-col border-b border-green-100 dark:border-green-900/30 pb-4 last:border-0">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xl">{hop.name || 'Lúpulo'}</span>
                          <span className="bg-white dark:bg-slate-800 border border-green-200 dark:border-slate-700 text-green-800 dark:text-green-400 px-4 py-1.5 rounded-xl font-black shadow-sm">{hop.amount} {hop.unit || 'g'}</span>
                        </div>
                        {hop.time && (
                          <span className="text-green-700 dark:text-green-300 font-bold text-sm flex items-center gap-2 bg-green-100/50 dark:bg-green-900/40 w-fit px-3 py-1.5 rounded-lg border border-green-200/50 dark:border-green-800">
                            <Clock size={16}/> {hop.time} <span className="mx-1 opacity-50">•</span> <span className="uppercase tracking-wider">{hop.stage || 'Hervor'}</span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm">
                 <div className="bg-white dark:bg-slate-700 p-5 rounded-2xl text-slate-600 dark:text-white shadow-md border border-slate-200 dark:border-slate-600 flex-shrink-0">
                    <Beaker size={36} />
                 </div>
                 <div>
                   <h4 className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-xs mb-2">Levadura Recomendada</h4>
                   <p className="text-slate-800 dark:text-white font-black text-3xl">{scaledRecipe.ingredients.yeast.amount} <span className="text-xl font-bold text-slate-500">{scaledRecipe.ingredients.yeast.unit || 'sobre'}</span> de <span className="text-amber-600 dark:text-amber-500">{scaledRecipe.ingredients.yeast.name || 'Genérica'}</span></p>
                 </div>
              </div>
            </div>
          )}

          {/* TAB: PROCESO */}
          {activeTab === 'process' && (
            <div className="space-y-6 animate-fadeIn">
              <div className={`${theme.header} text-white p-8 md:p-12 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 mb-10`}>
                <div className="text-center md:text-left">
                  <h3 className="text-4xl font-black flex items-center justify-center md:justify-start gap-4 mb-3 tracking-tighter"><Play size={36} className="fill-white" /> Día de Cocción</h3>
                  <p className="text-white/90 font-bold text-base">Modo guiado paso a paso. Al finalizar descontaremos de tu inventario.</p>
                </div>
                <button 
                  onClick={() => {
                    const firstStep = (scaledRecipe.steps && scaledRecipe.steps[0]) ? scaledRecipe.steps[0] : {};
                    setBrewState({ stepIdx: 0, timeLeft: firstStep.duration ? firstStep.duration * 60 : 0, isRunning: false, currentScaledRecipe: scaledRecipe });
                    setView('brew');
                  }}
                  className="bg-white text-slate-900 px-10 py-5 rounded-2xl font-black text-lg transition-transform shadow-2xl w-full md:w-auto text-center hover:scale-105 active:scale-95"
                >
                  ¡Empezar a Cocinar!
                </button>
              </div>

              {(scaledRecipe.steps || []).map((step, idx) => (
                <div key={step.id || idx} className="flex flex-col group">
                  <div 
                    onClick={() => toggleStep(step.id || idx)}
                    className={`p-6 md:p-8 rounded-t-3xl md:rounded-3xl border-2 cursor-pointer transition-all duration-300 flex items-start gap-5 md:gap-6 ${completedSteps.includes(step.id || idx) ? 'border-green-400 bg-green-50/50 dark:bg-green-900/20 opacity-60' : 'border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600'} ${expandedStep === (step.id || idx) ? 'rounded-b-none border-b-0' : ''}`}
                  >
                    <button className={`mt-1 rounded-full flex-shrink-0 transition-colors ${completedSteps.includes(step.id || idx) ? 'text-green-500' : 'text-gray-300 dark:text-slate-600 group-hover:text-amber-400'}`}>
                      <CheckCircle2 size={36} className={completedSteps.includes(step.id || idx) ? 'fill-green-100 dark:fill-green-900' : ''} />
                    </button>
                    <div className="flex-1 pt-1">
                      <h3 className={`font-black text-2xl ${completedSteps.includes(step.id || idx) ? 'text-green-800 dark:text-green-400 line-through decoration-green-400 decoration-2' : 'text-slate-800 dark:text-white'}`}>
                        {idx + 1}. {step.title || 'Paso de Cocción'}
                      </h3>
                      <p className={`text-lg mt-2 leading-relaxed font-medium ${completedSteps.includes(step.id || idx) ? 'text-green-700 dark:text-green-500' : 'text-slate-600 dark:text-slate-400'}`}>
                        {step.desc || ''}
                      </p>
                    </div>
                    {step.details && typeof step.details === 'string' && (
                      <button 
                        onClick={(e) => toggleStepDetails(e, step.id || idx)}
                        className="ml-auto text-gray-400 hover:text-amber-600 p-3 flex flex-col items-center justify-center transition-colors bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-amber-50 dark:hover:bg-slate-700"
                        title="Ver detalle del paso"
                      >
                        {expandedStep === (step.id || idx) ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
                        <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Técnica</span>
                      </button>
                    )}
                  </div>
                  
                  {expandedStep === (step.id || idx) && step.details && typeof step.details === 'string' && (
                    <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-800/50 border-2 border-t-0 border-slate-200 dark:border-slate-700 rounded-b-3xl text-slate-800 dark:text-slate-200 animate-fadeIn text-base md:text-lg shadow-inner">
                      <h4 className="font-black flex items-center gap-2 mb-4 text-amber-700 dark:text-amber-500 uppercase tracking-wider text-sm"><Info size={20}/> Guía del Maestro:</h4>
                      <div className="pl-6 space-y-4 border-l-4 border-amber-300 dark:border-amber-700 font-medium">
                         {step.details.split(/(?=\d+\.\s)/).filter(Boolean).map((part, i) => {
                            const match = part.match(/^(\d+\.\s)(.*)/);
                            if (match) {
                               return <p key={i} className="mb-2"><strong>{match[1]}</strong>{match[2]}</p>;
                            }
                            return <p key={i} className="mb-2">{part}</p>;
                         })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {(!scaledRecipe.steps || scaledRecipe.steps.length === 0) && (
                <div className="p-10 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
                  <p className="font-bold text-lg italic">No hay pasos detallados para esta receta.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: AGUA */}
          {activeTab === 'water' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-8 md:p-10 rounded-3xl border border-blue-100 dark:border-blue-800 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 text-blue-500 pointer-events-none">
                  <Droplets size={200} />
                </div>
                <h3 className="text-3xl font-black text-blue-900 dark:text-blue-400 mb-2 flex items-center gap-3 relative z-10">
                  <Droplets size={32} className="text-blue-500" /> Perfil Mineral Objetivo
                </h3>
                <p className="text-blue-800 dark:text-blue-300 text-lg mb-8 font-medium relative z-10 max-w-2xl">
                  Ajustar el agua es el secreto para transformar una buena cerveza en una cerveza de campeonato mundial.
                </p>
                
                {scaledRecipe.waterProfile ? (
                  <div className="grid grid-cols-5 gap-3 md:gap-5 text-center relative z-10">
                    {['Ca', 'Mg', 'SO4', 'Cl', 'HCO3'].map(ion => (
                      <div key={ion} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-blue-100 dark:border-slate-700 flex flex-col transition-transform hover:-translate-y-1">
                        <span className="block font-black text-slate-400 text-xs md:text-sm uppercase tracking-widest mb-2">{ion}</span>
                        <span className="text-blue-600 dark:text-blue-400 font-black text-3xl md:text-4xl">{scaledRecipe.waterProfile[ion] ?? '-'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl text-center text-slate-500 font-bold border border-blue-100 dark:border-slate-700 relative z-10 text-lg">
                    No hay un perfil estricto para esta receta.
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm">
                 <h4 className="font-black text-slate-800 dark:text-white mb-8 text-2xl flex items-center gap-3">Tu Agua de la Llave (Base)</h4>
                 <div className="grid grid-cols-5 gap-3 md:gap-6">
                    {['Ca', 'Mg', 'SO4', 'Cl', 'HCO3'].map(ion => (
                      <div key={ion}>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">{ion}</label>
                        <input 
                          type="number" 
                          value={baseWater[ion] || 0} 
                          onChange={(e) => setBaseWater({...baseWater, [ion]: Number(e.target.value) || 0})}
                          className="w-full p-4 md:p-5 border border-gray-200 dark:border-slate-700 rounded-2xl text-center font-black text-xl md:text-2xl focus:ring-4 focus:ring-blue-500/30 outline-none bg-gray-50 dark:bg-slate-800 text-slate-800 dark:text-white transition-all shadow-inner"
                        />
                      </div>
                    ))}
                 </div>
              </div>

              {saltAdditions && scaledRecipe.waterProfile && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 p-8 md:p-12 rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-xl relative overflow-hidden">
                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                     <h4 className="font-black text-amber-900 dark:text-amber-500 text-3xl md:text-4xl flex items-center gap-3">
                       <Scale size={40} className="text-amber-600" /> Adición de Sales
                     </h4>
                     <span className="bg-amber-600 text-white px-6 py-3 rounded-2xl text-lg font-black shadow-md">
                       Para {saltAdditions.totalWater} L (Total)
                     </span>
                   </div>
                   
                   <p className="text-xl text-amber-800 dark:text-slate-300 font-medium mb-10">
                     Mezcla estas cantidades exactas en el agua <span className="font-black underline">antes</span> de agregar la malta.
                   </p>

                   <div className="grid md:grid-cols-4 gap-5 mb-10">
                     <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-amber-100 dark:border-slate-700 text-center shadow-md relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-2 bg-blue-400"></div>
                       <span className="block font-black text-slate-800 dark:text-white text-5xl mb-3">{saltAdditions.cacl2}g</span>
                       <span className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider block">Cloruro de Calcio</span>
                     </div>
                     <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-amber-100 dark:border-slate-700 text-center shadow-md relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-2 bg-amber-400"></div>
                       <span className="block font-black text-slate-800 dark:text-white text-5xl mb-3">{saltAdditions.gypsum}g</span>
                       <span className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider block">Gypsum (CaSO4)</span>
                     </div>
                     <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-amber-100 dark:border-slate-700 text-center shadow-md relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-2 bg-green-400"></div>
                       <span className="block font-black text-slate-800 dark:text-white text-5xl mb-3">{saltAdditions.epsom}g</span>
                       <span className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider block">Sal de Epsom</span>
                     </div>
                     {Number(saltAdditions.bakingSoda) > 0 && (
                       <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-amber-100 dark:border-slate-700 text-center shadow-md relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-full h-2 bg-purple-400"></div>
                         <span className="block font-black text-slate-800 dark:text-white text-5xl mb-3">{saltAdditions.bakingSoda}g</span>
                         <span className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider block">Bicarbonato Sodio</span>
                       </div>
                     )}
                   </div>

                   <div className="bg-white dark:bg-slate-950 p-8 rounded-3xl border border-amber-200 dark:border-slate-700 shadow-inner">
                     <h5 className="font-black text-sm text-slate-400 uppercase tracking-widest mb-6 text-center">Perfil Final Estimado</h5>
                     <div className="flex justify-around text-2xl font-black flex-wrap gap-6">
                       <span className="text-slate-500 text-sm flex flex-col items-center">Ca <span className={(saltAdditions.finalEstimates.Ca >= (Number(scaledRecipe.waterProfile.Ca) || 0)) ? 'text-green-500 text-3xl' : 'text-amber-500 text-3xl'}>{saltAdditions.finalEstimates.Ca}</span></span>
                       <span className="text-slate-500 text-sm flex flex-col items-center">Mg <span className="text-green-500 text-3xl">{saltAdditions.finalEstimates.Mg}</span></span>
                       <span className="text-slate-500 text-sm flex flex-col items-center">SO4 <span className="text-green-500 text-3xl">{saltAdditions.finalEstimates.SO4}</span></span>
                       <span className="text-slate-500 text-sm flex flex-col items-center">Cl <span className="text-green-500 text-3xl">{saltAdditions.finalEstimates.Cl}</span></span>
                       <span className="text-slate-500 text-sm flex flex-col items-center" title="Ajustado con Bicarbonato de Sodio">HCO3 <span className={(saltAdditions.finalEstimates.HCO3 >= (Number(scaledRecipe.waterProfile.HCO3) || 0)) ? 'text-green-500 text-3xl' : 'text-amber-500 text-3xl'}>{saltAdditions.finalEstimates.HCO3}</span></span>
                     </div>
                   </div>
                   <p className="text-sm text-slate-500 dark:text-slate-400 mt-6 text-center italic font-medium">
                     * El perfil estimado puede diferir levemente del objetivo porque las sales aportan iones en pares (ej. el Cloruro de Calcio suma Cl y Ca simultáneamente).
                   </p>
                </div>
              )}
            </div>
          )}

          {/* TAB: TIPS */}
          {activeTab === 'tips' && (
            <div className="space-y-6 animate-fadeIn">
              {Array.isArray(scaledRecipe.tips) && scaledRecipe.tips.map((tip, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-800 border-l-8 border-amber-500 shadow-md p-8 rounded-r-3xl transition-transform hover:-translate-y-1">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-4 flex items-center gap-3">
                    <Star className="text-amber-500 fill-amber-500"/> {tip.title || 'Tip Cervecero'}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed font-medium">
                    {tip.desc || ''}
                  </p>
                </div>
              ))}
              {(!scaledRecipe.tips || scaledRecipe.tips.length === 0) && (
                <p className="text-gray-500 font-bold text-lg italic text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-3xl">No hay tips específicos para esta receta, ¡aplica las buenas prácticas de siempre!</p>
              )}
            </div>
          )}

          {/* TAB: HISTORIAL CAMBIOS */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-8 border-b border-gray-200 dark:border-slate-700 pb-4">Historial de Modificaciones</h3>
              <div className="border-l-4 border-slate-300 dark:border-slate-600 ml-6 pl-8 space-y-10">
                {Array.isArray(scaledRecipe.modifications) && [...scaledRecipe.modifications].reverse().map((mod, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[45px] top-1 bg-white dark:bg-slate-900 border-4 border-slate-300 dark:border-slate-600 w-6 h-6 rounded-full shadow-sm"></div>
                    <span className="text-sm font-black text-slate-400 tracking-widest uppercase block mb-2">{mod.date}</span>
                    <p className="text-slate-700 dark:text-slate-300 font-medium text-lg bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">"{mod.note}"</p>
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
    const stepsArray = Array.isArray(recipe.steps) && recipe.steps.length > 0 ? recipe.steps : [{ title: "Cocción Genérica", desc: "Sigue tu instinto cervecero.", duration: 60 }];
    
    // Protection against out-of-bounds index
    const safeStepIdx = Math.min(brewState.stepIdx, stepsArray.length - 1);
    const step = stepsArray[safeStepIdx];
    const isLastStep = safeStepIdx === stepsArray.length - 1;

    const handleNextStep = () => {
      if (isLastStep) {
        try {
          const totalCost = calculateCostForRecipe(recipe, recipe.targetVolume);

          let currentInventory = JSON.parse(JSON.stringify(inventory));
          (recipe.ingredients?.malts || []).forEach(m => {
              const mName = (m.name || '').toLowerCase();
              const item = currentInventory.find(i => {
                  const iName = (i.name || '').toLowerCase();
                  return i.category === 'Malta' && iName && (iName === mName || mName.includes(iName));
              });
              if (item) item.stock = Math.max(0, Number(item.stock) - (Number(m.amount) || 0));
          });
          (recipe.ingredients?.hops || []).forEach(h => {
              const hName = (h.name || '').toLowerCase();
              const item = currentInventory.find(i => {
                  const iName = (i.name || '').toLowerCase();
                  return i.category === 'Lúpulo' && iName && hName.includes(iName);
              });
              if (item) item.stock = Math.max(0, Number(item.stock) - (Number(h.amount) || 0));
          });
          const yeastObj = recipe.ingredients?.yeast;
          if (yeastObj) {
              const yeastName = typeof yeastObj === 'string' ? yeastObj : (yeastObj.name || '');
              const yeastAmount = typeof yeastObj === 'string' ? 1 : (Number(yeastObj.amount) || 1);
              const yName = (yeastName || '').toLowerCase();
              const yItem = currentInventory.find(i => {
                  const iName = (i.name || '').toLowerCase();
                  return i.category === 'Levadura' && iName && yName.includes(iName);
              });
              if (yItem) yItem.stock = Math.max(0, Number(yItem.stock) - yeastAmount);
          }

          const newHistoryItem = {
            id: 'hist-' + Date.now(),
            recipeName: recipe.name || 'Sin Nombre',
            date: new Date().toLocaleDateString(),
            timestamp: Date.now(),
            volume: recipe.targetVolume || targetVol || 0,
            og: recipe.og || '-',
            fg: recipe.fg || '-',
            abv: recipe.abv || '-',
            category: recipe.category || 'Otros',
            totalCost: totalCost || 0,
            notes: "Producción completada. Insumos descontados."
          };
          
          const newHistory = [newHistoryItem, ...history];
          
          setHistory(newHistory);
          setInventory(currentInventory);
          updateCloudData({ history: newHistory, inventory: currentInventory });
          setView('history');
        } catch (error) {
          console.error("Error al finalizar cocción:", error);
          alert("Hubo un pequeño problema descontando el inventario, pero el lote fue guardado.");
          setView('history');
        }
      } else {
        const nextStep = stepsArray[safeStepIdx + 1];
        setBrewState({
          ...brewState,
          stepIdx: safeStepIdx + 1,
          timeLeft: nextStep.duration ? Number(nextStep.duration) * 60 : 0,
          isRunning: false
        });
      }
    };

    return (
      <div className="bg-slate-900 p-6 md:p-12 rounded-3xl shadow-2xl border border-slate-700 animate-fadeIn min-h-[75vh] flex flex-col text-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex justify-between items-center border-b border-slate-700/50 pb-6 mb-8 relative z-10">
          <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3 text-amber-500">
            <Beaker size={32} /> Cocinando: <span className="text-white drop-shadow-sm">{recipe.name || 'Lote'}</span>
          </h2>
          <span className="bg-slate-800 text-slate-300 px-4 py-2 rounded-full font-black text-sm tracking-wider uppercase border border-slate-700 shadow-inner">
            Paso {safeStepIdx + 1} de {stepsArray.length}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 relative z-10">
          <h3 className="text-4xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-md">{step?.title || 'Proceso'}</h3>
          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl font-medium leading-relaxed">{step?.desc || ''}</p>
          
          {step?.details && typeof step.details === 'string' && (
             <div className="bg-slate-800/80 backdrop-blur-md p-6 md:p-8 rounded-2xl text-left max-w-3xl border border-slate-600/50 text-lg text-slate-200 w-full shadow-2xl">
               <span className="font-black flex items-center gap-2 mb-3 text-amber-400 uppercase tracking-wider text-sm"><Info size={20}/> Detalle Técnico</span>
               <div className="leading-relaxed">
                  {step.details.split(/(?=\d+\.\s)/).filter(Boolean).map((part, i) => {
                     const match = part.match(/^(\d+\.\s)(.*)/);
                     if (match) {
                        return <p key={i} className="mb-2"><strong>{match[1]}</strong>{match[2]}</p>;
                     }
                     return <p key={i} className="mb-2">{part}</p>;
                  })}
               </div>
             </div>
          )}

          {step?.duration !== undefined ? (
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
            onClick={() => setView('dashboard')}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 font-bold bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors shadow-sm w-full md:w-auto justify-center"
          >
            <ArrowLeft size={20} /> Volver al Panel
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
            {[...history].sort((a,b) => (b.timestamp||0) - (a.timestamp||0)).map((h) => (
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
                      <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3">{h.recipeName || 'Lote Sin Nombre'}</h3>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1.5"><CalendarClock size={16}/> {h.date}</span>
                        <span className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5"><Droplets size={16}/> {h.volume || 0} L</span>
                        <span className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-lg text-sm font-black flex items-center gap-1.5">💰 Total: {formatCurrency(h.totalCost)}</span>
                        <span className="bg-emerald-100 dark:bg-emerald-800/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 px-3 py-1.5 rounded-lg text-sm font-black flex items-center gap-1.5 text-xs uppercase tracking-wider">🏷️ x Litro: {formatCurrency((Number(h.totalCost) || 0) / (Number(h.volume) || 1))}</span>
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
                                <Star key={star} size={18} className={(Number(h.tasting.rating) || 0) >= star ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-slate-600"} />
                              ))}
                            </div>
                         </div>
                         <p className="text-slate-700 dark:text-slate-300 text-sm font-medium italic leading-relaxed">"{h.tasting.notes || ''}"</p>
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
          
          {/* HEADER GLOBAL REDISEÑADO */}
          <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden border border-slate-700 gap-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse pointer-events-none" style={{animationDelay: '2s'}}></div>
            
            {/* Título Izquierda */}
            <div className="relative z-10 flex items-center gap-4 text-left w-full md:w-auto">
              <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-4 rounded-2xl shadow-lg shrink-0">
                <Beaker size={36} className="text-slate-900" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white mb-1">BrewMaster</h1>
                <p className="text-slate-400 text-xs md:text-sm font-medium">Sistema operativo cervecero.</p>
              </div>
            </div>

            {/* Controles Derecha */}
            <div className="relative z-10 flex flex-col items-start md:items-end gap-4 w-full md:w-auto shrink-0">
              <div className="flex flex-wrap items-center gap-2">
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

              {view !== 'dashboard' && (
                <button onClick={() => setView('dashboard')} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl font-bold transition-all border border-white/10 backdrop-blur-md flex items-center gap-2 hover:scale-105 shadow-sm w-full md:w-auto justify-center">
                  <LayoutDashboard size={18}/> Dashboard
                </button>
              )}
            </div>
          </div>

          {/* Menú Principal Global */}
          {view !== 'auth' && (
            <div className="flex bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-x-auto mb-8">
               <button onClick={() => setView('dashboard')} className={`flex-1 min-w-[120px] py-4 font-black flex items-center justify-center gap-2 transition-colors ${view === 'dashboard' ? 'text-blue-500 border-b-4 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                 <TrendingUp size={18}/> Métricas
               </button>
               <button onClick={() => setView('list')} className={`flex-1 min-w-[120px] py-4 font-black flex items-center justify-center gap-2 transition-colors ${view === 'list' ? 'text-amber-500 border-b-4 border-amber-500 bg-amber-50/50 dark:bg-amber-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                 <BookOpen size={18}/> Mis Recetas
               </button>
               <button onClick={() => setView('inventory')} className={`flex-1 min-w-[120px] py-4 font-black flex items-center justify-center gap-2 transition-colors ${view === 'inventory' ? 'text-emerald-500 border-b-4 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                 <Package size={18}/> Inventario
               </button>
               <button onClick={() => setView('history')} className={`flex-1 min-w-[120px] py-4 font-black flex items-center justify-center gap-2 transition-colors ${view === 'history' ? 'text-purple-500 border-b-4 border-purple-500 bg-purple-50/50 dark:bg-purple-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                 <History size={18}/> Historial
               </button>
            </div>
          )}

          {/* CONTENEDOR DE VISTAS */}
          <main className="transition-all duration-300 ease-in-out">
            {view === 'auth' && renderAuth()}
            {view === 'dashboard' && renderDashboard()}
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

// --- ESCUDO ANTI-FALLOS (ERROR BOUNDARY) ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("Detectado por ErrorBoundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050608] text-white p-6 md:p-10 flex flex-col items-center justify-center font-sans">
          <div className="bg-red-500/10 border border-red-500 p-8 md:p-12 rounded-3xl max-w-3xl w-full shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-black text-red-500 mb-4 tracking-tighter">¡Escudo Activado!</h2>
            <p className="text-slate-300 text-lg mb-6 leading-relaxed">
              La aplicación bloqueó un fallo crítico proveniente de tu base de datos.<br/><br/>
              <strong>Por favor, toma una captura del texto rojo de abajo y envíamela:</strong>
            </p>
            <div className="bg-black/80 p-6 rounded-2xl overflow-auto text-xs font-mono text-red-400 border border-red-900/50 shadow-inner max-h-64">
              {this.state.error && this.state.error.toString()}
              <br/><br/>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Envolvemos toda la aplicación en el escudo
export default function SafeApp() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}