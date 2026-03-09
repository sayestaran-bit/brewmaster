// /src/context/AuthContext.jsx
// Contexto de autenticación de Firebase.
// Incluye manejo de errores estricto en todas las operaciones de auth,
// estado de error para UI, y helper para obtener el ID Token actualizado.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    signInAnonymously,
    getAdditionalUserInfo,
    getIdToken as firebaseGetIdToken,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { seedGuestData } from '../services/firestore/seedGuestData';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [authError, setAuthError] = useState(null); // Estado de error para la UI

    // Observador del estado de autenticación
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setAuthError(null); // Limpiar errores cuando cambia el estado de auth
            setLoadingAuth(false);
        }, (error) => {
            console.error('❌ AuthContext: Error en onAuthStateChanged:', error.message);
            setAuthError(error.message);
            setLoadingAuth(false);
        });
        return unsubscribe;
    }, []);

    /**
     * Limpia el error de autenticación actual.
     */
    const clearAuthError = useCallback(() => setAuthError(null), []);

    /**
     * Obtiene un ID Token fresco del usuario actual.
     * Útil para autenticar llamadas a APIs externas o Cloud Functions.
     * @param {boolean} [forceRefresh=false] - Forzar renovación del token
     * @returns {Promise<string|null>}
     */
    const getToken = useCallback(async (forceRefresh = false) => {
        if (!currentUser) return null;
        try {
            return await firebaseGetIdToken(currentUser, forceRefresh);
        } catch (err) {
            console.error('❌ AuthContext.getToken Error:', err.message);
            return null;
        }
    }, [currentUser]);

    /**
     * Inicia sesión con email y contraseña.
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    const login = useCallback(async (email, password) => {
        setAuthError(null);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (err) {
            const msg = mapAuthError(err.code);
            setAuthError(msg);
            return { success: false, error: msg };
        }
    }, []);

    /**
     * Registra un nuevo usuario con email y contraseña.
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    const signup = useCallback(async (email, password) => {
        setAuthError(null);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (err) {
            const msg = mapAuthError(err.code);
            setAuthError(msg);
            return { success: false, error: msg };
        }
    }, []);

    /**
     * Cierra la sesión del usuario actual.
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    const logout = useCallback(async () => {
        try {
            await signOut(auth);
            return { success: true };
        } catch (err) {
            console.error('❌ AuthContext.logout Error:', err.message);
            return { success: false, error: err.message };
        }
    }, []);

    /**
     * Inicia sesión con Google mediante popup.
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    const loginWithGoogle = useCallback(async () => {
        setAuthError(null);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            return { success: true };
        } catch (err) {
            // El usuario cerró el popup — no es un error crítico
            if (err.code === 'auth/popup-closed-by-user') {
                return { success: false, error: null };
            }
            const msg = mapAuthError(err.code);
            setAuthError(msg);
            return { success: false, error: msg };
        }
    }, []);

    /**
     * Inicia sesión como invitado (anónimo).
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    const loginAsGuest = useCallback(async () => {
        setAuthError(null);
        try {
            const credential = await signInAnonymously(auth);
            // El check de si ya existe data se movió adentro de seedGuestData para mayor robustez
            await seedGuestData(credential.user.uid);
            return { success: true };
        } catch (err) {
            const msg = mapAuthError(err.code);
            setAuthError(msg);
            return { success: false, error: msg };
        }
    }, []);

    /**
     * Envía un email de recuperación de contraseña.
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    const resetPassword = useCallback(async (email) => {
        setAuthError(null);
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true };
        } catch (err) {
            const msg = mapAuthError(err.code);
            setAuthError(msg);
            return { success: false, error: msg };
        }
    }, []);

    const value = {
        currentUser,
        loadingAuth,
        authError,
        clearAuthError,
        getToken,
        login,
        signup,
        logout,
        loginWithGoogle,
        loginAsGuest,
        resetPassword,
    };

    return (
        <AuthContext.Provider value={value}>
            {loadingAuth ? (
                <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-bold">
                    Cargando Firebase Auth... (Si esto no desaparece, hay un problema con las variables de entorno)
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};

// ===================================================================
// HELPER: Traduce códigos de error de Firebase Auth a mensajes legibles
// ===================================================================
function mapAuthError(code) {
    const errorMessages = {
        'auth/invalid-email': 'El formato del email es inválido.',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
        'auth/user-not-found': 'No existe una cuenta con ese email.',
        'auth/wrong-password': 'Contraseña incorrecta. Intenta nuevamente.',
        'auth/invalid-credential': 'Credenciales inválidas. Verifica tu email y contraseña.',
        'auth/email-already-in-use': 'Ya existe una cuenta registrada con ese email.',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
        'auth/too-many-requests': 'Demasiados intentos fallidos. Espera unos minutos.',
        'auth/network-request-failed': 'Error de red. Verifica tu conexión a internet.',
        'auth/popup-blocked': 'El popup fue bloqueado por el navegador. Habilita las ventanas emergentes.',
        'auth/operation-not-allowed': 'Este método de acceso no está habilitado.',
    };
    return errorMessages[code] || `Error de autenticación (${code}). Intenta nuevamente.`;
}
