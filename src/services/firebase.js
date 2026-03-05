// /src/services/firebase.js
// Inicialización y configuración de Firebase.
// Exporta: auth, db, collectionPrefix, getIdToken

import { initializeApp } from 'firebase/app';
import { getAuth, getIdToken as firebaseGetIdToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- VALIDACIÓN DE CONFIGURACIÓN ---
// Verificamos que las variables de entorno críticas existan al inicio.
const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
];

const missingVars = requiredEnvVars.filter((key) => !import.meta.env[key]);

if (missingVars.length > 0) {
    console.error(
        `❌ Firebase Config Error: Faltan las siguientes variables de entorno:\n` +
        missingVars.map((v) => `   - ${v}`).join('\n') +
        `\n\nConfigúralas en tu archivo .env o en el panel de Vercel.`
    );
}

// --- CONFIGURACIÓN FIREBASE ---
// Obtenemos la configuración desde las variables de entorno de Vite
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// --- INICIALIZACIÓN ---
const app = initializeApp(firebaseConfig);

// --- EXPORTACIONES ---
export const auth = getAuth(app);
export const db = getFirestore(app);

// Sanitizamos el appId para usarlo como colección base
export const collectionPrefix = firebaseConfig.appId
    ? firebaseConfig.appId.replace(/[^a-zA-Z0-9_-]/g, '_')
    : 'default_collection';

/**
 * Obtiene un ID Token actualizado del usuario actualmente autenticado.
 * Útil para llamadas a APIs backend que requieran autenticación Bearer.
 *
 * @param {boolean} [forceRefresh=false] - Si true, fuerza la renovación del token
 * @returns {Promise<string|null>} - El ID Token o null si no hay usuario
 */
export async function getIdToken(forceRefresh = false) {
    const user = auth.currentUser;
    if (!user) {
        console.warn('⚠️ getIdToken: No hay usuario autenticado.');
        return null;
    }

    try {
        const token = await firebaseGetIdToken(user, forceRefresh);
        return token;
    } catch (err) {
        console.error('❌ Error al obtener ID Token:', err.message);
        return null;
    }
}
