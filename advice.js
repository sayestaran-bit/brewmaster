import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Beaker, Thermometer, Droplets, Clock, Info, CheckCircle2, 
  ChevronRight, BookOpen, Plus, ArrowLeft, Beer, Save, 
  Trash2, ChevronDown, ChevronUp, Play, Pause, SkipForward, 
  History, CalendarClock, Scale, Package, Star, MessageSquare, 
  Banknote, Wheat, Leaf, Cloud, RefreshCw, Moon, Sun, User, 
  LogOut, Edit3, FileClock, Eye, EyeOff, Activity, Palette, ListOrdered,
  Sparkles, Loader2, BrainCircuit, Wand2, TrendingUp, BarChart3, PieChart,
  LayoutDashboard, Filter, AlertTriangle, Hourglass, CalendarPlus
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