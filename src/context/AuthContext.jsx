// /src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    signInAnonymously
} from 'firebase/auth';
import { auth } from '../services/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoadingAuth(false);
        });
        return unsubscribe;
    }, []);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const signup = (email, password) => {
        return createUserWithEmailAndPassword(auth, email, password);
    };

    const logout = () => {
        return signOut(auth);
    };

    const loginWithGoogle = () => {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider);
    };

    const loginAsGuest = () => {
        return signInAnonymously(auth);
    };

    const resetPassword = (email) => {
        return sendPasswordResetEmail(auth, email);
    };

    const value = {
        currentUser,
        loadingAuth,
        login,
        signup,
        logout,
        loginWithGoogle,
        loginAsGuest,
        resetPassword
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
